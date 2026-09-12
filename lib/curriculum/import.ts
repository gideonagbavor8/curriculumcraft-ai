import { parse } from "csv-parse/sync";
import type { BloomsLevel } from "@/types/curriculum";

const BLOOMS_LEVELS = new Set<BloomsLevel>([
  "Remember",
  "Understand",
  "Apply",
  "Analyse",
  "Evaluate",
  "Create",
]);

export interface CurriculumImportRecord {
  curriculumSlug: string;
  curriculumName: string;
  countryCode: string;
  authority: string;
  version: string;
  levelCode: string;
  levelName: string;
  gradeCode: string;
  gradeName: string;
  gradeSortOrder: number;
  typicalAgeMin?: number;
  typicalAgeMax?: number;
  subjectSlug: string;
  subjectName: string;
  strandName: string;
  subStrandName: string;
  indicatorCode: string;
  indicatorText: string;
  bloomsLevel: BloomsLevel;
  exemplars: CurriculumExemplarImport[];
}

export interface CurriculumExemplarImport {
  code: string;
  text: string;
  sortOrder: number;
  revision: string;
  sourceReference?: string;
}

const REQUIRED_FIELDS: (keyof CurriculumImportRecord)[] = [
  "curriculumSlug",
  "curriculumName",
  "countryCode",
  "authority",
  "version",
  "levelCode",
  "levelName",
  "gradeCode",
  "gradeName",
  "gradeSortOrder",
  "subjectSlug",
  "subjectName",
  "strandName",
  "subStrandName",
  "indicatorCode",
  "indicatorText",
  "bloomsLevel",
];

function readString(
  value: unknown,
  field: keyof CurriculumImportRecord,
  rowNumber: number
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Row ${rowNumber}: ${field} is required`);
  }

  return value.trim();
}

function readInteger(
  value: unknown,
  field: keyof CurriculumImportRecord,
  rowNumber: number,
  required = false
): number | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`Row ${rowNumber}: ${field} is required`);
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Row ${rowNumber}: ${field} must be a positive integer`);
  }

  return parsed;
}

