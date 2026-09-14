import { and, eq, or } from "drizzle-orm";
import { indicators, subStrands, strands, subjects, grades } from "@/db/schema";
import { db } from "@/lib/db";
import { resolveGradeCode } from "@/lib/curriculum/grades";
import type { NormalizedIndicator } from "./normalizeRows";

export type MatchConfidence = "exact" | "fuzzy" | "unmatched";

export interface MatchedIndicator extends NormalizedIndicator {
  matchedIndicatorId: string | null;
  matchConfidence: MatchConfidence;
}

/** Strips stray leading noise before the first recognisable code (e.g. OCR/typo artifacts like "B B4.1.2.1.1" or "B4. 1.2.3.1"). */
function normalizeCode(code: string): string {
  const match = code.match(/[A-Z]\d+(?:\.\s*\d+)+/);
  const raw = match ? match[0] : code.trim();
  return raw.replace(/\s+/g, "");
}

/** The content-standard-level prefix of an indicator code (drops the last ".N" segment). */
function parentPrefix(code: string): string {
  return code.replace(/\.\d+$/, "");
}

/**
 * Matches a scheme week's indicator codes against the curriculum database.
 * Exact code match = "exact" (confirmed). Same content-standard prefix but
 * different final indicator number = "fuzzy" (needs review - the uploaded
 * scheme's own wording is still what gets used, this only links it to DB
 * exemplars/guidance for richer generation later). No match at all =
 * "unmatched" - the uploaded code/text is preserved and flagged, never
 * dropped or replaced with database wording.
 */
export async function matchIndicatorsAgainstCurriculum(
  rawIndicators: NormalizedIndicator[],
  opts: { subjectSlug: string; gradeCode: string }
): Promise<MatchedIndicator[]> {
  if (rawIndicators.length === 0) return [];

  const canonicalGrade = (await resolveGradeCode(opts.gradeCode)) ?? opts.gradeCode;

  const candidates = await db
    .select({ id: indicators.id, code: indicators.code })
    .from(indicators)
    .innerJoin(subStrands, eq(indicators.subStrandId, subStrands.id))
    .innerJoin(strands, eq(subStrands.strandId, strands.id))
    .innerJoin(subjects, eq(strands.subjectId, subjects.id))
    .innerJoin(grades, eq(indicators.gradeId, grades.id))
    .where(
      and(
        or(eq(subjects.slug, opts.subjectSlug), eq(subjects.name, opts.subjectSlug)),
        eq(grades.code, canonicalGrade)
      )
    );

  const byExactCode = new Map(candidates.map((c) => [c.code, c.id]));
  const byParentPrefix = new Map<string, string>();
  for (const c of candidates) {
    const parent = parentPrefix(c.code);
    if (!byParentPrefix.has(parent)) byParentPrefix.set(parent, c.id);
  }

  return rawIndicators.map((ind) => {
    const normalizedCode = normalizeCode(ind.code);

    const exactId = byExactCode.get(normalizedCode);
    if (exactId) return { ...ind, matchedIndicatorId: exactId, matchConfidence: "exact" };

    const fuzzyId = byParentPrefix.get(parentPrefix(normalizedCode));
    if (fuzzyId) return { ...ind, matchedIndicatorId: fuzzyId, matchConfidence: "fuzzy" };

    return { ...ind, matchedIndicatorId: null, matchConfidence: "unmatched" };
  });
}
