import { parse } from "csv-parse/sync";
import type {
  BloomsLevel,
  CurriculumGuidance,
  ExtractionConfidence,
  ReviewStatus,
} from "@/types/curriculum";

const BLOOMS_LEVELS = new Set<BloomsLevel>([
  "Remember",
  "Understand",
  "Apply",
  "Analyse",
  "Evaluate",
  "Create",
]);

const REVIEW_STATUSES = new Set<ReviewStatus>([
  "pending", "needs-review", "approved", "rejected",
]);
const CONFIDENCE_LEVELS = new Set<ExtractionConfidence>(["low", "medium", "high"]);

export interface CurriculumDocumentImport {
  organization: string;
  title: string;
  publicationDate?: string;
  version: string;
  sourceUrl: string;
  coverage: string;
  sha256: string;
  extractionVersion: string;
}

export interface CurriculumImportManifest {
  schemaVersion: "1";
  releaseStatus: "draft" | "approved";
  documents: CurriculumDocumentImport[];
}

interface ProvenanceImport {
  documentSha256?: string;
  pdfPage?: number;
  printedPage?: string;
  sourceReference?: string;
  extractionConfidence?: ExtractionConfidence;
  reviewStatus: ReviewStatus;
  ambiguityFlag: boolean;
  rawSourceText?: string;
}

export interface CurriculumExemplarImport extends ProvenanceImport {
  code?: string;
  label?: string;
  text: string;
  sortOrder: number;
  revision: string;
}

export interface CurriculumGuidanceImport extends ProvenanceImport {
  target: "indicator" | "contentStandard";
  kind: CurriculumGuidance["kind"];
  text: string;
  sortOrder: number;
}

export interface CurriculumImportRecord extends ProvenanceImport {
  curriculumSlug: string;
  curriculumName: string;
  countryCode: string;
  authority: string;
  version: string;
  levelCode: string;
  levelName: string;
  gradeCode: string;
  gradeName: string;
  gradeAliases: string[];
  gradeSortOrder: number;
  typicalAgeMin?: number;
  typicalAgeMax?: number;
  subjectSlug: string;
  subjectName: string;
  subjectDisplayName?: string;
  subjectSortOrder: number;
  strandCode?: string;
  strandName: string;
  strandDisplayName?: string;
  strandSortOrder: number;
  subStrandCode?: string;
  subStrandName: string;
  subStrandDisplayName?: string;
  subStrandSortOrder: number;
  contentStandardCode?: string;
  contentStandardText?: string;
  contentStandardDisplayText?: string;
  contentStandardSortOrder?: number;
  indicatorCode: string;
  indicatorText: string;
  indicatorDisplayText?: string;
  indicatorSortOrder: number;
  bloomsLevel: BloomsLevel | null;
  guidance: CurriculumGuidanceImport[];
  exemplars: CurriculumExemplarImport[];
}

export interface ParsedCurriculumImport {
  manifest: CurriculumImportManifest;
  records: CurriculumImportRecord[];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredString(value: unknown, field: string, row: number): string {
  const result = optionalString(value);
  if (!result) throw new Error(`Row ${row}: ${field} is required`);
  return result;
}

function integer(value: unknown, field: string, row: number, fallback?: number) {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Row ${row}: ${field} must be a non-negative integer`);
  }
  return parsed;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function provenance(input: Record<string, unknown>, row: number): ProvenanceImport {
  const reviewStatus = optionalString(input.reviewStatus) ?? "pending";
  if (!REVIEW_STATUSES.has(reviewStatus as ReviewStatus)) {
    throw new Error(`Row ${row}: unsupported reviewStatus "${reviewStatus}"`);
  }
  const extractionConfidence = optionalString(input.extractionConfidence);
  if (
    extractionConfidence &&
    !CONFIDENCE_LEVELS.has(extractionConfidence as ExtractionConfidence)
  ) {
    throw new Error(`Row ${row}: unsupported extractionConfidence "${extractionConfidence}"`);
  }
  return {
    documentSha256: optionalString(input.documentSha256)?.toUpperCase(),
    pdfPage: integer(input.pdfPage, "pdfPage", row),
    printedPage: optionalString(input.printedPage),
    sourceReference: optionalString(input.sourceReference),
    extractionConfidence: extractionConfidence as ExtractionConfidence | undefined,
    reviewStatus: reviewStatus as ReviewStatus,
    ambiguityFlag: booleanValue(input.ambiguityFlag),
    rawSourceText: optionalString(input.rawSourceText),
  };
}

function validateChild(
  value: unknown,
  row: number,
  index: number,
  version: string,
  kind: "exemplar" | "guidance"
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Row ${row}, ${kind} ${index + 1}: expected an object`);
  }
  const input = value as Record<string, unknown>;
  const base = {
    ...provenance(input, row),
    text: requiredString(input.text, `${kind}.text`, row),
    sortOrder: integer(input.sortOrder, `${kind}.sortOrder`, row, index + 1)!,
  };
  return kind === "exemplar"
    ? {
        ...base,
        code: optionalString(input.code),
        label: optionalString(input.label),
        revision: optionalString(input.revision) ?? version,
      }
    : {
        ...base,
        target: input.target === "contentStandard" ? "contentStandard" : "indicator",
        kind: requiredString(input.kind, "guidance.kind", row),
      };
}