function validateRecord(value: unknown, rowNumber: number): CurriculumImportRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Row ${rowNumber}: expected an object`);
  }

  const input = value as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (input[field] === undefined || input[field] === null || input[field] === "") {
      throw new Error(`Row ${rowNumber}: ${field} is required`);
    }
  }

  const bloomsLevel = readString(input.bloomsLevel, "bloomsLevel", rowNumber);
  if (!BLOOMS_LEVELS.has(bloomsLevel as BloomsLevel)) {
    throw new Error(`Row ${rowNumber}: unsupported bloomsLevel "${bloomsLevel}"`);
  }

  const typicalAgeMin = readInteger(input.typicalAgeMin, "typicalAgeMin", rowNumber);
  const typicalAgeMax = readInteger(input.typicalAgeMax, "typicalAgeMax", rowNumber);
  if (
    typicalAgeMin !== undefined &&
    typicalAgeMax !== undefined &&
    typicalAgeMin > typicalAgeMax
  ) {
    throw new Error(`Row ${rowNumber}: typicalAgeMin cannot exceed typicalAgeMax`);
  }

  const version = readString(input.version, "version", rowNumber);
  const nestedExemplars = Array.isArray(input.exemplars) ? input.exemplars : null;
  const hasFlatExemplar = [
    input.exemplarCode,
    input.exemplarText,
    input.exemplarSortOrder,
    input.exemplarRevision,
    input.exemplarSourceReference,
  ].some((field) => field !== undefined && field !== null && field !== "");

  if (nestedExemplars && hasFlatExemplar) {
    throw new Error(`Row ${rowNumber}: use either exemplars or flat exemplar fields`);
  }

  const exemplarInputs = nestedExemplars
    ? nestedExemplars
    : hasFlatExemplar
      ? [{
          code: input.exemplarCode,
          text: input.exemplarText,
          sortOrder: input.exemplarSortOrder,
          revision: input.exemplarRevision,
          sourceReference: input.exemplarSourceReference,
        }]
      : [];

  const exemplars = exemplarInputs.map((exemplar, exemplarIndex) => {
    if (!exemplar || typeof exemplar !== "object" || Array.isArray(exemplar)) {
      throw new Error(`Row ${rowNumber}, exemplar ${exemplarIndex + 1}: expected an object`);
    }

    const candidate = exemplar as Record<string, unknown>;
    const sourceReference = candidate.sourceReference;
    return {
      code: readString(candidate.code, "indicatorCode", rowNumber),
      text: readString(candidate.text, "indicatorText", rowNumber),
      sortOrder: readInteger(
        candidate.sortOrder,
        "gradeSortOrder",
        rowNumber,
        true
      )!,
      revision:
        typeof candidate.revision === "string" && candidate.revision.trim()
          ? candidate.revision.trim()
          : version,
      sourceReference:
        typeof sourceReference === "string" && sourceReference.trim()
          ? sourceReference.trim()
          : undefined,
    };
  });

  const exemplarCodes = new Set<string>();
  const exemplarOrders = new Set<string>();
  for (const exemplar of exemplars) {
    const codeKey = `${exemplar.revision}\u0000${exemplar.code}`;
    const orderKey = `${exemplar.revision}\u0000${exemplar.sortOrder}`;
    if (exemplarCodes.has(codeKey)) {
      throw new Error(`Row ${rowNumber}: duplicate exemplar code in revision`);
    }
    if (exemplarOrders.has(orderKey)) {
      throw new Error(`Row ${rowNumber}: duplicate exemplar order in revision`);
    }
    exemplarCodes.add(codeKey);
    exemplarOrders.add(orderKey);
  }

  return {
    curriculumSlug: readString(input.curriculumSlug, "curriculumSlug", rowNumber),
    curriculumName: readString(input.curriculumName, "curriculumName", rowNumber),
    countryCode: readString(input.countryCode, "countryCode", rowNumber).toUpperCase(),
    authority: readString(input.authority, "authority", rowNumber),
    version,
    levelCode: readString(input.levelCode, "levelCode", rowNumber).toUpperCase(),
    levelName: readString(input.levelName, "levelName", rowNumber),
    gradeCode: readString(input.gradeCode, "gradeCode", rowNumber).toUpperCase(),
    gradeName: readString(input.gradeName, "gradeName", rowNumber),
    gradeSortOrder: readInteger(
      input.gradeSortOrder,
      "gradeSortOrder",
      rowNumber,
      true
    )!,
    typicalAgeMin,
    typicalAgeMax,
    subjectSlug: readString(input.subjectSlug, "subjectSlug", rowNumber),
    subjectName: readString(input.subjectName, "subjectName", rowNumber),
    strandName: readString(input.strandName, "strandName", rowNumber),
    subStrandName: readString(input.subStrandName, "subStrandName", rowNumber),
    indicatorCode: readString(input.indicatorCode, "indicatorCode", rowNumber),
    indicatorText: readString(input.indicatorText, "indicatorText", rowNumber),
    bloomsLevel: bloomsLevel as BloomsLevel,
    exemplars,
  };
}

export function parseCurriculumJson(content: string): CurriculumImportRecord[] {
  const parsed: unknown = JSON.parse(content);
  const records = Array.isArray(parsed)
    ? parsed
    : (parsed as { records?: unknown })?.records;

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("JSON import must be a non-empty array or an object with a records array");
  }

  return records.map((record, index) => validateRecord(record, index + 1));
}

export function parseCurriculumCsv(content: string): CurriculumImportRecord[] {
  const records = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  if (records.length === 0) throw new Error("CSV import contains no records");
  return records.map((record, index) => validateRecord(record, index + 2));
}