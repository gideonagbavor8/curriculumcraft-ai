import assert from "node:assert/strict";
import test from "node:test";
import { buildLessonPlanTable, cellRuns, codeOrFullText, indicatorsCell } from "../lib/lessonPlanTable";
import type { LessonHeader } from "../types/curriculum";

const HEADER: LessonHeader = {
  curriculumSlug: "ghana-nacca-sbc",
  levelName: "Primary",
  subject: "Mathematics",
  gradeName: "Basic 4",
  grade: "B4",
  classSize: "52",
  duration: "70",
  strand: "Number",
  subStrand: "Counting",
  contentStandardCode: "B4.1.1.1",
  contentStandardText: "Demonstrate understanding of quantities",
  indicatorCode: "B4.1.1.1.1",
  indicatorText: "Model number quantities up to 1000",
  reference: "Ghana NaCCA Standards-Based Curriculum (2019)",
  day: "Tuesday",
  lessonDate: "16 Sept 2026",
  keywords: "ones, tens, hundreds",
  performanceIndicator: "Learners can model numbers to 1000.",
  coreCompetencies: "**Critical Thinking:** Learners reason about place value.",
};

test("lays the lesson out as the GES/NaCCA table bands, in order", () => {
  const table = buildLessonPlanTable(HEADER, [
    { phase: "Starter", time: "5 mins", learnerActivity: "Ask learners to count in tens.", resources: "Bottle tops" },
  ]);

  assert.deepEqual(
    table.identity.cells.map((c) => c.label),
    ["Date", "Day", "Time", "Class", "Class Size", "Subject", "Strand", "Sub-Strand"]
  );
  assert.deepEqual(table.curriculum.cells.map((c) => c.label), ["Content Standard", "Indicators", "References"]);
  assert.equal(table.keywords.label, "Keywords");
  assert.deepEqual(table.standards.cells.map((c) => c.label), ["Performance Standards", "Core Competencies"]);
  assert.equal(table.phases.length, 1);
});

test("carries the teacher's own class size and duration, not a preset", () => {
  const table = buildLessonPlanTable(HEADER, []);
  assert.equal(table.identity.cells.find((c) => c.label === "Time")?.value, "70 minutes");
  assert.equal(table.identity.cells.find((c) => c.label === "Class Size")?.value, "52");
  assert.equal(table.identity.cells.find((c) => c.label === "Date")?.value, "16 Sept 2026");
  assert.equal(table.identity.cells.find((c) => c.label === "Day")?.value, "Tuesday");
});

test("prints only the code once a curriculum statement is too long for its cell", () => {
  const short = codeOrFullText("B4.1.1.1", "Demonstrate understanding of quantities");
  assert.equal(short, "B4.1.1.1: Demonstrate understanding of quantities");

  const long = codeOrFullText("B4.1.1.1", "x".repeat(200));
  assert.equal(long, "B4.1.1.1", "a teacher reads the full wording from the scheme against the code");
});

test("a day covering several indicators collapses to codes rather than overflowing", () => {
  const few = indicatorsCell([{ code: "B4.1.1.1.1", text: "Model number quantities" }]);
  assert.ok(few.includes("Model number quantities"));

  const many = indicatorsCell([
    { code: "B4.1.1.1.1", text: "x".repeat(80) },
    { code: "B4.1.1.1.2", text: "y".repeat(80) },
  ]);
  assert.equal(many, "B4.1.1.1.1, B4.1.1.1.2");
});

test("cell text carries its emphasis as runs, so no asterisks reach the printed plan", () => {
  const runs = cellRuns("**Critical Thinking:** Learners reason about place value.");
  assert.deepEqual(
    runs.map((run) => run.kind),
    ["bold", "text"]
  );
  assert.equal(runs[0].text, "Critical Thinking:");
  assert.ok(!runs.map((r) => r.text).join("").includes("*"));
});

test("a phase with no materials of its own falls back to the lesson's resources", () => {
  const table = buildLessonPlanTable(
    { ...HEADER, teachingLearningResources: "Counters, chalkboard" },
    [{ phase: "Plenary", time: "5 mins", learnerActivity: "Ask learners to recap.", resources: "" }]
  );
  assert.equal(table.phases[0].resources, "Counters, chalkboard");
});
