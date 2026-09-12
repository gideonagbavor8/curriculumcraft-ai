import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  curriculumFrameworks,
  educationLevels,
  grades,
  subjects,
  strands,
  subStrands,
  indicators,
  indicatorExemplars,
} from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { DEFAULT_CURRICULUM_SLUG } from "@/lib/curriculum/catalog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectSlug = searchParams.get("subject");
    const grade = searchParams.get("grade");
    const level = searchParams.get("level");
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

    // Single query — fetch everything at once using joins
    const rows = await db
      .select({
        strandId: strands.id,
        strandName: strands.name,
        subStrandId: subStrands.id,
        subStrandName: subStrands.name,
        indicatorCode: indicators.code,
        indicatorId: indicators.id,
        indicatorText: indicators.text,
        indicatorBlooms: indicators.bloomsLevel,
        indicatorGrade: indicators.grade,
        levelCode: educationLevels.code,
        levelName: educationLevels.name,
        gradeName: grades.name,
        typicalAgeMin: grades.typicalAgeMin,
        typicalAgeMax: grades.typicalAgeMax,
      })
      .from(strands)
      .innerJoin(subStrands, eq(subStrands.strandId, strands.id))
      .innerJoin(indicators, eq(indicators.subStrandId, subStrands.id))
      .innerJoin(grades, eq(indicators.gradeId, grades.id))
      .innerJoin(educationLevels, eq(grades.educationLevelId, educationLevels.id))
      .where(
        and(
          eq(strands.subjectId, subject.subjects.id),
          grade ? eq(grades.code, grade) : undefined,
          level ? eq(educationLevels.code, level) : undefined
        )
      );

    const revision = searchParams.get("revision") ?? subject.curriculum_frameworks.version;
    const exemplarRows = rows.length
      ? await db
          .select({
            indicatorId: indicatorExemplars.indicatorId,
            code: indicatorExemplars.code,
            text: indicatorExemplars.text,
            sortOrder: indicatorExemplars.sortOrder,
            revision: indicatorExemplars.revision,
            sourceReference: indicatorExemplars.sourceReference,
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
    const exemplarsByIndicator = Map.groupBy(
      exemplarRows,
      (exemplar) => exemplar.indicatorId
    );

    // Group into nested structure
    const strandsMap = new Map<string, {
      name: string;
      subStrands: Map<string, {
        name: string;
        indicators: { code: string; text: string; bloomsLevel: string; grade: string; exemplars: Omit<(typeof exemplarRows)[number], "indicatorId">[] }[];
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
          indicators: [],
        });
      }
      strandEntry.subStrands.get(row.subStrandId)!.indicators.push({
        code: row.indicatorCode,
        text: row.indicatorText,
        bloomsLevel: row.indicatorBlooms,
        grade: row.indicatorGrade,
        exemplars: (exemplarsByIndicator.get(row.indicatorId) ?? []).map(
          (exemplar) => ({
            code: exemplar.code,
            text: exemplar.text,
            sortOrder: exemplar.sortOrder,
            revision: exemplar.revision,
            sourceReference: exemplar.sourceReference,
          })
        ),
      });
    }

    // Convert Maps to arrays
    const result = Array.from(strandsMap.values()).map((strand) => ({
      name: strand.name,
      subStrands: Array.from(strand.subStrands.values()),
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