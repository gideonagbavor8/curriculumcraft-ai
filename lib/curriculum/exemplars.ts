import { and, asc, eq } from "drizzle-orm";
import {
  curriculumFrameworks,
  educationLevels,
  grades,
  indicatorExemplars,
  indicators,
  strands,
  subStrands,
  subjects,
} from "@/db/schema";
import { db } from "@/lib/db";
import { DEFAULT_CURRICULUM_SLUG } from "./catalog";
import type { IndicatorExemplar } from "@/types/curriculum";

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
  try {
    const rows = await db
      .select({
        code: indicatorExemplars.code,
        text: indicatorExemplars.text,
        sortOrder: indicatorExemplars.sortOrder,
        revision: indicatorExemplars.revision,
        sourceReference: indicatorExemplars.sourceReference,
      })
      .from(indicatorExemplars)
      .innerJoin(indicators, eq(indicatorExemplars.indicatorId, indicators.id))
      .innerJoin(subStrands, eq(indicators.subStrandId, subStrands.id))
      .innerJoin(strands, eq(subStrands.strandId, strands.id))
      .innerJoin(subjects, eq(strands.subjectId, subjects.id))
      .innerJoin(grades, eq(indicators.gradeId, grades.id))
      .innerJoin(educationLevels, eq(grades.educationLevelId, educationLevels.id))
      .innerJoin(
        curriculumFrameworks,
        eq(subjects.curriculumId, curriculumFrameworks.id)
      )
      .where(
        and(
          eq(curriculumFrameworks.slug, curriculumSlug),
          eq(subjects.name, subject),
          eq(grades.code, grade),
          eq(indicators.code, indicatorCode),
          strand ? eq(strands.name, strand) : undefined,
          subStrand ? eq(subStrands.name, subStrand) : undefined,
          eq(
            indicatorExemplars.revision,
            revision ?? curriculumFrameworks.version
          )
        )
      )
      .orderBy(asc(indicatorExemplars.sortOrder));

    return rows;
  } catch (error) {
    console.warn("Indicator exemplar lookup unavailable:", error);
    return [];
  }
}