import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, resolve } from "node:path";
import * as dotenv from "dotenv";
import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { and, eq, isNull, sql } from "drizzle-orm";
import * as schema from "./schema";
import {
  parseCurriculumCsvImport,
  parseCurriculumJsonImport,
  type CurriculumImportRecord,
  type ParsedCurriculumImport,
} from "../lib/curriculum/import";

dotenv.config({ path: ".env.local" });

type ImportDb = Pick<
  NeonDatabase<typeof schema>,
  "delete" | "insert" | "select" | "update"
>;

interface ImportContext {
  curriculumId: string;
  releaseId: string;
  documentIds: Map<string, string>;
  levelIds: Map<string, string>;
  gradeIds: Map<string, string>;
  subjectIds: Map<string, string>;
  gradeSubjectIds: Map<string, string>;
  strandIds: Map<string, string>;
  subStrandIds: Map<string, string>;
  contentStandardIds: Map<string, string>;
  clearedStandardGuidance: Set<string>;
  insertedStandardGuidance: Set<string>;
}

function sourceValues(record: {
  documentSha256?: string;
  pdfPage?: number;
  printedPage?: string;
  sourceReference?: string;
  extractionConfidence?: string;
  reviewStatus: string;
  ambiguityFlag: boolean;
  rawSourceText?: string;
}, context: ImportContext) {
  return {
    documentId: record.documentSha256
      ? context.documentIds.get(record.documentSha256)
      : undefined,
    pdfPage: record.pdfPage,
    printedPage: record.printedPage,
    sourceReference: record.sourceReference,
    extractionConfidence: record.extractionConfidence,
    reviewStatus: record.reviewStatus,
    ambiguityFlag: record.ambiguityFlag,
    rawSourceText: record.rawSourceText,
  };
}

