import assert from "node:assert/strict";
import test from "node:test";
import { distributeIndicatorsAcrossDays } from "../lib/schemeImport/distributeDays";

test("splits indicators evenly across days, extra remainder to earlier days", () => {
  const plan = distributeIndicatorsAcrossDays(["a", "b", "c", "d", "e", "f"], 5);
  assert.equal(plan.length, 5);
  assert.deepEqual(plan.map((d) => d.indicators.length), [2, 1, 1, 1, 1]);
  assert.equal(plan.every((d) => !d.isPracticeDay), true);
});

test("gives every day at least one indicator when there are fewer days than indicators", () => {
  const plan = distributeIndicatorsAcrossDays(["a", "b", "c"], 3);
  assert.deepEqual(plan.map((d) => d.indicators), [["a"], ["b"], ["c"]]);
});

test("backfills extra days with the previous day's indicators as a practice day when there are more days than indicators", () => {
  const plan = distributeIndicatorsAcrossDays(["a", "b"], 5);
  assert.deepEqual(plan.map((d) => d.indicators), [["a"], ["b"], ["b"], ["b"], ["b"]]);
  assert.deepEqual(plan.map((d) => d.isPracticeDay), [false, false, true, true, true]);
});

test("handles a week with zero indicators by marking every day a practice day", () => {
  const plan = distributeIndicatorsAcrossDays([], 3);
  assert.equal(plan.length, 3);
  assert.equal(plan.every((d) => d.isPracticeDay && d.indicators.length === 0), true);
});
