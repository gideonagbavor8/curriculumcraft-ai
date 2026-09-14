import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { indicators, subStrands, strands, subjects, grades, contentStandards } from "../db/schema";

async function main() {
  for (const slug of ["mathematics", "english", "english-language"]) {
    const rows = await db
      .select({
        code: indicators.code,
        text: indicators.text,
        csCode: contentStandards.code,
        csText: contentStandards.text,
        strand: strands.name,
        subStrand: subStrands.name,
      })
      .from(indicators)
      .innerJoin(subStrands, eq(indicators.subStrandId, subStrands.id))
      .innerJoin(strands, eq(subStrands.strandId, strands.id))
      .innerJoin(subjects, eq(strands.subjectId, subjects.id))
      .innerJoin(grades, eq(indicators.gradeId, grades.id))
      .leftJoin(contentStandards, eq(indicators.contentStandardId, contentStandards.id))
      .where(and(eq(subjects.slug, slug), eq(grades.code, "B4")))
      .limit(6);
    console.log(`\n=== ${slug} (B4) ===`);
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit(0);
}

main();
