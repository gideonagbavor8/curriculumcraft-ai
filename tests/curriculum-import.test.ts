import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCurriculumCsvImport,
  parseCurriculumJsonImport,
} from "../lib/curriculum/import";

const baseRecord = {
  curriculumSlug: "ghana-nacca-sbc",
  curriculumName: "Ghana NaCCA Standards-Based Curriculum",
  countryCode: "GH",
  authority: "NaCCA",
  version: "primary-test-1",
  levelCode: "PRIMARY",
  levelName: "Primary",
  gradeCode: "B1",
  gradeName: "Basic 1",
  gradeAliases: ["P1"],
  gradeSortOrder: 1,
  subjectSlug: "mathematics",
  subjectName: "Mathematics",
  strandName: "Number",
  subStrandName: "Counting",
  indicatorCode: "B1.1.1.1",
  indicatorText: "Count objects.",
};

const document = {
  organization: "NaCCA",
  title: "Official curriculum",
  version: "2019",
  sourceUrl: "https://example.edu/curriculum.pdf",
  coverage: "B1 Mathematics",
  sha256: "A".repeat(64),
  extractionVersion: "extractor-1",
};

test("parses manifest imports without invented Bloom or exemplar codes", () => {
  const parsed = parseCurriculumJsonImport(JSON.stringify({
    manifest: { schemaVersion: "1", releaseStatus: "draft", documents: [document] },
    records: [{
      ...baseRecord,
      documentSha256: document.sha256,
      contentStandardCode: "B1.1.1.1",
      contentStandardText: "Demonstrate understanding of counting.",
      exemplars: [{ text: "Count bottle tops.", sortOrder: 1 }],
      guidance: [{ kind: "note", text: "Use local objects.", sortOrder: 1 }],
    }],
  }));

  assert.equal(parsed.records[0].bloomsLevel, null);
  assert.equal(parsed.records[0].exemplars[0].code, undefined);
  assert.equal(parsed.records[0].exemplars[0].revision, baseRecord.version);
  assert.deepEqual(parsed.records[0].gradeAliases, ["P1"]);
});

test("keeps legacy JSON arrays compatible", () => {
  const parsed = parseCurriculumJsonImport(JSON.stringify([{ ...baseRecord, bloomsLevel: "Apply" }]));
  assert.equal(parsed.manifest.releaseStatus, "draft");
  assert.equal(parsed.records[0].bloomsLevel, "Apply");
});

test("parses CSV with an omitted Bloom level", () => {
  const csv = [
    "curriculumSlug,curriculumName,countryCode,authority,version,levelCode,levelName,gradeCode,gradeName,gradeAliases,gradeSortOrder,subjectSlug,subjectName,strandName,subStrandName,indicatorCode,indicatorText,bloomsLevel",
    "ghana-nacca-sbc,Ghana NaCCA SBC,GH,NaCCA,primary-test-1,PRIMARY,Primary,B1,Basic 1,P1,1,mathematics,Mathematics,Number,Counting,B1.1.1.1,Count objects.,",
  ].join("\n");
  const parsed = parseCurriculumCsvImport(csv);
  assert.equal(parsed.records[0].bloomsLevel, null);
});

test("reports validation failures from every invalid row", () => {
  assert.throws(
    () => parseCurriculumJsonImport(JSON.stringify([
      { ...baseRecord, indicatorCode: "" },
      { ...baseRecord, gradeSortOrder: -1 },
    ])),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.match(error.message, /Row 1: indicatorCode is required/);
      assert.match(error.message, /Row 2: gradeSortOrder must be a non-negative integer/);
      return true;
    }
  );
});

test("rejects empty imports and undeclared provenance documents", () => {
  assert.throws(() => parseCurriculumJsonImport("[]"), /contains no records/);
  assert.throws(
    () => parseCurriculumJsonImport(JSON.stringify({
      manifest: { schemaVersion: "1", releaseStatus: "draft", documents: [document] },
      records: [{ ...baseRecord, documentSha256: "B".repeat(64) }],
    })),
    /documentSha256 is not declared/
  );
});
