import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The extractor reads JHS_SOURCE_DIR at import time, so the fixture directory
// is created and pointed at before the module is loaded.
const fixtureDir = mkdtempSync(join(tmpdir(), "jhs-ccp-fixture-"));
process.env.JHS_SOURCE_DIR = fixtureDir;

type Extractor = typeof import("../db/extract-jhs-ccp");
let extractor: Extractor;
test.before(async () => {
  extractor = await import("../db/extract-jhs-ccp");
});

// ---------------------------------------------------------------------------
// Code normalisation - every typography the twelve books use
// ---------------------------------------------------------------------------

test("normalises every numbering typography the CCP books use", () => {
  const { parseCode } = extractor;
  const cases: [string, string, boolean][] = [
    ["B7.1.1.1.1 Model number quantities", "B7.1.1.1.1", true],
    ["B7 1.1.1.1: Explain the nature of God", "B7.1.1.1.1", true],
    ["B7/JHS1.1.1.1.1. Examine ways of dealing with sanitation", "B7.1.1.1.1", true],
    ["B9. 2.1.1", "B9.2.1.1", false],
    ["B7 1.1.1: Explain the nature of God", "B7.1.1.1", false],
    ["B8/JHS2.3.2.1.", "B8.3.2.1", false],
    ["• B9.1.2.1.2. Initiate and participate", "B9.1.2.1.2", true],
    ["‫‪B8.4.1.1.4. Demonstrate knowledge", "B8.4.1.1.4", true],
  ];
  for (const [cell, code, isIndicator] of cases) {
    const parsed = parseCode(cell);
    assert.ok(parsed, `should parse ${JSON.stringify(cell)}`);
    assert.equal(parsed.code, code);
    assert.equal(parsed.indicator !== undefined, isIndicator, `${code} indicator?`);
  }
});

test("a reference quoted mid-sentence is not a new row", () => {
  assert.equal(extractor.parseCode("as covered under B7.1.2.1.1 earlier"), null);
});

test("a run of spaces before an exemplar number does not become a fifth part", () => {
  // "B8/JHS2.3.2.1.            6." - a standard beside its sixth exemplar.
  const parsed = extractor.parseCode("B8/JHS2.3.2.1.            6. Identify a specific need");
  assert.ok(parsed);
  assert.equal(parsed.code, "B8.3.2.1");
  assert.equal(parsed.indicator, undefined);
});

test("a six-part reference is kept as five parts and marked malformed", () => {
  const parsed = extractor.parseCode("B9.5.1.2.2.2: Draw objects in first and third angle");
  assert.ok(parsed);
  assert.equal(parsed.code, "B9.5.1.2.2");
  assert.equal(parsed.malformed, "B9.5.1.2.2.2");
});

// ---------------------------------------------------------------------------
// Whole-table extraction against a fixture in the CCP layout
// ---------------------------------------------------------------------------

/** A short book in the CCP layout, exercising the conventions that tripped the first passes. */
const FIXTURE = [
  "THE FRONT MATTER",
  "A unique annotation is used. Example: B7.1.2.3.1",
  "                   B7.1.1.1.1        Learning indicator",
  "\f                       STRAND 1: NUMBER",
  "                Sub-strand 1: Number and Numeration Systems",
  "",
  "CONTENT STANDARD INDICATORS AND EXEMPLARS                                      CORE COMPETENCIES",
  "",
  "B7.1.1.1 Demonstrate     B7.1.1.1.1 Model number quantities more than             Critical Thinking and",
  "understanding of place        1,000,000,000 using graph sheets                     Problem Solving (CP)",
  "value                    E.g.,1. Model number quantities up to one billion         CP 5.1: Ability to combine",
  "                              using multi-base blocks.",
  "                                      i. Determine how many blocks make a billion.",
  "                         E.g.2. Use multiples of 10s and 50s to represent numbers",
  "",
  "                         B7.1.1.1.2 Compare and order whole numbers                Communication and",
  "                         Exemplars:                                                Collaboration (CC)",
  "                         1. Use place value to compare numbers.",
  "                         2. Order a set of numbers in ascending order.",
  "\fCONTENT STANDARD         SUB-STRAND 2.: FRACTIONS                                 CORE COMPETENCIES",
  "",
  "B7.1.2.1 Apply           B7.1.2.1.1 Determine the LCM of two numbersExemplar(s):   CI 6.1",
  "fractions                1. Find the LCM of 4 and 6",
  "                              • Use a listing method",
  "                              • Use prime factorisation",
  "\f                         B7.1.2.1.1 Determine the LCM of two numbers",
  "                         Exemplars:",
  "                         2. Solve word problems on LCM",
  "\f                         B7.1.2.1.2 Apply the LCM in real life",
  "                         B7.1.2.1.2 Compare fractions using the LCM",
  "",
].join("\n");