async function importRecord(db: ImportDb, record: CurriculumImportRecord, context: ImportContext) {
  const curriculum = { id: context.curriculumId };

  let level = { id: context.levelIds.get(record.levelCode) ?? "" };
  if (!level.id) {
    [level] = await db
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
    context.levelIds.set(record.levelCode, level.id);
  }

  let grade = { id: context.gradeIds.get(record.gradeCode) ?? "" };
  if (!grade.id) {
    [grade] = await db
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
    context.gradeIds.set(record.gradeCode, grade.id);

    for (const alias of record.gradeAliases) {
      await db
        .insert(schema.gradeAliases)
        .values({ gradeId: grade.id, educationLevelId: level.id, alias, kind: "legacy" })
        .onConflictDoUpdate({
          target: [schema.gradeAliases.educationLevelId, schema.gradeAliases.alias],
          set: { gradeId: grade.id, kind: "legacy" },
        });
    }
  }

  let subject = { id: context.subjectIds.get(record.subjectSlug) ?? "" };
  if (!subject.id) {
    [subject] = await db
    .insert(schema.subjects)
    .values({
      curriculumId: curriculum.id,
      slug: record.subjectSlug,
      name: record.subjectName,
      displayName: record.subjectDisplayName,
    })
    .onConflictDoUpdate({
      target: [schema.subjects.curriculumId, schema.subjects.slug],
      set: { name: record.subjectName, displayName: record.subjectDisplayName },
    })
    .returning();
    context.subjectIds.set(record.subjectSlug, subject.id);
  }

  const gradeSubjectKey = `${grade.id}\u0000${subject.id}`;
  let gradeSubject = { id: context.gradeSubjectIds.get(gradeSubjectKey) ?? "" };
  if (!gradeSubject.id) {
    [gradeSubject] = await db
    .insert(schema.gradeSubjects)
    .values({
      gradeId: grade.id,
      subjectId: subject.id,
      releaseId: context.releaseId,
      documentId: record.documentSha256
        ? context.documentIds.get(record.documentSha256)
        : undefined,
      sortOrder: record.subjectSortOrder,
    })
    .onConflictDoUpdate({
      target: [
        schema.gradeSubjects.gradeId,
        schema.gradeSubjects.subjectId,
        schema.gradeSubjects.releaseId,
      ],
      set: {
        documentId: record.documentSha256
          ? context.documentIds.get(record.documentSha256)
          : undefined,
        sortOrder: record.subjectSortOrder,
      },
    })
    .returning();
    context.gradeSubjectIds.set(gradeSubjectKey, gradeSubject.id);
  }

  const strandValues = {
    subjectId: subject.id,
    gradeSubjectId: gradeSubject.id,
    code: record.strandCode,
    name: record.strandName,
    displayName: record.strandDisplayName,
    sortOrder: record.strandSortOrder,
    documentId: record.documentSha256
      ? context.documentIds.get(record.documentSha256)
      : undefined,
    pdfPage: record.pdfPage,
    printedPage: record.printedPage,
    sourceReference: record.sourceReference,
  };
  const strandKey = `${gradeSubject.id}\u0000${record.strandCode ?? record.strandName}`;
  let strand = { id: context.strandIds.get(strandKey) ?? "" };
  if (!strand.id) {
    [strand] = record.strandCode
      ? await db
        .insert(schema.strands)
        .values(strandValues)
        .onConflictDoUpdate({
          target: [schema.strands.gradeSubjectId, schema.strands.code],
          targetWhere: sql`${schema.strands.gradeSubjectId} is not null`,
          set: strandValues,
        })
        .returning()
      : await db
        .select()
        .from(schema.strands)
        .where(and(
          eq(schema.strands.gradeSubjectId, gradeSubject.id),
          eq(schema.strands.name, record.strandName)
        ));
    if (!strand) {
      [strand] = await db.insert(schema.strands).values(strandValues).returning();
    } else if (!record.strandCode) {
      [strand] = await db
        .update(schema.strands)
        .set(strandValues)
        .where(eq(schema.strands.id, strand.id))
        .returning();
    }
    context.strandIds.set(strandKey, strand.id);
  }

  const subStrandKey = `${strand.id}\u0000${record.subStrandName}`;
  let subStrand = { id: context.subStrandIds.get(subStrandKey) ?? "" };
  if (!subStrand.id) {
    [subStrand] = await db
      .insert(schema.subStrands)
    .values({
      strandId: strand.id,
      code: record.subStrandCode,
      name: record.subStrandName,
      displayName: record.subStrandDisplayName,
      sortOrder: record.subStrandSortOrder,
      documentId: record.documentSha256
        ? context.documentIds.get(record.documentSha256)
        : undefined,
      pdfPage: record.pdfPage,
      printedPage: record.printedPage,
      sourceReference: record.sourceReference,
    })
    .onConflictDoUpdate({
      target: [schema.subStrands.strandId, schema.subStrands.name],
      set: {
        code: record.subStrandCode,
        displayName: record.subStrandDisplayName,
        sortOrder: record.subStrandSortOrder,
        documentId: record.documentSha256
          ? context.documentIds.get(record.documentSha256)
          : undefined,
        pdfPage: record.pdfPage,
        printedPage: record.printedPage,
        sourceReference: record.sourceReference,
      },
    })
    .returning();
    context.subStrandIds.set(subStrandKey, subStrand.id);
  }

  let contentStandardId: string | undefined;
  if (record.contentStandardCode && record.contentStandardText) {
    const contentStandardKey = `${grade.id}\u0000${subStrand.id}\u0000${record.contentStandardCode}`;
    contentStandardId = context.contentStandardIds.get(contentStandardKey);
    if (!contentStandardId) {
      const [contentStandard] = await db
        .insert(schema.contentStandards)
      .values({
        subStrandId: subStrand.id,
        gradeId: grade.id,
        releaseId: context.releaseId,
        code: record.contentStandardCode,
        text: record.contentStandardText,
        displayText: record.contentStandardDisplayText,
        sortOrder: record.contentStandardSortOrder ?? 0,
        ...sourceValues(record, context),
      })
      .onConflictDoUpdate({
        target: [
          schema.contentStandards.gradeId,
          schema.contentStandards.subStrandId,
          schema.contentStandards.releaseId,
          schema.contentStandards.code,
        ],
        set: {
          text: record.contentStandardText,
          displayText: record.contentStandardDisplayText,
          sortOrder: record.contentStandardSortOrder ?? 0,
          ...sourceValues(record, context),
        },
      })
      .returning();
      contentStandardId = contentStandard.id;
      context.contentStandardIds.set(contentStandardKey, contentStandardId);
    }
  }

  const [indicator] = await db
    .insert(schema.indicators)
    .values({
      subStrandId: subStrand.id,
      contentStandardId,
      releaseId: context.releaseId,
      gradeId: grade.id,
      grade: record.gradeCode,
      code: record.indicatorCode,
      text: record.indicatorText,
      displayText: record.indicatorDisplayText,
      bloomsLevel: record.bloomsLevel,
      sortOrder: record.indicatorSortOrder,
      ...sourceValues(record, context),
    })
    .onConflictDoUpdate({
      target: [
        schema.indicators.gradeId,
        schema.indicators.subStrandId,
        schema.indicators.releaseId,
        schema.indicators.code,
      ],
      set: {
        contentStandardId,
        grade: record.gradeCode,
        text: record.indicatorText,
        displayText: record.indicatorDisplayText,
        bloomsLevel: record.bloomsLevel,
        sortOrder: record.indicatorSortOrder,
        ...sourceValues(record, context),
      },
    })
    .returning();

  if (record.exemplars.length > 0) {
    await db.delete(schema.indicatorExemplars).where(eq(schema.indicatorExemplars.indicatorId, indicator.id));
    await db.insert(schema.indicatorExemplars).values(
      record.exemplars.map((exemplar) => ({
          indicatorId: indicator.id,
          code: exemplar.code,
          label: exemplar.label,
          text: exemplar.text,
          sortOrder: exemplar.sortOrder,
          revision: exemplar.revision,
          ...sourceValues(exemplar, context),
        }))
    );
  }

  const indicatorGuidance = record.guidance.filter((item) => item.target === "indicator");
  if (indicatorGuidance.length > 0) {
    await db.delete(schema.curriculumGuidance).where(eq(schema.curriculumGuidance.indicatorId, indicator.id));
    await db.insert(schema.curriculumGuidance).values(
      indicatorGuidance.map((guidance) => ({
        indicatorId: indicator.id,
        kind: guidance.kind,
        text: guidance.text,
        sortOrder: guidance.sortOrder,
        ...sourceValues(guidance, context),
      }))
    );
  }

  const standardGuidance = record.guidance.filter(
    (item) => item.target === "contentStandard"
  );
  if (standardGuidance.length > 0 && !contentStandardId) {
    throw new Error(
      `Indicator ${record.indicatorCode} has content-standard guidance without a content standard`
    );
  }
  if (contentStandardId && standardGuidance.length > 0) {
    if (!context.clearedStandardGuidance.has(contentStandardId)) {
      await db.delete(schema.curriculumGuidance).where(
        eq(schema.curriculumGuidance.contentStandardId, contentStandardId)
      );
      context.clearedStandardGuidance.add(contentStandardId);
    }
    const newGuidance = standardGuidance.filter((guidance) => {
      const key = `${contentStandardId}\u0000${guidance.kind}\u0000${guidance.sortOrder}`;
      if (context.insertedStandardGuidance.has(key)) return false;
      context.insertedStandardGuidance.add(key);
      return true;
    });
    if (newGuidance.length > 0) {
      await db.insert(schema.curriculumGuidance).values(
        newGuidance.map((guidance) => ({
          contentStandardId,
          kind: guidance.kind,
          text: guidance.text,
          sortOrder: guidance.sortOrder,
          ...sourceValues(guidance, context),
        }))
      );
    }
  }
}

