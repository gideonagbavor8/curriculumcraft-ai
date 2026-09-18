import assert from "node:assert/strict";
import test from "node:test";
import { resolveSubjectSlug, withoutSupersededSubjects } from "../lib/curriculum/catalog";
import { BETA_FOCUS_ALLOWED_PATHS } from "../lib/featureFlags";

test("a seed-era subject slug resolves to the official subject that replaced it", () => {
  assert.equal(resolveSubjectSlug("english-language"), "english");
  assert.equal(resolveSubjectSlug("rme"), "religious-and-moral-education");
  assert.equal(resolveSubjectSlug("mathematics"), "mathematics");
});

test("the catalog hides a superseded subject only when its replacement is listed", () => {
  const listed = [
    { slug: "english", name: "English Language" },
    { slug: "english-language", name: "English Language" },
    { slug: "rme", name: "RME" },
    { slug: "mathematics", name: "Mathematics" },
  ];
  assert.deepEqual(
    withoutSupersededSubjects(listed).map((subject) => subject.slug),
    // "rme" stays: religious-and-moral-education is not in this list, so
    // hiding it would leave the subject with no entry at all.
    ["english", "rme", "mathematics"]
  );
});

test("the beta opens the Lesson Builder alongside the Scheme of Learning", () => {
  assert.ok(BETA_FOCUS_ALLOWED_PATHS.includes("/scheme-of-learning"));
  assert.ok(BETA_FOCUS_ALLOWED_PATHS.includes("/lesson-builder"));
});