test("extracts the hierarchy, standards, indicators and exemplars from the CCP layout", () => {
  writeFileSync(join(fixtureDir, "fixture.txt"), FIXTURE);
  writeFileSync(join(fixtureDir, "fixture.pdf"), "%PDF-fixture");
  const subject = { key: "fixture", subjectSlug: "fixture", subjectName: "Fixture", subjectSortOrder: 99, title: "FIXTURE", sourceUrl: "https://example.test/fixture.pdf" };
  const { records, report } = extractor.extractSubject(subject);

  const codes = records.map((r) => r.indicatorCode);
  // The front-matter example and annotation are not indicators; the body's
  // four rows are, with the mis-numbered pair kept apart.
  assert.deepEqual(codes, ["B7.1.1.1.1", "B7.1.1.1.2", "B7.1.2.1.1", "B7.1.2.1.2", "B7.1.2.1.2-2"]);

  const first = records[0];
  assert.equal(first.gradeCode, "B7");
  assert.equal(first.strandName, "Number");
  assert.equal(first.subStrandName, "Number and Numeration Systems");
  assert.equal(first.contentStandardCode, "B7.1.1.1");
  assert.equal(first.contentStandardText, "Demonstrate understanding of place value");
  assert.equal(first.indicatorText, "Model number quantities more than 1,000,000,000 using graph sheets");
  // Mathematics' "E.g.,1." exemplars, with the roman sub-point folded in and
  // its marker kept - "i." is how the book enumerates the step.
  assert.equal(first.exemplars.length, 2);
  assert.equal(
    first.exemplars[0].text,
    "Model number quantities up to one billion using multi-base blocks. i. Determine how many blocks make a billion."
  );
  assert.equal(first.exemplars[1].text, "Use multiples of 10s and 50s to represent numbers");
  assert.equal(first.extractionConfidence, "high");
  assert.equal(first.reviewStatus, "pending");
  // Core competencies ride along as guidance.
  assert.ok(first.guidance.some((g) => /CP 5\.1/.test(g.text)));

  // Heading merged onto the header line, with a trailing "2.:" number form.
  const lcm = records[2];
  assert.equal(lcm.subStrandName, "Fractions");
  // A glued "Exemplar(s):" marker, bullets nested under a numbered exemplar,
  // and a page-break repeat whose exemplars fold into the original.
  assert.equal(lcm.indicatorText, "Determine the LCM of two numbers");
  assert.deepEqual(lcm.exemplars.map((e) => e.text), [
    "Find the LCM of 4 and 6 Use a listing method Use prime factorisation",
    "Solve word problems on LCM",
  ]);

  // The document reused B7.1.2.1.2 for two different rows: both survive,
  // the second under a suffix, flagged with a reason.
  const reused = records[4];
  assert.equal(reused.reviewStatus, "needs-review");
  assert.equal(reused.ambiguityFlag, true);
  assert.match(reused.sourceReference, /reuses indicator number B7\.1\.2\.1\.2/);
  assert.deepEqual(report.duplicateCodes, ["B7.1.2.1.2"]);
  assert.equal(report.needsReview, 1);
});

test("every record carries provenance back to the source document", () => {
  const subject = { key: "fixture", subjectSlug: "fixture", subjectName: "Fixture", subjectSortOrder: 99, title: "FIXTURE", sourceUrl: "https://example.test/fixture.pdf" };
  const { records, sha256 } = extractor.extractSubject(subject);
  assert.match(sha256, /^[0-9A-F]{64}$/);
  for (const record of records) {
    assert.equal(record.documentSha256, sha256);
    assert.ok(record.pdfPage >= 1);
    assert.ok(record.rawSourceText.length > 0, `${record.indicatorCode} keeps its raw source text`);
    assert.equal(record.version, "2021-ccp-jhs-fixture");
    assert.equal(record.levelCode, "JHS");
    assert.equal(record.bloomsLevel, null, "the CCP books do not state Bloom levels, so none is invented");
  }
});

test("peels a competency name glued to the indicator text and opens exemplars on an undotted E.g.N", () => {
  // English prints the right column one space after the middle text; Mathematics
  // writes "E.g.1 Round" with no dot after the digit, sometimes mid-line.
  const lines = [
    "                       STRAND 1: ORAL LANGUAGE",
    "                Sub-strand 1: Conversation",
    "CONTENT STANDARD INDICATORS AND EXEMPLARS                                                        CORE COMPETENCIES",
    "B7.1.1.1 Demonstrate     B7.1.1.1.5. Use techniques (voice modulation and eye contact) Communication and Collaboration",
    "use of language          for effective oral communication",
    "                         • Converse using appropriate voice (pace, volume, tone, stress) e.g. Personal Development and Leadership",
    "                               word and sentence stress.",
    "                                                                                                  Digital Literacy",
    "                         • Maintain eye contact.                                                  Presentation",
    "",
    "B7.1.1.2 Round           B7.1.1.2.1 Round decimals when  E.g.1 Round (off, up and down) decimals to the nearest",
    "quantities                     tenths, hundredths, thousandths",
    "                         E.g.2 Explain when zero is significant in a decimal numeral",
    "",
  ].join("\n");
  writeFileSync(join(fixtureDir, "glued.txt"), lines);
  writeFileSync(join(fixtureDir, "glued.pdf"), "%PDF-fixture");
  const subject = { key: "glued", subjectSlug: "glued", subjectName: "Glued", subjectSortOrder: 98, title: "GLUED", sourceUrl: "https://example.test/glued.pdf" };
  const { records } = extractor.extractSubject(subject);
  assert.deepEqual(records.map((r) => r.indicatorCode), ["B7.1.1.1.5", "B7.1.1.2.1"]);

  const [voice, round] = records;
  assert.equal(voice.indicatorText, "Use techniques (voice modulation and eye contact) for effective oral communication");
  assert.deepEqual(voice.exemplars.map((e) => e.text), [
    "Converse using appropriate voice (pace, volume, tone, stress) e.g. word and sentence stress.",
    "Maintain eye contact.",
  ]);
  const competencies = voice.guidance.map((g) => g.text).join(" | ");
  assert.match(competencies, /Communication and Collaboration/);
  assert.match(competencies, /Personal Development and Leadership/);

  assert.equal(round.indicatorText, "Round decimals when");
  assert.deepEqual(round.exemplars.map((e) => e.text), [
    "Round (off, up and down) decimals to the nearest tenths, hundredths, thousandths",
    "Explain when zero is significant in a decimal numeral",
  ]);
});
