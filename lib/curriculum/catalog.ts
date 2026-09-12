export const DEFAULT_CURRICULUM_SLUG = "ghana-nacca-sbc";

export const EDUCATION_LEVELS = [
  {
    code: "PRIMARY",
    name: "Primary",
    grades: [
      { code: "P1", name: "Primary 1", typicalAgeMin: 6, typicalAgeMax: 7 },
      { code: "P2", name: "Primary 2", typicalAgeMin: 7, typicalAgeMax: 8 },
      { code: "P3", name: "Primary 3", typicalAgeMin: 8, typicalAgeMax: 9 },
      { code: "P4", name: "Primary 4", typicalAgeMin: 9, typicalAgeMax: 10 },
      { code: "P5", name: "Primary 5", typicalAgeMin: 10, typicalAgeMax: 11 },
      { code: "P6", name: "Primary 6", typicalAgeMin: 11, typicalAgeMax: 12 },
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
    const grade = level.grades.find((candidate) => candidate.code === gradeCode);

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