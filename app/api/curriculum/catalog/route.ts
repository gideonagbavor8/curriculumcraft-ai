import { asc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  curriculumFrameworks,
  educationLevels,
  grades,
  gradeAliases,
  subjects,
} from "@/db/schema";
import { DEFAULT_CURRICULUM_SLUG } from "@/lib/curriculum/catalog";

export async function GET(request: NextRequest) {
  try {
    const curriculumSlug =
      request.nextUrl.searchParams.get("curriculum") ?? DEFAULT_CURRICULUM_SLUG;
    const [curriculum] = await db
      .select()
      .from(curriculumFrameworks)
      .where(eq(curriculumFrameworks.slug, curriculumSlug));

    if (!curriculum) {
      return NextResponse.json(
        { success: false, error: "Curriculum not found" },
        { status: 404 }
      );
    }

    const [levelRows, subjectRows] = await Promise.all([
      db
        .select({
          levelId: educationLevels.id,
          levelCode: educationLevels.code,
          levelName: educationLevels.name,
          levelSortOrder: educationLevels.sortOrder,
          gradeId: grades.id,
          gradeCode: grades.code,
          gradeName: grades.name,
          gradeSortOrder: grades.sortOrder,
          typicalAgeMin: grades.typicalAgeMin,
          typicalAgeMax: grades.typicalAgeMax,
        })
        .from(educationLevels)
        .innerJoin(grades, eq(grades.educationLevelId, educationLevels.id))
        .where(eq(educationLevels.curriculumId, curriculum.id))
        .orderBy(asc(educationLevels.sortOrder), asc(grades.sortOrder)),
      db
        .select({ id: subjects.id, name: subjects.name, slug: subjects.slug })
        .from(subjects)
        .where(eq(subjects.curriculumId, curriculum.id))
        .orderBy(asc(subjects.name)),
    ]);

    const aliasRows = levelRows.length
      ? await db
          .select({ gradeId: gradeAliases.gradeId, alias: gradeAliases.alias })
          .from(gradeAliases)
          .where(
            inArray(
              gradeAliases.gradeId,
              levelRows.map((row) => row.gradeId)
            )
          )
      : [];
    const aliasesByGrade = Map.groupBy(aliasRows, (row) => row.gradeId);

    const levels = Array.from(
      levelRows.reduce((map, row) => {
        const level = map.get(row.levelId) ?? {
          code: row.levelCode,
          name: row.levelName,
          sortOrder: row.levelSortOrder,
          grades: [],
        };
        level.grades.push({
          code: row.gradeCode,
          name: row.gradeName,
          aliases: (aliasesByGrade.get(row.gradeId) ?? []).map(
            (alias) => alias.alias
          ),
          sortOrder: row.gradeSortOrder,
          typicalAgeMin: row.typicalAgeMin,
          typicalAgeMax: row.typicalAgeMax,
        });
        map.set(row.levelId, level);
        return map;
      }, new Map<string, { code: string; name: string; sortOrder: number; grades: { code: string; name: string; aliases: string[]; sortOrder: number; typicalAgeMin: number | null; typicalAgeMax: number | null }[] }>()).values()
    );

    return NextResponse.json({
      success: true,
      data: {
        curriculum: {
          name: curriculum.name,
          slug: curriculum.slug,
          countryCode: curriculum.countryCode,
          authority: curriculum.authority,
          version: curriculum.version,
        },
        levels,
        subjects: subjectRows,
      },
    });
  } catch (error) {
    console.error("Curriculum catalog API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch curriculum catalog" },
      { status: 500 }
    );
  }
}