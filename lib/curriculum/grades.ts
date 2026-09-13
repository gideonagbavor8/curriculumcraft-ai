import { and, eq } from "drizzle-orm";
import { educationLevels, gradeAliases, grades } from "@/db/schema";
import { db } from "@/lib/db";

export async function resolveGradeCode(
  requestedCode: string | null,
  levelCode?: string | null
): Promise<string | null> {
  if (!requestedCode) return null;

  const normalizedCode = requestedCode.toUpperCase();
  const [direct] = await db
    .select({ code: grades.code })
    .from(grades)
    .innerJoin(
      educationLevels,
      eq(grades.educationLevelId, educationLevels.id)
    )
    .where(
      and(
        eq(grades.code, normalizedCode),
        levelCode ? eq(educationLevels.code, levelCode) : undefined
      )
    );

  if (direct) return direct.code;

  const [alias] = await db
    .select({ code: grades.code })
    .from(gradeAliases)
    .innerJoin(grades, eq(gradeAliases.gradeId, grades.id))
    .innerJoin(
      educationLevels,
      eq(gradeAliases.educationLevelId, educationLevels.id)
    )
    .where(
      and(
        eq(gradeAliases.alias, normalizedCode),
        levelCode ? eq(educationLevels.code, levelCode) : undefined
      )
    );

  return alias?.code ?? normalizedCode;
}