export function consolidateRecords(records: CurriculumImportRecord[]) {
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
      consolidated.set(key, {
        ...record,
        guidance: [...record.guidance],
        exemplars: [...record.exemplars],
      });
      continue;
    }
    if (
      existing.indicatorText !== record.indicatorText ||
      existing.bloomsLevel !== record.bloomsLevel ||
      existing.contentStandardCode !== record.contentStandardCode ||
      existing.contentStandardText !== record.contentStandardText
    ) {
      throw new Error(`Conflicting indicator rows for ${record.indicatorCode}`);
    }
    existing.guidance.push(...record.guidance);
    existing.exemplars.push(...record.exemplars);
  }

  for (const record of consolidated.values()) {
    const identities = new Set<string>();
    const positions = new Set<string>();
    for (const exemplar of record.exemplars) {
      const identity = exemplar.code
        ? `${exemplar.revision}\u0000${exemplar.code}`
        : undefined;
      const position = `${exemplar.revision}\u0000${exemplar.sortOrder}`;
      if ((identity && identities.has(identity)) || positions.has(position)) {
        throw new Error(
          `Duplicate exemplar code or order for ${record.indicatorCode} revision ${exemplar.revision}`
        );
      }
      if (identity) identities.add(identity);
      positions.add(position);
    }

    const guidancePositions = new Set<string>();
    for (const guidance of record.guidance) {
      const position = `${guidance.kind}\u0000${guidance.sortOrder}`;
      if (guidancePositions.has(position)) {
        throw new Error(
          `Duplicate guidance order for ${record.indicatorCode} kind ${guidance.kind}`
        );
      }
      guidancePositions.add(position);
    }
  }

  return Array.from(consolidated.values());
}

