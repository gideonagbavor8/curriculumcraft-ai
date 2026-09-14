import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { subjects, indicators, strands, subStrands, contentStandards } from "@/db/schema";

/**
 * Headline counts of what has actually been imported, for the home page.
 *
 * These were hard-coded ("7 subjects", "80+ indicators") and drifted badly out
 * of date as the curriculum import grew - the real figure is now in the
 * thousands. Reading them from the database means the page can never overstate
 * or understate what a teacher will find inside.
 */

export interface CurriculumStats {
  subjects: number;
  gradeLevels: number;
  strands: number;
  subStrands: number;
  contentStandards: number;
  indicators: number;
}

/** Used when the database can't be reached, so a blip degrades the page rather than breaking it. */
const UNAVAILABLE: CurriculumStats = {
  subjects: 0,
  gradeLevels: 0,
  strands: 0,
  subStrands: 0,
  contentStandards: 0,
  indicators: 0,
};

export async function getCurriculumStats(): Promise<CurriculumStats> {
  try {
    const [[subjectRow], [strandRow], [subStrandRow], [standardRow], [indicatorRow], [gradeRow]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(subjects),
      db.select({ n: sql<number>`count(*)::int` }).from(strands),
      db.select({ n: sql<number>`count(*)::int` }).from(subStrands),
      db.select({ n: sql<number>`count(*)::int` }).from(contentStandards),
      db.select({ n: sql<number>`count(*)::int` }).from(indicators),
      // Grades that actually carry indicators, rather than every grade row -
      // an empty class level would be a promise the app can't keep.
      db.select({ n: sql<number>`count(distinct ${indicators.grade})::int` }).from(indicators),
    ]);

    return {
      subjects: subjectRow?.n ?? 0,
      gradeLevels: gradeRow?.n ?? 0,
      strands: strandRow?.n ?? 0,
      subStrands: subStrandRow?.n ?? 0,
      contentStandards: standardRow?.n ?? 0,
      indicators: indicatorRow?.n ?? 0,
    };
  } catch (error) {
    console.error("Curriculum stats unavailable:", error);
    return UNAVAILABLE;
  }
}

/** "2,213" - thousands separated, so a four-figure count reads at a glance. */
export function formatStat(value: number): string {
  return value.toLocaleString("en-GB");
}
