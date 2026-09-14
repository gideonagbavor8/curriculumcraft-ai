import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSchemeRows, detectColumnMapping, looksLikeHeaderRow } from "../lib/schemeImport/normalizeRows";

const HEADER = ["WEEK", "STRAND", "SUBSTRAND", "CONTENT STANDARD", "INDICATORS"];

test("detects the header row and maps columns by keyword, order-independent", () => {
  assert.deepEqual(detectColumnMapping(HEADER), [
    "week",
    "strand",
    "subStrand",
    "contentStandard",
    "indicators",
  ]);
  assert.equal(looksLikeHeaderRow(HEADER), true);
  assert.equal(looksLikeHeaderRow(["1", "Number", "Counting", "B4.1.1.1 ...", "B4.1.1.1.1 ..."]), false);
});

test("carries forward blank Strand/Sub-strand/Content Standard cells across weeks", () => {
  const { weeks, warnings } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "STRAND 1: NUMBER", "Sub-strand 1", "B4.1.1.1 Demonstrate understanding", "B4.1.1.1.1 Model numbers"] },
    { cells: ["2", "", "", "B4.1.1.2 Roman numerals", "B4.1.1.2.1 Develop Roman numerals"] },
    { cells: ["3", "", "", "", "B4.1.1.2.2 Continuation indicator"] },
  ]);

  assert.equal(weeks.length, 3);
  assert.equal(weeks[1].strandText, "STRAND 1: NUMBER");
  assert.equal(weeks[1].subStrandText, "Sub-strand 1");
  assert.equal(weeks[2].strandText, "STRAND 1: NUMBER");
  assert.equal(weeks[2].contentStandardCode, "B4.1.1.2");
  assert.equal(weeks[2].contentStandardText, "Roman numerals");
  assert.equal(warnings.length, 0);
});

test("does not splice a carried-forward code onto a row that has its own (code-less) text", () => {
  const { weeks, warnings } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "Number", "Sub-strand", "B4.1.2.1 Recall facts", "B4.1.2.1.1 Determine facts"] },
    { cells: ["2", "", "", "Describe and apply strategies (no code in source)", "B4.1.2.2.1 Apply strategies"] },
  ]);

  assert.equal(weeks[1].contentStandardCode, undefined);
  assert.equal(weeks[1].contentStandardText, "Describe and apply strategies (no code in source)");
  assert.ok(warnings.some((w) => w.includes("had no code in the source")));
});

test("detects non-teaching weeks (Revision / Examinations) and excludes them from indicators", () => {
  const { weeks } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "Number", "Sub-strand", "B4.1.1.1 Standard", "B4.1.1.1.1 Indicator"] },
    { cells: ["13", "REVISION"] },
    { cells: ["14", "END OF FIRST TERM EXAMINATIONS"] },
  ]);

  assert.equal(weeks[1].isNonTeachingWeek, true);
  assert.equal(weeks[1].nonTeachingLabel, "REVISION");
  assert.equal(weeks[2].isNonTeachingWeek, true);
  assert.equal(weeks[2].nonTeachingLabel, "END OF FIRST TERM EXAMINATIONS");
  assert.deepEqual(weeks[2].indicators, []);
});

test("splits multiple indicators per week, normalising a stray space in the code and a leading typo character", () => {
  const { weeks } = normalizeSchemeRows(HEADER, [
    {
      cells: [
        "1",
        "Number",
        "Sub-strand",
        "B4.1.1.1 Standard",
        "B4.1.1.1.1 First indicator\nB4. 1.1.1.2 Second indicator with spaced code\nB B4.1.1.1.3 Third with stray prefix",
      ],
    },
  ]);

  assert.equal(weeks[0].indicators.length, 3);
  assert.equal(weeks[0].indicators[0].code, "B4.1.1.1.1");
  // The space is tolerated when finding the code but stripped from the stored
  // value - "B4. 1.1.1.2" would never match the curriculum database.
  assert.equal(weeks[0].indicators[1].code, "B4.1.1.1.2");
  assert.equal(weeks[0].indicators[2].code, "B4.1.1.1.3");
});

test("expands a 'CODE1 - CODE2' indicator range into two entries", () => {
  const { weeks } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "Number", "Sub-strand", "B7.1.1.1 Standard", "B7.1.1.1.2 \u2014 B7.1.1.1.3 covers two indicators"] },
  ]);

  assert.equal(weeks[0].indicators.length, 2);
  assert.equal(weeks[0].indicators[0].code, "B7.1.1.1.2");
  assert.equal(weeks[0].indicators[1].code, "B7.1.1.1.3");
});

