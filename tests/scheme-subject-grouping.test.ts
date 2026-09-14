import assert from "node:assert/strict";
import test from "node:test";
import { groupSectionsBySubject, weeksWithStrandHint } from "../lib/schemeImport/groupSubjects";
import { classifyHeading, splitHeadings, displayStrandLabel } from "../lib/schemeImport/headings";
import type { ParsedSchemeSection } from "../lib/schemeImport/types";
import type { NormalizedSchemeWeek } from "../lib/schemeImport/normalizeRows";

const CATALOG = [
  { slug: "english-language", name: "English Language" },
  { slug: "mathematics", name: "Mathematics" },
  { slug: "history", name: "History" },
  { slug: "history-of-ghana", name: "History of Ghana" },
];

function week(weekNumber: number, strandText?: string): NormalizedSchemeWeek {
  return { weekNumber, isNonTeachingWeek: false, strandText, rawRowText: "", indicators: [] };
}

function section(
  subjectHint: string | null,
  strandHint: string | null,
  weeks: NormalizedSchemeWeek[] = [week(1)]
): ParsedSchemeSection {
  return { subjectHint, strandHint, weeks };
}

test("a table headed only by a strand continues the subject above it", () => {
  const groups = groupSectionsBySubject(
    [
      section("BASIC 4 - ENGLISH LANGUAGE - FIRST TERM", "STRAND 1: ORAL LANGUAGE"),
      section(null, "STRAND 2: READING"),
      section(null, "STRAND 3: WRITING"),
      section("BASIC 4 - MATHEMATICS - FIRST TERM", null),
    ],
    CATALOG
  );

  assert.deepEqual(
    groups.map((g) => g.resolved.slug),
    ["english-language", "mathematics"]
  );
  assert.equal(groups[0].sections.length, 3, "all three English strand tables belong to one subject");
});

test("consecutive tables naming the same subject merge into one subject", () => {
  const groups = groupSectionsBySubject(
    [
      section("BASIC 4 - MATHEMATICS - FIRST TERM", null),
      section("BASIC 4 - MATHEMATICS - FIRST TERM", null),
    ],
    CATALOG
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].sections.length, 2);
});

test("the longest matching subject name wins, so 'History of Ghana' beats 'History'", () => {
  const [group] = groupSectionsBySubject([section("BASIC 4 - HISTORY OF GHANA - FIRST TERM", null)], CATALOG);
  assert.equal(group.resolved.slug, "history-of-ghana");
});

test("an unmatched subject heading keeps its own name, without the grade/term scaffolding", () => {
  const [group] = groupSectionsBySubject([section("BASIC 4 - GHANAIAN LANGUAGE - FIRST TERM", null)], CATALOG);
  assert.equal(group.resolved.slug, null);
  assert.equal(group.resolved.label, "Ghanaian Language");
});

test("a table's strand heading fills in the strand for weeks whose table had no Strand column", () => {
  const weeks = weeksWithStrandHint(
    section(null, "STRAND 2: READING", [week(1), week(2, "Already has its own strand")])
  );
  assert.equal(weeks[0].strandText, "STRAND 2: READING");
  assert.equal(weeks[1].strandText, "Already has its own strand", "a Strand column always wins over the heading");
});

test("headings are classified as subject candidates, strands, or page-break noise", () => {
  assert.equal(classifyHeading("BASIC 4 - ENGLISH LANGUAGE - FIRST TERM"), "candidate");
  assert.equal(classifyHeading("STRAND 1: ORAL LANGUAGE"), "strand");
  assert.equal(classifyHeading("Sub-Strand 2: Materials"), "strand");
  // Wrapped fragments left over from the previous page.
  assert.equal(classifyHeading("separating them into their components"), "noise");
  assert.equal(classifyHeading("of Ghana"), "noise");
  assert.equal(classifyHeading("B4.1.5.4.1 : Decrire sa famille nucleaire"), "noise");
});

test("splitHeadings picks the nearest subject and strand heading and drops the rest", () => {
  assert.deepEqual(
    splitHeadings(["oral tradition, wall paintings etc.", "BASIC 4 - ENGLISH LANGUAGE - FIRST TERM", "STRAND 1: ORAL LANGUAGE"]),
    { subjectHint: "BASIC 4 - ENGLISH LANGUAGE - FIRST TERM", strandHint: "STRAND 1: ORAL LANGUAGE" }
  );
  assert.deepEqual(splitHeadings(["STRAND 2: READING"]), { subjectHint: null, strandHint: "STRAND 2: READING" });
  assert.deepEqual(splitHeadings([]), { subjectHint: null, strandHint: null });
});

test("strand labels render for a dropdown without the shouting or the redundant prefix", () => {
  assert.equal(displayStrandLabel("STRAND 1: ORAL LANGUAGE"), "1. Oral Language");
  assert.equal(displayStrandLabel("Sub-Strand 2: Materials"), "2. Materials");
  assert.equal(displayStrandLabel("Sub-Strand 1 : Living and Non-Living Things"), "1. Living and Non-Living Things");
  assert.equal(displayStrandLabel("Number"), "Number", "a plainly named strand is left alone");
});
