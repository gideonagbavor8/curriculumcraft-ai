import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schemeUploads, schemeSubjects, schemeWeeks, schemeWeekIndicators, subjects } from "@/db/schema";
import { parseDocxScheme } from "./parseDocx";
import { parsePdfScheme } from "./parsePdf";
import { parseImageScheme } from "./parseImage";
import { matchIndicatorsAgainstCurriculum, type MatchConfidence } from "./matchIndicators";
import type { ParsedSchemeSection, ParseResult } from "./types";
import { normalizeSchemeRows, type NormalizedSchemeWeek } from "./normalizeRows";
import { groupSectionsBySubject, cleanSubjectLabel, weeksWithStrandHint, type SubjectGroup } from "./groupSubjects";

export type UploadKind = "full_school" | "single_subject" | "single_week";

export interface ImportSchemeInput {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  gradeCode: string;
  termLabel?: string;
  uploadKind: UploadKind;
  // Required for "single_subject"/"single_week" (the teacher already knows
  // and names the subject); ignored for "full_school", where each subject is
  // auto-detected per section instead.
  subjectSlug?: string;
}

export interface ImportSchemeSubjectSummary {
  schemeSubjectId: string;
  subjectSlug: string | null;
  subjectLabel: string;
  weeksExtracted: number;
  teachingWeeksExtracted: number;
  nonTeachingWeeksExtracted: number;
  indicatorsExtracted: number;
  matchCounts: Record<MatchConfidence, number>;
}

export interface ImportSchemeSummary {
  schemeUploadId: string;
  uploadKind: UploadKind;
  parseStatus: "parsed" | "needs_review" | "failed";
  subjects: ImportSchemeSubjectSummary[];
  warnings: string[];
}

const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const PDF_MIME_TYPES = new Set(["application/pdf"]);
// Covers standard photo/screenshot formats a teacher's phone or camera app
// would produce - HEIC/HEIF (iPhone default) included since vision models
// generally accept it, but if a given deployment rejects it the resulting
// error surfaces to the teacher rather than being silently swallowed.
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"]);
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif"];

function emptyMatchCounts(): Record<MatchConfidence, number> {
  return { exact: 0, fuzzy: 0, unmatched: 0 };
}

/**
 * Parses an uploaded Scheme of Learning (.docx or .pdf), stores the original
 * file, and persists the normalized subjects/weeks/indicators with
 * curriculum-DB match status. The uploaded wording is always what's stored -
 * a curriculum match only adds a link (matchedIndicatorId), it never
 * rewrites indicatorCode/Text or the detected subject label.
 *
 * A single upload can contain multiple subjects ("full_school") - each
 * detected section becomes its own scheme_subjects row. "single_subject" and
 * "single_week" uploads use the teacher-provided subjectSlug for their one
 * section instead of relying on auto-detection.
 */
