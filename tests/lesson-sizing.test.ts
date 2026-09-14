import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidDuration,
  isValidClassSize,
  resolveDuration,
  resolveClassSize,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_CLASS_SIZE,
} from "../lib/lessonSizing";

test("accepts any whole number a real lesson could have, not just a fixed menu", () => {
  // The values a menu of 40/60/80 and 25/35/45/60 used to make impossible.
  assert.equal(isValidDuration("70"), true, "a double period");
  assert.equal(isValidDuration("35"), true);
  assert.equal(isValidClassSize("52"), true, "a crowded JHS stream");
  assert.equal(isValidClassSize("8"), true, "a small remedial group");
});

test("rejects values that could not be a real lesson", () => {
  for (const bad of ["0", "4", "241", "-30", "", "  ", "abc", "45.5"]) {
    assert.equal(isValidDuration(bad), false, `duration ${JSON.stringify(bad)}`);
  }
  for (const bad of ["0", "201", "-1", "", "twenty", "30.5"]) {
    assert.equal(isValidClassSize(bad), false, `class size ${JSON.stringify(bad)}`);
  }
  assert.equal(isValidDuration(undefined), false);
  assert.equal(isValidClassSize(undefined), false);
});

test("generation falls back to a sane lesson rather than failing on a bad value", () => {
  assert.equal(resolveDuration("70"), "70", "a value the teacher typed is honoured exactly");
  assert.equal(resolveClassSize("52"), "52");
  assert.equal(resolveDuration(undefined), DEFAULT_DURATION_MINUTES);
  assert.equal(resolveDuration("9000"), DEFAULT_DURATION_MINUTES);
  assert.equal(resolveClassSize("not a number"), DEFAULT_CLASS_SIZE);
});

test("normalises a typed value to its plain number form", () => {
  assert.equal(resolveDuration("060"), "60");
  assert.equal(resolveClassSize(" 40 "), "40");
});
