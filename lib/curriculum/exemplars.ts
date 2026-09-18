import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import {
  contentStandards,
  curriculumDocuments,
  curriculumFrameworks,
  curriculumGuidance,
  curriculumReleases,
  grades,
  indicatorExemplars,
  indicators,
  strands,
  subStrands,
  subjects,
} from "@/db/schema";
import { db } from "@/lib/db";
import { DEFAULT_CURRICULUM_SLUG, resolveSubjectSlug } from "./catalog";
import { resolveGradeCode } from "./grades";
import { cleanCurriculumText } from "./text";
import type {
  BloomsLevel,
  CurriculumGuidance,
  CurriculumProvenance,
  ExtractionConfidence,
  IndicatorExemplar,
  ReviewStatus,
} from "@/types/curriculum";

export interface IndicatorGrounding {
  indicatorCode: string;
  indicatorText: string;
  bloomsLevel: BloomsLevel | null;
  revision: string;
  contentStandardCode?: string;
  contentStandardText?: string;
  guidance: CurriculumGuidance[];
  exemplars: IndicatorExemplar[];
  provenance: CurriculumProvenance & {
    document?: {
      title: string;
      organization: string;
      sourceUrl: string;
      sha256: string;
    } | null;
  };
}

interface GroundingLookup {
  indicatorCode: string;
  subject: string;
  grade: string;
  strand?: string;
  subStrand?: string;
  curriculumSlug?: string;
  revision?: string;
}