export async function importSchemeOfLearning(input: ImportSchemeInput): Promise<ImportSchemeSummary> {
  const lowerName = input.fileName.toLowerCase();
  const isDocx = DOCX_MIME_TYPES.has(input.mimeType) || lowerName.endsWith(".docx");
  const isPdf = PDF_MIME_TYPES.has(input.mimeType) || lowerName.endsWith(".pdf");
  const isImage = IMAGE_MIME_TYPES.has(input.mimeType) || IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  let parseResult: ParseResult | undefined;
  let parseError: string | undefined;
  try {
    if (isDocx) {
      parseResult = await parseDocxScheme(input.buffer);
    } else if (isPdf) {
      parseResult = await parsePdfScheme(input.buffer);
    } else if (isImage) {
      parseResult = await parseImageScheme(input.buffer, input.mimeType);
    } else {
      throw new Error(`Unsupported file type "${input.mimeType}" - upload a .docx, .pdf, or a photo (.jpg/.png/.webp/.heic) instead.`);
    }
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
    // Logged with full context (not just the message shown to the teacher)
    // so a real failure can be diagnosed from server logs alone.
    console.error(`[schemeImport] Failed to parse "${input.fileName}" (${input.mimeType}, ${input.buffer.length} bytes):`, err);
  }

  const [uploadRow] = await db
    .insert(schemeUploads)
    .values({
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileContentBase64: input.buffer.toString("base64"),
      gradeCode: input.gradeCode,
      termLabel: input.termLabel,
      uploadKind: input.uploadKind,
      parseStatus: parseError ? "failed" : "pending",
      parseWarnings: parseResult?.warnings ?? (parseError ? [parseError] : []),
      parseError,
    })
    .returning();

  if (parseError || !parseResult || parseResult.sections.length === 0) {
    const warnings = parseResult?.warnings ?? [parseError ?? "Unknown parse error"];
    console.warn(`[schemeImport] "${input.fileName}" produced no importable sections - marking upload ${uploadRow.id} as failed. Warnings:`, warnings);
    await db.update(schemeUploads).set({ parseStatus: "failed" }).where(eq(schemeUploads.id, uploadRow.id));
    return {
      schemeUploadId: uploadRow.id,
      uploadKind: input.uploadKind,
      parseStatus: "failed",
      subjects: [],
      warnings,
    };
  }

  // For non-"full_school" uploads, only the first detected table is used -
  // the teacher already told us the (single) subject, so any extra table
  // found (e.g. a stray small table) is ignored rather than mis-filed.
  const sectionsToImport: ParsedSchemeSection[] =
    input.uploadKind === "full_school" ? parseResult.sections : parseResult.sections.slice(0, 1);
  const extraWarnings =
    input.uploadKind !== "full_school" && parseResult.sections.length > 1
      ? [`Found ${parseResult.sections.length} tables in the document but only imported the first, since this is a ${input.uploadKind.replace("_", " ")} upload.`]
      : [];

  const knownSubjects = await db.select({ slug: subjects.slug, name: subjects.name }).from(subjects);

  const subjectSummaries: ImportSchemeSubjectSummary[] = [];
  const allWarnings = [...parseResult.warnings, ...extraWarnings];

  const subjectGroups: SubjectGroup[] =
    input.uploadKind === "full_school"
      ? groupSectionsBySubject(sectionsToImport, knownSubjects)
      : sectionsToImport.map((section) => ({
          // The teacher picked the subject on the upload form, so the
          // catalog's own name is the right label - the document's heading
          // ("BASIC 4 - MATHEMATICS - FIRST TERM") only repeats the class and
          // term already recorded on the upload.
          resolved: {
            slug: input.subjectSlug ?? null,
            label:
              knownSubjects.find((s) => s.slug === input.subjectSlug)?.name ??
              (section.subjectHint ? cleanSubjectLabel(section.subjectHint) : input.subjectSlug ?? "Subject"),
          },
          sections: [section],
        }));

  for (const [groupIndex, group] of subjectGroups.entries()) {
    const { resolved } = group;
    if (input.uploadKind === "full_school" && !resolved.slug) {
      allWarnings.push(`"${resolved.label}" wasn't auto-matched to a subject in the catalog - imported under its own heading; lesson generation still works normally.`);
    }

    const [subjectRow] = await db
      .insert(schemeSubjects)
      .values({
        schemeUploadId: uploadRow.id,
        subjectSlug: resolved.slug,
        subjectLabel: resolved.label,
        sortOrder: groupIndex,
      })
      .returning();

    // Every table of this subject's scheme, in document order, with each
    // table's strand heading applied to the weeks it introduced.
    const groupWeeks = group.sections.flatMap(weeksWithStrandHint);
    const summary = await importWeeksForSubject(groupWeeks, subjectRow.id, {
      subjectSlug: resolved.slug,
      gradeCode: input.gradeCode,
    });
    subjectSummaries.push({
      schemeSubjectId: subjectRow.id,
      subjectSlug: resolved.slug,
      subjectLabel: resolved.label,
      ...summary,
    });
  }

  const anyNeedsReview =
    subjectSummaries.some((s) => s.matchCounts.fuzzy > 0 || s.matchCounts.unmatched > 0) || allWarnings.length > 0;
  const parseStatus = anyNeedsReview ? "needs_review" : "parsed";
  await db.update(schemeUploads).set({ parseStatus, parseWarnings: allWarnings }).where(eq(schemeUploads.id, uploadRow.id));

  return {
    schemeUploadId: uploadRow.id,
    uploadKind: input.uploadKind,
    parseStatus,
    subjects: subjectSummaries,
    warnings: allWarnings,
  };
}

/**
 * Writes one subject's weeks, in document order. Week numbers repeat within a
 * subject - a scheme that runs strand by strand restarts at week 1 for each
 * strand - so rows are keyed by their position in the document (sortOrder),
 * never by week number.
 */