function validateRecord(value: unknown, row: number): CurriculumImportRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Row ${row}: expected an object`);
  }
  const input = value as Record<string, unknown>;
  const version = requiredString(input.version, "version", row);
  const bloom = optionalString(input.bloomsLevel);
  if (bloom && !BLOOMS_LEVELS.has(bloom as BloomsLevel)) {
    throw new Error(`Row ${row}: unsupported bloomsLevel "${bloom}"`);
  }
  const contentStandardCode = optionalString(input.contentStandardCode);
  const contentStandardText = optionalString(input.contentStandardText);
  if (Boolean(contentStandardCode) !== Boolean(contentStandardText)) {
    throw new Error(`Row ${row}: contentStandardCode and contentStandardText must be supplied together`);
  }

  const nestedExemplars = Array.isArray(input.exemplars) ? input.exemplars : null;
  const hasFlatExemplar = optionalString(input.exemplarText) !== undefined;
  if (nestedExemplars && hasFlatExemplar) {
    throw new Error(`Row ${row}: use either exemplars or flat exemplar fields`);
  }
  const exemplarInputs = nestedExemplars
    ? nestedExemplars
    : hasFlatExemplar
      ? [{
          code: input.exemplarCode,
          label: input.exemplarLabel,
          text: input.exemplarText,
          sortOrder: input.exemplarSortOrder,
          revision: input.exemplarRevision,
          sourceReference: input.exemplarSourceReference,
          documentSha256: input.documentSha256,
          pdfPage: input.pdfPage,
          printedPage: input.printedPage,
        }]
      : [];
  const exemplars = exemplarInputs.map((item, index) =>
    validateChild(item, row, index, version, "exemplar") as CurriculumExemplarImport
  );
  const guidanceInputs = Array.isArray(input.guidance) ? input.guidance : [];
  const guidance = guidanceInputs.map((item, index) =>
    validateChild(item, row, index, version, "guidance") as CurriculumGuidanceImport
  );

  const exemplarOrders = new Set<number>();
  const exemplarCodes = new Set<string>();
  for (const exemplar of exemplars) {
    if (exemplarOrders.has(exemplar.sortOrder)) {
      throw new Error(`Row ${row}: duplicate exemplar sortOrder ${exemplar.sortOrder}`);
    }
    exemplarOrders.add(exemplar.sortOrder);
    if (exemplar.code) {
      if (exemplarCodes.has(exemplar.code)) {
        throw new Error(`Row ${row}: duplicate exemplar code "${exemplar.code}"`);
      }
      exemplarCodes.add(exemplar.code);
    }
  }

  const typicalAgeMin = integer(input.typicalAgeMin, "typicalAgeMin", row);
  const typicalAgeMax = integer(input.typicalAgeMax, "typicalAgeMax", row);
  if (typicalAgeMin !== undefined && typicalAgeMax !== undefined && typicalAgeMin > typicalAgeMax) {
    throw new Error(`Row ${row}: typicalAgeMin cannot exceed typicalAgeMax`);
  }

  return {
    ...provenance(input, row),
    curriculumSlug: requiredString(input.curriculumSlug, "curriculumSlug", row),
    curriculumName: requiredString(input.curriculumName, "curriculumName", row),
    countryCode: requiredString(input.countryCode, "countryCode", row).toUpperCase(),
    authority: requiredString(input.authority, "authority", row),
    version,
    levelCode: requiredString(input.levelCode, "levelCode", row).toUpperCase(),
    levelName: requiredString(input.levelName, "levelName", row),
    gradeCode: requiredString(input.gradeCode, "gradeCode", row).toUpperCase(),
    gradeName: requiredString(input.gradeName, "gradeName", row),
    gradeAliases: Array.isArray(input.gradeAliases)
      ? input.gradeAliases.map((alias) => requiredString(alias, "gradeAliases", row).toUpperCase())
      : optionalString(input.gradeAliases)?.split("|").map((alias) => alias.trim().toUpperCase()) ?? [],
    gradeSortOrder: integer(input.gradeSortOrder, "gradeSortOrder", row)!,
    typicalAgeMin,
    typicalAgeMax,
    subjectSlug: requiredString(input.subjectSlug, "subjectSlug", row),
    subjectName: requiredString(input.subjectName, "subjectName", row),
    subjectDisplayName: optionalString(input.subjectDisplayName),
    subjectSortOrder: integer(input.subjectSortOrder, "subjectSortOrder", row, 0)!,
    strandCode: optionalString(input.strandCode),
    strandName: requiredString(input.strandName, "strandName", row),
    strandDisplayName: optionalString(input.strandDisplayName),
    strandSortOrder: integer(input.strandSortOrder, "strandSortOrder", row, 0)!,
    subStrandCode: optionalString(input.subStrandCode),
    subStrandName: requiredString(input.subStrandName, "subStrandName", row),
    subStrandDisplayName: optionalString(input.subStrandDisplayName),
    subStrandSortOrder: integer(input.subStrandSortOrder, "subStrandSortOrder", row, 0)!,
    contentStandardCode,
    contentStandardText,
    contentStandardDisplayText: optionalString(input.contentStandardDisplayText),
    contentStandardSortOrder: integer(input.contentStandardSortOrder, "contentStandardSortOrder", row),
    indicatorCode: requiredString(input.indicatorCode, "indicatorCode", row),
    indicatorText: requiredString(input.indicatorText, "indicatorText", row),
    indicatorDisplayText: optionalString(input.indicatorDisplayText),
    indicatorSortOrder: integer(input.indicatorSortOrder, "indicatorSortOrder", row, 0)!,
    bloomsLevel: (bloom as BloomsLevel | undefined) ?? null,
    guidance,
    exemplars,
  };
}

function validateManifest(value: unknown): CurriculumImportManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { schemaVersion: "1", releaseStatus: "draft", documents: [] };
  }
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== undefined && input.schemaVersion !== "1") {
    throw new Error(`Unsupported manifest schemaVersion "${String(input.schemaVersion)}"`);
  }
  if (
    input.releaseStatus !== undefined &&
    input.releaseStatus !== "draft" &&
    input.releaseStatus !== "approved"
  ) {
    throw new Error(`Unsupported manifest releaseStatus "${String(input.releaseStatus)}"`);
  }
  const documents = Array.isArray(input.documents) ? input.documents : [];
  const manifest: CurriculumImportManifest = {
    schemaVersion: "1",
    releaseStatus: input.releaseStatus === "approved" ? "approved" : "draft",
    documents: documents.map((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Manifest document ${index + 1}: expected an object`);
      }
      const document = value as Record<string, unknown>;
      const sha256 = requiredString(document.sha256, "document.sha256", index + 1).toUpperCase();
      if (!/^[A-F0-9]{64}$/.test(sha256)) {
        throw new Error(`Manifest document ${index + 1}: sha256 must contain 64 hexadecimal characters`);
      }
      return {
        organization: requiredString(document.organization, "document.organization", index + 1),
        title: requiredString(document.title, "document.title", index + 1),
        publicationDate: optionalString(document.publicationDate),
        version: requiredString(document.version, "document.version", index + 1),
        sourceUrl: requiredString(document.sourceUrl, "document.sourceUrl", index + 1),
        coverage: requiredString(document.coverage, "document.coverage", index + 1),
        sha256,
        extractionVersion: requiredString(document.extractionVersion, "document.extractionVersion", index + 1),
      };
    }),
  };
  const hashes = new Set<string>();
  for (const document of manifest.documents) {
    if (hashes.has(document.sha256)) {
      throw new Error(`Manifest contains duplicate document sha256 ${document.sha256}`);
    }
    hashes.add(document.sha256);
  }
  return manifest;
}