export async function getIndicatorGrounding({
  indicatorCode,
  subject,
  grade,
  strand,
  subStrand,
  curriculumSlug = DEFAULT_CURRICULUM_SLUG,
  revision,
}: GroundingLookup): Promise<IndicatorGrounding | null> {
  try {
    const canonicalGrade = await resolveGradeCode(grade);
    const [framework] = await db
      .select()
      .from(curriculumFrameworks)
      .where(eq(curriculumFrameworks.slug, curriculumSlug));
    if (!framework) return null;

    // Multiple subjects can each have their own approved release, so we must not
    // pre-select a single "most recent" release for the whole framework - that
    // would only resolve whichever subject's release happened to be approved
    // last. Instead, join each indicator to its own release and filter per-row.
    const loadIndicator = (matchRevision: string | null) => db
      .select({
        id: indicators.id,
        code: indicators.code,
        text: indicators.text,
        bloomsLevel: indicators.bloomsLevel,
        documentId: indicators.documentId,
        pdfPage: indicators.pdfPage,
        printedPage: indicators.printedPage,
        sourceReference: indicators.sourceReference,
        extractionConfidence: indicators.extractionConfidence,
        reviewStatus: indicators.reviewStatus,
        ambiguityFlag: indicators.ambiguityFlag,
        rawSourceText: indicators.rawSourceText,
        contentStandardId: contentStandards.id,
        contentStandardCode: contentStandards.code,
        contentStandardText: contentStandards.text,
        documentTitle: curriculumDocuments.title,
        documentOrganization: curriculumDocuments.organization,
        documentSourceUrl: curriculumDocuments.sourceUrl,
        documentSha256: curriculumDocuments.sha256,
        releaseId: indicators.releaseId,
        releaseVersion: curriculumReleases.version,
        releaseStatus: curriculumReleases.status,
      })
      .from(indicators)
      .innerJoin(subStrands, eq(indicators.subStrandId, subStrands.id))
      .innerJoin(strands, eq(subStrands.strandId, strands.id))
      .innerJoin(subjects, eq(strands.subjectId, subjects.id))
      .innerJoin(grades, eq(indicators.gradeId, grades.id))
      .leftJoin(contentStandards, eq(indicators.contentStandardId, contentStandards.id))
      .leftJoin(curriculumDocuments, eq(indicators.documentId, curriculumDocuments.id))
      .leftJoin(curriculumReleases, eq(indicators.releaseId, curriculumReleases.id))
      .where(and(
        eq(subjects.curriculumId, framework.id),
        or(eq(subjects.name, subject), eq(subjects.slug, resolveSubjectSlug(subject))),
        eq(grades.code, canonicalGrade ?? grade),
        eq(indicators.code, indicatorCode),
        strand ? eq(strands.name, strand) : undefined,
        subStrand ? eq(subStrands.name, subStrand) : undefined,
        matchRevision
          ? eq(curriculumReleases.version, matchRevision)
          : or(isNull(indicators.releaseId), eq(curriculumReleases.status, "approved"))
      ))
      // A seed placeholder can share its code with the official row that
      // replaced it; the release-backed row is the one to ground on.
      .orderBy(sql`${indicators.releaseId} is null`)
      .limit(1);
    let [row] = await loadIndicator(revision ?? null);
    if (!row && !revision) {
      [row] = await loadIndicator(null);
    }
    if (!row) return null;
    const resolvedRevisionForRow = row.releaseVersion ?? framework.version;

    const [exemplarRows, guidanceRows] = await Promise.all([
      db
        .select({
          code: indicatorExemplars.code,
          label: indicatorExemplars.label,
          text: indicatorExemplars.text,
          sortOrder: indicatorExemplars.sortOrder,
          revision: indicatorExemplars.revision,
          documentId: indicatorExemplars.documentId,
          pdfPage: indicatorExemplars.pdfPage,
          printedPage: indicatorExemplars.printedPage,
          sourceReference: indicatorExemplars.sourceReference,
          extractionConfidence: indicatorExemplars.extractionConfidence,
          reviewStatus: indicatorExemplars.reviewStatus,
          ambiguityFlag: indicatorExemplars.ambiguityFlag,
          rawSourceText: indicatorExemplars.rawSourceText,
        })
        .from(indicatorExemplars)
        .where(and(
          eq(indicatorExemplars.indicatorId, row.id),
          eq(indicatorExemplars.revision, resolvedRevisionForRow)
        ))
        .orderBy(asc(indicatorExemplars.sortOrder)),
      db
        .select({
          kind: curriculumGuidance.kind,
          text: curriculumGuidance.text,
          sortOrder: curriculumGuidance.sortOrder,
          documentId: curriculumGuidance.documentId,
          pdfPage: curriculumGuidance.pdfPage,
          printedPage: curriculumGuidance.printedPage,
          sourceReference: curriculumGuidance.sourceReference,
          extractionConfidence: curriculumGuidance.extractionConfidence,
          reviewStatus: curriculumGuidance.reviewStatus,
          ambiguityFlag: curriculumGuidance.ambiguityFlag,
          rawSourceText: curriculumGuidance.rawSourceText,
        })
        .from(curriculumGuidance)
        .where(or(
          eq(curriculumGuidance.indicatorId, row.id),
          row.contentStandardId
            ? eq(curriculumGuidance.contentStandardId, row.contentStandardId)
            : undefined
        ))
        .orderBy(asc(curriculumGuidance.sortOrder)),
    ]);

    // Cleaned here as well as on the display path: these strings are pasted
    // straight into the generation prompt, where a Symbol-font bullet glyph is
    // pure noise the model has to read past.
    return {
      indicatorCode: row.code,
      indicatorText: cleanCurriculumText(row.text),
      bloomsLevel: row.bloomsLevel as BloomsLevel | null,
      revision: resolvedRevisionForRow,
      contentStandardCode: row.contentStandardCode ?? undefined,
      contentStandardText: cleanCurriculumText(row.contentStandardText),
      guidance: guidanceRows.map((item) => ({
        ...item,
        text: cleanCurriculumText(item.text),
        extractionConfidence: item.extractionConfidence as ExtractionConfidence | null,
        reviewStatus: item.reviewStatus as ReviewStatus,
      })),
      exemplars: exemplarRows.map((item) => ({
        ...item,
        text: cleanCurriculumText(item.text),
        extractionConfidence: item.extractionConfidence as ExtractionConfidence | null,
        reviewStatus: item.reviewStatus as ReviewStatus,
      })),
      provenance: {
        documentId: row.documentId,
        pdfPage: row.pdfPage,
        printedPage: row.printedPage,
        sourceReference: row.sourceReference,
        extractionConfidence: row.extractionConfidence as CurriculumProvenance["extractionConfidence"],
        reviewStatus: row.reviewStatus as CurriculumProvenance["reviewStatus"],
        ambiguityFlag: row.ambiguityFlag,
        rawSourceText: row.rawSourceText,
        document: row.documentTitle ? {
          title: row.documentTitle,
          organization: row.documentOrganization!,
          sourceUrl: row.documentSourceUrl!,
          sha256: row.documentSha256!,
        } : null,
      },
    };
  } catch (error) {
    console.warn("Indicator grounding lookup unavailable:", error);
    return null;
  }
}

export async function getIndicatorExemplars({
  indicatorCode,
  subject,
  grade,
  strand,
  subStrand,
  curriculumSlug = DEFAULT_CURRICULUM_SLUG,
  revision,
}: {
  indicatorCode: string;
  subject: string;
  grade: string;
  strand?: string;
  subStrand?: string;
  curriculumSlug?: string;
  revision?: string;
}): Promise<IndicatorExemplar[]> {
  const grounding = await getIndicatorGrounding({
    indicatorCode,
    subject,
    grade,
    strand,
    subStrand,
    curriculumSlug,
    revision,
  });
  return grounding?.exemplars ?? [];
}