async function importWeeksForSubject(
  weeks: NormalizedSchemeWeek[],
  schemeSubjectId: string,
  matchOpts: { subjectSlug: string | null; gradeCode: string }
): Promise<Omit<ImportSchemeSubjectSummary, "schemeSubjectId" | "subjectSlug" | "subjectLabel">> {
  const matchCounts = emptyMatchCounts();
  let indicatorsExtracted = 0;
  let teachingWeeksExtracted = 0;
  let nonTeachingWeeksExtracted = 0;

  for (const [index, week] of weeks.entries()) {
    const [weekRow] = await db
      .insert(schemeWeeks)
      .values({
        schemeSubjectId,
        weekNumber: week.weekNumber,
        isNonTeachingWeek: week.isNonTeachingWeek,
        nonTeachingLabel: week.nonTeachingLabel,
        strandText: week.strandText,
        subStrandText: week.subStrandText,
        contentStandardCode: week.contentStandardCode,
        contentStandardText: week.contentStandardText,
        resourcesText: week.resourcesText,
        rawRowText: week.rawRowText,
        sortOrder: index,
      })
      .returning();

    if (week.isNonTeachingWeek) nonTeachingWeeksExtracted++;
    else teachingWeeksExtracted++;
    if (week.indicators.length === 0) continue;

    const matched = matchOpts.subjectSlug
      ? await matchIndicatorsAgainstCurriculum(week.indicators, {
          subjectSlug: matchOpts.subjectSlug,
          gradeCode: matchOpts.gradeCode,
        })
      : week.indicators.map((ind) => ({ ...ind, matchedIndicatorId: null, matchConfidence: "unmatched" as const }));

    await db.insert(schemeWeekIndicators).values(
      matched.map((ind, i) => {
        matchCounts[ind.matchConfidence]++;
        indicatorsExtracted++;
        return {
          schemeWeekId: weekRow.id,
          indicatorCode: ind.code,
          indicatorText: ind.text,
          matchedIndicatorId: ind.matchedIndicatorId,
          matchConfidence: ind.matchConfidence,
          sortOrder: i,
        };
      })
    );
  }

  return { weeksExtracted: weeks.length, teachingWeeksExtracted, nonTeachingWeeksExtracted, indicatorsExtracted, matchCounts };
}

export interface ManualSchemeWeekInput {
  gradeCode: string;
  termLabel?: string;
  subjectSlug: string;
  subjectLabel: string;
  weekNumber: number;
  strandText?: string;
  subStrandText?: string;
  contentStandardCode?: string;
  contentStandardText?: string;
  /** One indicator per line, e.g. "B4.1.1.1.1 Model number quantities...". */
  indicatorsText: string;
  resourcesText?: string;
}

/**
 * Records a single week entered by hand instead of parsed from a file - the
 * practical path for a photo/image upload (no OCR implemented) or any case
 * where a teacher just wants to type one week's plan directly. Produces the
 * exact same scheme_uploads/scheme_subjects/scheme_weeks/scheme_week_indicators
 * shape as a real upload, so it appears in the Scheme Library and can be
 * generated from identically. Reuses normalizeSchemeRows (a single synthetic
 * row) so indicator-line-splitting and code matching behave identically to
 * the file-parsing path.
 */
export async function importManualSchemeWeek(input: ManualSchemeWeekInput): Promise<ImportSchemeSummary> {
  const header = ["Week", "Strand", "Sub-strand", "Content Standard", "Indicators", "Resources"];
  const contentStandardCell = [input.contentStandardCode, input.contentStandardText].filter(Boolean).join(" ");
  const { weeks, warnings } = normalizeSchemeRows(header, [
    {
      cells: [
        String(input.weekNumber),
        input.strandText ?? "",
        input.subStrandText ?? "",
        contentStandardCell,
        input.indicatorsText,
        input.resourcesText ?? "",
      ],
    },
  ]);

  const [uploadRow] = await db
    .insert(schemeUploads)
    .values({
      fileName: `Week ${input.weekNumber} (manual entry)`,
      mimeType: "text/manual-entry",
      fileContentBase64: Buffer.from(JSON.stringify(input)).toString("base64"),
      gradeCode: input.gradeCode,
      termLabel: input.termLabel,
      uploadKind: "single_week",
      parseStatus: "pending",
      parseWarnings: warnings,
    })
    .returning();

  const [subjectRow] = await db
    .insert(schemeSubjects)
    .values({
      schemeUploadId: uploadRow.id,
      subjectSlug: input.subjectSlug,
      subjectLabel: input.subjectLabel,
      sortOrder: 0,
    })
    .returning();

  const summary = await importWeeksForSubject(weeks, subjectRow.id, {
    subjectSlug: input.subjectSlug,
    gradeCode: input.gradeCode,
  });

  const parseStatus = summary.matchCounts.fuzzy > 0 || summary.matchCounts.unmatched > 0 || warnings.length > 0 ? "needs_review" : "parsed";
  await db.update(schemeUploads).set({ parseStatus }).where(eq(schemeUploads.id, uploadRow.id));

  return {
    schemeUploadId: uploadRow.id,
    uploadKind: "single_week",
    parseStatus,
    subjects: [
      {
        schemeSubjectId: subjectRow.id,
        subjectSlug: input.subjectSlug,
        subjectLabel: input.subjectLabel,
        ...summary,
      },
    ],
    warnings,
  };
}

