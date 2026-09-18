import assert from "node:assert/strict";
import test from "node:test";
import { lessonDateFor } from "../lib/lessonDate";

test("the lesson date is the chosen weekday of the week that ends on the given Friday", () => {
  assert.equal(lessonDateFor("2026-10-16", "Friday"), "16 Oct 2026");
  assert.equal(lessonDateFor("2026-10-16", "Monday"), "12 Oct 2026");
  assert.equal(lessonDateFor("2026-10-16", "Wednesday"), "14 Oct 2026");
});

test("no date without both a week ending and a day", () => {
  assert.equal(lessonDateFor("", "Monday"), "");
  assert.equal(lessonDateFor("2026-10-16", ""), "");
  assert.equal(lessonDateFor("not-a-date", "Monday"), "");
});
