export const DEFAULT_CURRICULUM_SLUG = "ghana-nacca-sbc";

/**
 * Seed-era subject slugs and the official subject that replaced each. The
 * first JHS seed created "english-language" and "rme" with a handful of
 * placeholder indicators; the official NaCCA releases file the same subjects
 * under the slugs the Primary releases already used. The placeholder rows are
 * kept (nothing imported is ever deleted), but a superseded slug is hidden
 * from the catalog whenever its replacement exists, and any request for it is
 * answered with the replacement so older saved schemes and links keep working.
 */
export const SUPERSEDED_SUBJECT_SLUGS: Readonly<Record<string, string>> = {
  "english-language": "english",
  rme: "religious-and-moral-education",
};

/** The slug to serve for a requested subject slug - itself, unless it has been superseded. */
export function resolveSubjectSlug(slug: string): string {
  return SUPERSEDED_SUBJECT_SLUGS[slug] ?? slug;
}

/** Drops superseded subjects from a list when the subject that replaced them is also in it. */
export function withoutSupersededSubjects<T extends { slug: string }>(list: readonly T[]): T[] {
  const present = new Set(list.map((item) => item.slug));
  return list.filter((item) => {
    const replacement = SUPERSEDED_SUBJECT_SLUGS[item.slug];
    return !replacement || !present.has(replacement);
  });
}

/**
 * The catalog's subjects that have indicators at a level - Arabic is JHS only,
 * History is Primary only. A subject with no level data (an older catalog
 * response) is kept rather than hidden.
 */
export function subjectsTaughtAt<T extends { slug: string; levels?: string[] }>(
  catalog: { subjects: T[] } | null | undefined,
  levelCode: string
): T[] {
  return (catalog?.subjects ?? []).filter(
    (item) => !item.levels || item.levels.length === 0 || item.levels.includes(levelCode)
  );
}

export const EDUCATION_LEVELS = [
  {
    code: "PRIMARY",
    name: "Primary",
    grades: [
      { code: "B1", name: "Basic 1", aliases: ["P1"], typicalAgeMin: 6, typicalAgeMax: 7 },
      { code: "B2", name: "Basic 2", aliases: ["P2"], typicalAgeMin: 7, typicalAgeMax: 8 },
      { code: "B3", name: "Basic 3", aliases: ["P3"], typicalAgeMin: 8, typicalAgeMax: 9 },
      { code: "B4", name: "Basic 4", aliases: ["P4"], typicalAgeMin: 9, typicalAgeMax: 10 },
      { code: "B5", name: "Basic 5", aliases: ["P5"], typicalAgeMin: 10, typicalAgeMax: 11 },
      { code: "B6", name: "Basic 6", aliases: ["P6"], typicalAgeMin: 11, typicalAgeMax: 12 },
    ],
  },
  {
    code: "JHS",
    name: "JHS",
    grades: [
      { code: "B7", name: "JHS 1", typicalAgeMin: 12, typicalAgeMax: 13 },
      { code: "B8", name: "JHS 2", typicalAgeMin: 13, typicalAgeMax: 14 },
      { code: "B9", name: "JHS 3", typicalAgeMin: 14, typicalAgeMax: 15 },
    ],
  },
] as const;

export type EducationLevelCode = (typeof EDUCATION_LEVELS)[number]["code"];
export type GradeCode = (typeof EDUCATION_LEVELS)[number]["grades"][number]["code"];

export interface GradeContext {
  curriculumSlug: string;
  levelCode: EducationLevelCode;
  levelName: string;
  gradeCode: GradeCode;
  gradeName: string;
  typicalAgeMin: number;
  typicalAgeMax: number;
}

export function getGradeContext(
  gradeCode: string,
  curriculumSlug = DEFAULT_CURRICULUM_SLUG
): GradeContext | null {
  for (const level of EDUCATION_LEVELS) {
    const normalizedCode = gradeCode.toUpperCase();
    const grade = level.grades.find(
      (candidate) =>
        candidate.code === normalizedCode ||
        (candidate as { aliases?: readonly string[] }).aliases?.includes(
          normalizedCode
        )
    );

    if (grade) {
      return {
        curriculumSlug,
        levelCode: level.code,
        levelName: level.name,
        gradeCode: grade.code,
        gradeName: grade.name,
        typicalAgeMin: grade.typicalAgeMin,
        typicalAgeMax: grade.typicalAgeMax,
      };
    }
  }

  return null;
}

export function getGradesForLevel(levelCode: EducationLevelCode) {
  return EDUCATION_LEVELS.find((level) => level.code === levelCode)?.grades ?? [];
}