test("guesses a sequential week number and warns when a row has no readable week number", () => {
  const { weeks, warnings } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "Number", "Sub-strand", "B4.1.1.1 Standard", "B4.1.1.1.1 Indicator"] },
    { cells: ["", "Number", "Sub-strand", "B4.1.1.2 Standard", "B4.1.1.2.1 Indicator"] },
  ]);

  assert.equal(weeks[1].weekNumber, 2);
  assert.ok(warnings.some((w) => w.includes("no readable week number")));
});

test("maps a 'SUB- STRAND' header (dash and space) to the Sub-strand column, not the Strand column", () => {
  assert.deepEqual(detectColumnMapping(["WEEK", "SUB- STRAND", "CONTENT STANDARDS", "INDICATORS"]), [
    "week",
    "subStrand",
    "contentStandard",
    "indicators",
  ]);
});

test("rejects a data row that merely mentions strand keywords as a header row", () => {
  // Real Science scheme row - two column keywords appear in it, but it is
  // data. Treating it as a header used to split the table and re-anchor
  // every column onto the wrong position.
  assert.equal(
    looksLikeHeaderRow([
      "1",
      "STRAND 1: DIVERSITY OF MATTER",
      "Sub-Strand 1: Living and Non-Living Things",
      "B4.1.1.1 Understand the physical features of living things",
      "B4.1.1.1.1 Classify animals into insects, birds, mammals and reptiles",
    ]),
    false
  );
});

test("ignores an implausible week number left behind by a running page header", () => {
  // "2026/2027 Academic Year" prints in the page margin at the same X as the
  // Week column, so it lands in the week cell of whatever row it sits beside.
  const { weeks, warnings } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "Number", "Counting", "B4.1.1.1 Understand", "B4.1.1.1.1 Model numbers"] },
    { cells: ["2026/2027", "", "", "", "B4.1.1.1.2 Count in tens"] },
  ]);

  assert.deepEqual(weeks.map((w) => w.weekNumber), [1, 2]);
  assert.ok(warnings.some((w) => w.includes("no readable week number")));
});

test("reassembles a Strand value that wrapped across several rows of a PDF", () => {
  // A merged Strand cell spanning weeks 1-3 prints down the page beside
  // different weeks' rows, so its fragments arrive on different rows.
  const { weeks } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "STRAND 1:\nDIVERSITY", "Sub-Strand 1 :\nLiving and Non-", "B4.1.1.1 Understand", "B4.1.1.1.1 Classify animals"] },
    { cells: ["2", "OF\nMATTER", "Living Things", "", "B4.1.1.1.2 Know life processes"] },
    { cells: ["3", "", "", "", "B4.1.1.2.2 Describe plants"] },
  ]);

  for (const week of weeks) {
    assert.equal(week.strandText, "STRAND 1: DIVERSITY OF MATTER");
    assert.equal(week.subStrandText, "Sub-Strand 1 : Living and Non-Living Things");
  }
});

test("leaves plainly named strands alone - one per row, never stitched together", () => {
  // This scheme labels nothing "STRAND n", so no cell can be a wrapped
  // continuation and each row keeps the strand it names.
  const { weeks } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "Number", "Counting", "B4.1.1.1 Understand", "B4.1.1.1.1 Model numbers"] },
    { cells: ["2", "Algebra", "Patterns", "B4.2.1.1 Recognise", "B4.2.1.1.1 Extend patterns"] },
  ]);

  assert.deepEqual(weeks.map((w) => w.strandText), ["Number", "Algebra"]);
});

test("drops the punctuation stranded in front of a statement once its code is split off", () => {
  // Real scheme wording: "B4.1.1.1: Demonstrate ..." and an indicator code
  // typed with a trailing dot. Left in, the lesson plan prints "B4.1.1.1: :".
  const { weeks } = normalizeSchemeRows(HEADER, [
    { cells: ["1", "Oral Language", "Songs", "B4.1.1.1: Demonstrate understanding of songs", "B4.1.1.1.1. Listen attentively to songs"] },
  ]);

  assert.equal(weeks[0].contentStandardCode, "B4.1.1.1");
  assert.equal(weeks[0].contentStandardText, "Demonstrate understanding of songs");
  assert.equal(weeks[0].indicators[0].code, "B4.1.1.1.1");
  assert.equal(weeks[0].indicators[0].text, "Listen attentively to songs");
});