export function parseImportFile(extension: string, content: string): ParsedCurriculumImport {
  if (extension === ".csv") return parseCurriculumCsvImport(content);
  if (extension === ".json") return parseCurriculumJsonImport(content);
  throw new Error("Only .csv and .json imports are supported");
}

function counts(records: CurriculumImportRecord[]) {
  return {
    indicators: records.length,
    exemplars: records.reduce((total, record) => total + record.exemplars.length, 0),
    guidance: records.reduce((total, record) => total + record.guidance.length, 0),
  };
}

async function importCurriculum(
  db: NeonDatabase<typeof schema>,
  parsed: ParsedCurriculumImport,
  checksum: string,
  sourceFileName: string
) {
  const records = consolidateRecords(parsed.records);
  return db.transaction(async (tx) => {
    const first = records[0];
    const [curriculum] = await tx
      .insert(schema.curriculumFrameworks)
      .values({
        slug: first.curriculumSlug,
        name: first.curriculumName,
        countryCode: first.countryCode,
        authority: first.authority,
        version: first.version,
      })
      .onConflictDoUpdate({
        target: schema.curriculumFrameworks.slug,
        set: {
          name: first.curriculumName,
          countryCode: first.countryCode,
          authority: first.authority,
          updatedAt: new Date(),
        },
      })
      .returning();

    const existingReleases = await tx
      .select()
      .from(schema.curriculumReleases)
      .where(and(
        eq(schema.curriculumReleases.curriculumId, curriculum.id),
        eq(schema.curriculumReleases.version, first.version)
      ));
    let release = existingReleases[0];
    if (release?.status === "approved") {
      const prior = await tx
        .select()
        .from(schema.curriculumImportManifests)
        .where(and(
          eq(schema.curriculumImportManifests.releaseId, release.id),
          eq(schema.curriculumImportManifests.checksum, checksum)
        ));
      if (prior.length > 0) return { status: "unchanged" as const, ...counts(records) };
      throw new Error(
        `Release ${first.version} is approved and immutable; import it under a new version`
      );
    }
    if (!release) {
      [release] = await tx
        .insert(schema.curriculumReleases)
        .values({ curriculumId: curriculum.id, version: first.version, status: "draft" })
        .returning();
    }

    const documentIds = new Map<string, string>();
    for (const document of parsed.manifest.documents) {
      const [saved] = await tx
        .insert(schema.curriculumDocuments)
        .values({ releaseId: release.id, ...document })
        .onConflictDoUpdate({
          target: [schema.curriculumDocuments.releaseId, schema.curriculumDocuments.sha256],
          set: {
            organization: document.organization,
            title: document.title,
            publicationDate: document.publicationDate,
            version: document.version,
            sourceUrl: document.sourceUrl,
            coverage: document.coverage,
            extractionVersion: document.extractionVersion,
          },
        })
        .returning();
      documentIds.set(document.sha256, saved.id);
    }

    const context = {
      curriculumId: curriculum.id,
      releaseId: release.id,
      documentIds,
      levelIds: new Map<string, string>(),
      gradeIds: new Map<string, string>(),
      subjectIds: new Map<string, string>(),
      gradeSubjectIds: new Map<string, string>(),
      strandIds: new Map<string, string>(),
      subStrandIds: new Map<string, string>(),
      contentStandardIds: new Map<string, string>(),
      clearedStandardGuidance: new Set<string>(),
      insertedStandardGuidance: new Set<string>(),
    };
    for (const record of records) await importRecord(tx, record, context);

    const totals = counts(records);
    await tx
      .insert(schema.curriculumImportManifests)
      .values({
        releaseId: release.id,
        checksum,
        sourceFileName,
        status: "completed",
        recordCount: totals.indicators,
        exemplarCount: totals.exemplars,
      })
      .onConflictDoUpdate({
        target: [
          schema.curriculumImportManifests.releaseId,
          schema.curriculumImportManifests.checksum,
        ],
        set: {
          sourceFileName,
          status: "completed",
          recordCount: totals.indicators,
          exemplarCount: totals.exemplars,
          importedAt: new Date(),
        },
      });

    if (parsed.manifest.releaseStatus === "approved") {
      await tx
        .update(schema.curriculumReleases)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(schema.curriculumReleases.id, release.id));

      // `curriculumFrameworks.version` is the revision label for legacy (release_id IS NULL)
      // rows. Only promote it when the framework has no legacy content depending on the old
      // label, otherwise legacy exemplar/citation lookups keyed on the old version break.
      const [legacyIndicator] = await tx
        .select({ id: schema.indicators.id })
        .from(schema.indicators)
        .innerJoin(schema.subStrands, eq(schema.indicators.subStrandId, schema.subStrands.id))
        .innerJoin(schema.strands, eq(schema.subStrands.strandId, schema.strands.id))
        .innerJoin(schema.subjects, eq(schema.strands.subjectId, schema.subjects.id))
        .where(and(
          eq(schema.subjects.curriculumId, curriculum.id),
          isNull(schema.indicators.releaseId)
        ))
        .limit(1);
      if (!legacyIndicator) {
        await tx
          .update(schema.curriculumFrameworks)
          .set({ version: first.version, updatedAt: new Date() })
          .where(eq(schema.curriculumFrameworks.id, curriculum.id));
      }
    }
    return { status: "imported" as const, ...totals };
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sourcePath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!sourcePath) {
    throw new Error("Usage: npm run curriculum:import -- <file.csv|file.json> [--dry-run]");
  }

  const absolutePath = resolve(sourcePath);
  const content = await readFile(absolutePath, "utf8");
  const extension = extname(absolutePath).toLowerCase();
  const parsed = parseImportFile(extension, content);
  const records = consolidateRecords(parsed.records);
  const totals = counts(records);
  const checksum = createHash("sha256").update(content).digest("hex").toUpperCase();

  if (dryRun) {
    console.log(
      `Valid: ${totals.indicators} indicators, ${totals.exemplars} exemplars, ` +
      `${totals.guidance} guidance entries; checksum ${checksum}`
    );
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  // The direct (non-pooler) host has been intermittently unreachable; the pooler
  // is reliable and, with hierarchy caching in importRecord, transactions are now
  // short enough for pgbouncer's transaction pooling mode.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const db = drizzle(pool, { schema });
    const result = await importCurriculum(db, parsed, checksum, basename(absolutePath));
    console.log(
      `${result.status === "unchanged" ? "Already imported" : "Imported"}: ` +
      `${result.indicators} indicators, ${result.exemplars} exemplars, ` +
      `${result.guidance} guidance entries from ${sourcePath}`
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});