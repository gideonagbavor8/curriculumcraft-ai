import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  curriculumFrameworks,
  educationLevels,
  grades,
  subjects,
  strands,
  subStrands,
  contentStandards,
  curriculumGuidance,
  curriculumReleases,
  indicators,
  indicatorExemplars,
} from "@/db/schema";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { DEFAULT_CURRICULUM_SLUG } from "@/lib/curriculum/catalog";
import { resolveGradeCode } from "@/lib/curriculum/grades";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectSlug = searchParams.get("subject");
    const requestedGrade = searchParams.get("grade");
    const level = searchParams.get("level");
    const grade = await resolveGradeCode(requestedGrade, level);
    const curriculumSlug =
      searchParams.get("curriculum") ?? DEFAULT_CURRICULUM_SLUG;

    // Fetch all subjects if no filter
    if (!subjectSlug) {
      const allSubjects = await db
        .select({ id: subjects.id, name: subjects.name, slug: subjects.slug })
        .from(subjects)
        .innerJoin(
          curriculumFrameworks,
          eq(subjects.curriculumId, curriculumFrameworks.id)
        )
        .where(eq(curriculumFrameworks.slug, curriculumSlug));
      return NextResponse.json({ success: true, data: allSubjects });
    }

    // Find the subject
    const [subject] = await db
      .select()
      .from(subjects)
      .innerJoin(
        curriculumFrameworks,
        eq(subjects.curriculumId, curriculumFrameworks.id)
      )
      .where(
        and(
          eq(subjects.slug, subjectSlug),
          eq(curriculumFrameworks.slug, curriculumSlug)
        )
      );

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "Subject not found" },
        { status: 404 }
      );
    }

    const requestedRevision = searchParams.get("revision");

    // Multiple subjects can each have their own approved release (e.g. one
    // release per Primary subject), so we must not pre-select a single "most
    // recent" release for the whole framework - that would only ever resolve
    // whichever subject was imported last. Instead, join each indicator to its
    // own release (if any) and filter per-row.
    const loadRows = (matchRevision: string | null) => db
      .select({
        strandId: strands.id,
        strandName: strands.name,
        subStrandId: subStrands.id,
        subStrandName: subStrands.name,
        subStrandDisplayName: subStrands.displayName,
        contentStandardId: contentStandards.id,
        contentStandardCode: contentStandards.code,
        contentStandardText: contentStandards.text,
        contentStandardDisplayText: contentStandards.displayText,
        contentStandardSortOrder: contentStandards.sortOrder,
        contentStandardDocumentId: contentStandards.documentId,
        contentStandardPdfPage: contentStandards.pdfPage,
        contentStandardPrintedPage: contentStandards.printedPage,
        contentStandardSourceReference: contentStandards.sourceReference,
        contentStandardExtractionConfidence: contentStandards.extractionConfidence,
        contentStandardReviewStatus: contentStandards.reviewStatus,
        contentStandardAmbiguityFlag: contentStandards.ambiguityFlag,
        indicatorCode: indicators.code,
        indicatorId: indicators.id,
        indicatorReleaseId: indicators.releaseId,
        indicatorText: indicators.text,
        indicatorBlooms: indicators.bloomsLevel,
        indicatorGrade: indicators.grade,
        indicatorDocumentId: indicators.documentId,
        indicatorPdfPage: indicators.pdfPage,
        indicatorPrintedPage: indicators.printedPage,
        indicatorSourceReference: indicators.sourceReference,
        indicatorExtractionConfidence: indicators.extractionConfidence,
        indicatorReviewStatus: indicators.reviewStatus,
        indicatorAmbiguityFlag: indicators.ambiguityFlag,
        levelCode: educationLevels.code,
        levelName: educationLevels.name,
        gradeName: grades.name,
        typicalAgeMin: grades.typicalAgeMin,
        typicalAgeMax: grades.typicalAgeMax,
        releaseVersion: curriculumReleases.version,
        releaseStatus: curriculumReleases.status,
      })
      .from(strands)
      .innerJoin(subStrands, eq(subStrands.strandId, strands.id))
      .innerJoin(indicators, eq(indicators.subStrandId, subStrands.id))
      .leftJoin(
        contentStandards,
        eq(indicators.contentStandardId, contentStandards.id)
      )
      .innerJoin(grades, eq(indicators.gradeId, grades.id))
      .innerJoin(educationLevels, eq(grades.educationLevelId, educationLevels.id))
      .leftJoin(curriculumReleases, eq(indicators.releaseId, curriculumReleases.id))
      .where(
        and(
          eq(strands.subjectId, subject.subjects.id),
          grade ? eq(grades.code, grade) : undefined,
          level ? eq(educationLevels.code, level) : undefined,
          matchRevision
            ? eq(curriculumReleases.version, matchRevision)
            : or(isNull(indicators.releaseId), eq(curriculumReleases.status, "approved"))
        )
      );
    let rows = await loadRows(requestedRevision);
    if (rows.length === 0 && requestedRevision) {
      // Explicit revision requests remain strict - no fallback to legacy rows.
    } else if (rows.length === 0 && !requestedRevision) {
      rows = await loadRows(null);
    }

    const usingRelease = rows.some((row) => row.indicatorReleaseId !== null);
    const revision = usingRelease
      ? rows.find((row) => row.releaseVersion)?.releaseVersion ?? requestedRevision ?? subject.curriculum_frameworks.version
      : subject.curriculum_frameworks.version;
    const exemplarRows = rows.length
      ? await db
          .select({
            indicatorId: indicatorExemplars.indicatorId,
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
          })
          .from(indicatorExemplars)
          .where(
            and(
              inArray(
                indicatorExemplars.indicatorId,
                rows.map((row) => row.indicatorId)
              ),
              eq(indicatorExemplars.revision, revision)
            )
          )
          .orderBy(
            asc(indicatorExemplars.indicatorId),
            asc(indicatorExemplars.sortOrder)
          )
      : [];
    const guidanceRows = rows.length
      ? await db
          .select({
            indicatorId: curriculumGuidance.indicatorId,
            contentStandardId: curriculumGuidance.contentStandardId,
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
          })
          .from(curriculumGuidance)
          .where(or(
            inArray(curriculumGuidance.indicatorId, rows.map((row) => row.indicatorId)),
            inArray(
              curriculumGuidance.contentStandardId,
              rows.flatMap((row) => row.contentStandardId ? [row.contentStandardId] : [])
            )
          ))
          .orderBy(asc(curriculumGuidance.sortOrder))
      : [];
    const exemplarsByIndicator = Map.groupBy(
      exemplarRows,
      (exemplar) => exemplar.indicatorId
    );

    // Group into nested structure
    const strandsMap = new Map<string, {
      name: string;
      subStrands: Map<string, {
        name: string;
        displayName: string | null;
        contentStandards: Map<string, {
          code: string;
          text: string;
          displayText: string | null;
          sortOrder: number;
          provenance: Record<string, unknown>;
          guidance: Omit<(typeof guidanceRows)[number], "indicatorId" | "contentStandardId">[];
          indicators: { code: string; text: string; bloomsLevel: string | null; grade: string; exemplars: Omit<(typeof exemplarRows)[number], "indicatorId">[] }[];
        }>;
        indicators: { code: string; text: string; bloomsLevel: string | null; grade: string; exemplars: Omit<(typeof exemplarRows)[number], "indicatorId">[] }[];
      }>;
    }>();

    for (const row of rows) {
      if (!strandsMap.has(row.strandId)) {
        strandsMap.set(row.strandId, {
          name: row.strandName,
          subStrands: new Map(),
        });
      }
      const strandEntry = strandsMap.get(row.strandId)!;

      if (!strandEntry.subStrands.has(row.subStrandId)) {
        strandEntry.subStrands.set(row.subStrandId, {
          name: row.subStrandName,
          displayName: row.subStrandDisplayName,
          contentStandards: new Map(),
          indicators: [],
        });
      }
      const subStrandEntry = strandEntry.subStrands.get(row.subStrandId)!;
      const indicator = {
        code: row.indicatorCode,
        text: row.indicatorText,
        bloomsLevel: row.indicatorBlooms,
        grade: row.indicatorGrade,
        contentStandardCode: row.contentStandardCode,
        contentStandardText: row.contentStandardText,
        provenance: {
          documentId: row.indicatorDocumentId,
          pdfPage: row.indicatorPdfPage,
          printedPage: row.indicatorPrintedPage,
          sourceReference: row.indicatorSourceReference,
          extractionConfidence: row.indicatorExtractionConfidence,
          reviewStatus: row.indicatorReviewStatus,
          ambiguityFlag: row.indicatorAmbiguityFlag,
        },
        guidance: guidanceRows
          .filter((item) => item.indicatorId === row.indicatorId)
          .map((item) => ({
            kind: item.kind,
            text: item.text,
            sortOrder: item.sortOrder,
            documentId: item.documentId,
            pdfPage: item.pdfPage,
            printedPage: item.printedPage,
            sourceReference: item.sourceReference,
            extractionConfidence: item.extractionConfidence,
            reviewStatus: item.reviewStatus,
            ambiguityFlag: item.ambiguityFlag,
          })),
        exemplars: (exemplarsByIndicator.get(row.indicatorId) ?? []).map(
          (exemplar) => ({
            code: exemplar.code,
            label: exemplar.label,
            text: exemplar.text,
            sortOrder: exemplar.sortOrder,
            revision: exemplar.revision,
            documentId: exemplar.documentId,
            pdfPage: exemplar.pdfPage,
            printedPage: exemplar.printedPage,
            sourceReference: exemplar.sourceReference,
            extractionConfidence: exemplar.extractionConfidence,
            reviewStatus: exemplar.reviewStatus,
            ambiguityFlag: exemplar.ambiguityFlag,
          })
        ),
      };
      subStrandEntry.indicators.push(indicator);

      if (row.contentStandardId && row.contentStandardCode && row.contentStandardText) {
        const standard = subStrandEntry.contentStandards.get(row.contentStandardId) ?? {
          code: row.contentStandardCode,
          text: row.contentStandardText,
          displayText: row.contentStandardDisplayText,
          sortOrder: row.contentStandardSortOrder ?? 0,
          provenance: {
            documentId: row.contentStandardDocumentId,
            pdfPage: row.contentStandardPdfPage,
            printedPage: row.contentStandardPrintedPage,
            sourceReference: row.contentStandardSourceReference,
            extractionConfidence: row.contentStandardExtractionConfidence,
            reviewStatus: row.contentStandardReviewStatus,
            ambiguityFlag: row.contentStandardAmbiguityFlag,
          },
          guidance: guidanceRows
            .filter((item) => item.contentStandardId === row.contentStandardId)
            .map((item) => ({
              kind: item.kind,
              text: item.text,
              sortOrder: item.sortOrder,
              documentId: item.documentId,
              pdfPage: item.pdfPage,
              printedPage: item.printedPage,
              sourceReference: item.sourceReference,
              extractionConfidence: item.extractionConfidence,
              reviewStatus: item.reviewStatus,
              ambiguityFlag: item.ambiguityFlag,
            })),
          indicators: [],
        };
        standard.indicators.push(indicator);
        subStrandEntry.contentStandards.set(row.contentStandardId, standard);
      }
    }

    // Convert Maps to arrays
    const result = Array.from(strandsMap.values()).map((strand) => ({
      name: strand.name,
      subStrands: Array.from(strand.subStrands.values()).map((subStrand) => ({
        name: subStrand.name,
        displayName: subStrand.displayName,
        indicators: subStrand.indicators,
        contentStandards: Array.from(subStrand.contentStandards.values()).sort(
          (left, right) => left.sortOrder - right.sortOrder
        ),
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
          curriculumSlug,
          subject: subject.subjects.name,
          level: rows[0]
            ? { code: rows[0].levelCode, name: rows[0].levelName }
            : null,
        grade: grade || "all",
          gradeName: rows[0]?.gradeName ?? null,
          revision,
          typicalAgeMin: rows[0]?.typicalAgeMin ?? null,
          typicalAgeMax: rows[0]?.typicalAgeMax ?? null,
        strands: result,
      },
    });
  } catch (error) {
    console.error("Curriculum API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch curriculum data" },
      { status: 500 }
    );
  }
}