function validateRecords(values: unknown[], rowOffset: number) {
  const records: CurriculumImportRecord[] = [];
  const errors: string[] = [];
  values.forEach((value, index) => {
    try {
      records.push(validateRecord(value, index + rowOffset));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  });
  if (errors.length > 0) {
    throw new Error(`Import validation failed:\n- ${errors.join("\n- ")}`);
  }
  return records;
}

function validateImport(manifest: CurriculumImportManifest, records: CurriculumImportRecord[]) {
  if (records.length === 0) throw new Error("Import contains no records");
  const versions = new Set(records.map((record) => `${record.curriculumSlug}\0${record.version}`));
  if (versions.size !== 1) throw new Error("Import must contain exactly one curriculum release");
  const documentHashes = new Set(manifest.documents.map((document) => document.sha256));
  for (const [index, record] of records.entries()) {
    if (record.documentSha256 && !documentHashes.has(record.documentSha256)) {
      throw new Error(`Row ${index + 1}: documentSha256 is not declared in the manifest`);
    }
  }
}

export function parseCurriculumJsonImport(content: string): ParsedCurriculumImport {
  const parsed: unknown = JSON.parse(content);
  const root = !Array.isArray(parsed) && parsed && typeof parsed === "object"
    ? parsed as Record<string, unknown>
    : null;
  const values = Array.isArray(parsed) ? parsed : root?.records;
  if (!Array.isArray(values)) {
    throw new Error("JSON import must be an array or an object with a records array");
  }
  const result = {
    manifest: validateManifest(root?.manifest),
    records: validateRecords(values, 1),
  };
  validateImport(result.manifest, result.records);
  return result;
}

export function parseCurriculumCsvImport(content: string): ParsedCurriculumImport {
  const values = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];
  const result = {
    manifest: validateManifest(undefined),
    records: validateRecords(values, 2),
  };
  validateImport(result.manifest, result.records);
  return result;
}

export const parseCurriculumJson = (content: string) => parseCurriculumJsonImport(content).records;
export const parseCurriculumCsv = (content: string) => parseCurriculumCsvImport(content).records;
