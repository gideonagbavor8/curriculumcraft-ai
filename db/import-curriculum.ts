import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import * as dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  parseCurriculumCsv,
  parseCurriculumJson,
  type CurriculumImportRecord,
} from "../lib/curriculum/import";

dotenv.config({ path: ".env.local" });

async function importRecord(
  db: ReturnType<typeof drizzle<typeof schema>>,
  record: CurriculumImportRecord
) {
  const [curriculum] = await db
    .insert(schema.curriculumFrameworks)
    .values({
      slug: record.curriculumSlug,
      name: record.curriculumName,
      countryCode: record.countryCode,
      authority: record.authority,
      version: record.version,
    })
    .onConflictDoUpdate({
      target: schema.curriculumFrameworks.slug,
      set: {
        name: record.curriculumName,
        countryCode: record.countryCode,
        authority: record.authority,
        version: record.version,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [level] = await db
    .insert(schema.educationLevels)
    .values({
      curriculumId: curriculum.id,
      code: record.levelCode,
      name: record.levelName,
      sortOrder: record.levelCode === "PRIMARY" ? 1 : 2,
    })
    .onConflictDoUpdate({
      target: [schema.educationLevels.curriculumId, schema.educationLevels.code],
      set: { name: record.levelName },
    })
    .returning();

  const [grade] = await db
    .insert(schema.grades)
    .values({
      educationLevelId: level.id,
      code: record.gradeCode,
      name: record.gradeName,
      sortOrder: record.gradeSortOrder,
      typicalAgeMin: record.typicalAgeMin,
      typicalAgeMax: record.typicalAgeMax,
    })
    .onConflictDoUpdate({
      target: [schema.grades.educationLevelId, schema.grades.code],
      set: {
        name: record.gradeName,
        sortOrder: record.gradeSortOrder,
        typicalAgeMin: record.typicalAgeMin,
        typicalAgeMax: record.typicalAgeMax,
      },
    })
    .returning();

  const [subject] = await db
    .insert(schema.subjects)
    .values({
      curriculumId: curriculum.id,
      slug: record.subjectSlug,
      name: record.subjectName,
    })
    .onConflictDoUpdate({
      target: [schema.subjects.curriculumId, schema.subjects.slug],
      set: { name: record.subjectName },
    })
    .returning();

  const [strand] = await db
    .insert(schema.strands)
    .values({ subjectId: subject.id, name: record.strandName })
    .onConflictDoUpdate({
      target: [schema.strands.subjectId, schema.strands.name],
      set: { name: record.strandName },
    })
    .returning();

  const [subStrand] = await db
    .insert(schema.subStrands)
    .values({ strandId: strand.id, name: record.subStrandName })
    .onConflictDoUpdate({
      target: [schema.subStrands.strandId, schema.subStrands.name],
      set: { name: record.subStrandName },
    })
    .returning();

  const [indicator] = await db
    .insert(schema.indicators)
    .values({
      subStrandId: subStrand.id,
      gradeId: grade.id,
      grade: record.gradeCode,
      code: record.indicatorCode,
      text: record.indicatorText,
      bloomsLevel: record.bloomsLevel,
    })
    .onConflictDoUpdate({
      target: [
        schema.indicators.gradeId,
        schema.indicators.subStrandId,
        schema.indicators.code,
      ],
      set: {
        grade: record.gradeCode,
        text: record.indicatorText,
        bloomsLevel: record.bloomsLevel,
      },
    })
    .returning();

  const exemplarRevisions = new Set(
    record.exemplars.map((exemplar) => exemplar.revision)
  );
  for (const revision of exemplarRevisions) {
    await db
      .delete(schema.indicatorExemplars)
      .where(
        and(
          eq(schema.indicatorExemplars.indicatorId, indicator.id),
          eq(schema.indicatorExemplars.revision, revision)
        )
      );

    const revisionExemplars = record.exemplars.filter(
      (exemplar) => exemplar.revision === revision
    );
    if (revisionExemplars.length > 0) {
      await db.insert(schema.indicatorExemplars).values(
        revisionExemplars.map((exemplar) => ({
          indicatorId: indicator.id,
          code: exemplar.code,
          text: exemplar.text,
          sortOrder: exemplar.sortOrder,
          revision: exemplar.revision,
          sourceReference: exemplar.sourceReference,
        }))
      );
    }
  }
}

function consolidateRecords(records: CurriculumImportRecord[]) {
  const consolidated = new Map<string, CurriculumImportRecord>();

  for (const record of records) {
    const key = [
      record.curriculumSlug,
      record.levelCode,
      record.gradeCode,
      record.subjectSlug,
      record.strandName,
      record.subStrandName,
      record.indicatorCode,
    ].join("\u0000");
    const existing = consolidated.get(key);

    if (!existing) {
      consolidated.set(key, { ...record, exemplars: [...record.exemplars] });
      continue;
    }
    if (
      existing.indicatorText !== record.indicatorText ||
      existing.bloomsLevel !== record.bloomsLevel
    ) {
      throw new Error(`Conflicting indicator rows for ${record.indicatorCode}`);
    }
    existing.exemplars.push(...record.exemplars);
  }

  for (const record of consolidated.values()) {
    const identities = new Set<string>();
    const positions = new Set<string>();
    for (const exemplar of record.exemplars) {
      const identity = `${exemplar.revision}\u0000${exemplar.code}`;
      const position = `${exemplar.revision}\u0000${exemplar.sortOrder}`;
      if (identities.has(identity) || positions.has(position)) {
        throw new Error(
          `Duplicate exemplar code or order for ${record.indicatorCode} revision ${exemplar.revision}`
        );
      }
      identities.add(identity);
      positions.add(position);
    }
  }

  return Array.from(consolidated.values());
}

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    throw new Error("Usage: npm run curriculum:import -- <file.csv|file.json>");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const absolutePath = resolve(sourcePath);
  const content = await readFile(absolutePath, "utf8");
  const extension = extname(absolutePath).toLowerCase();
  const records =
    extension === ".csv"
      ? parseCurriculumCsv(content)
      : extension === ".json"
        ? parseCurriculumJson(content)
        : null;

  if (!records) throw new Error("Only .csv and .json imports are supported");
  const consolidatedRecords = consolidateRecords(records);

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });
  for (const record of consolidatedRecords) await importRecord(db, record);

  const exemplarCount = consolidatedRecords.reduce(
    (total, record) => total + record.exemplars.length,
    0
  );
  console.log(
    `Imported ${consolidatedRecords.length} curriculum indicators and ${exemplarCount} exemplars from ${sourcePath}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});