import assert from "node:assert/strict";
import test from "node:test";
import { FEEDBACK_TYPES, getFeedbackFields } from "../lib/feedback";

test("all five feedback categories map to existing form questions", () => {
  assert.equal(FEEDBACK_TYPES.length, 5);
  for (const category of FEEDBACK_TYPES) {
    assert.deepEqual(getFeedbackFields(category.id, "  Useful feedback  "), {
      entry: category.entry,
      value: `[${category.label}]\n\nUseful feedback`,
    });
    assert.match(category.entry, /^entry\.\d+$/);
  }
  assert.equal(getFeedbackFields("problem", "Problem").entry, "entry.6577081");
  assert.equal(getFeedbackFields("feature", "Idea").entry, "entry.806585065");
  assert.equal(getFeedbackFields("experience", "Helpful").entry, "entry.499980226");
});

test("feedback fields enforce non-empty bounded messages", () => {
  assert.throws(() => getFeedbackFields("general", "  "), /between/);
  assert.throws(() => getFeedbackFields("general", "a".repeat(2001)), /between/);
  assert.ok(getFeedbackFields("general", "a".repeat(2000)).value);
});
