import assert from "node:assert/strict";
import test from "node:test";
import { cleanCurriculumText, truncateAtWord } from "../lib/curriculum/text";

test("turns Symbol/Wingdings bullet glyphs into real bullets", () => {
  // U+F0B7 is the Symbol font's bullet - 107 of them sit in the Basic 4 RME
  // indicators, where they render as empty boxes.
  const raw = "Describe the call of the religious leaders. Have learners discuss the leaders.";
  const clean = cleanCurriculumText(raw);

  assert.ok(!clean.includes(""));
  assert.equal(clean, "Describe the call of the religious leaders.• Have learners discuss the leaders.");
});

test("drops a private-use glyph it has no mapping for rather than guessing", () => {
  assert.equal(cleanCurriculumText("Count to ten here"), "Count to ten here");
});

test("normalises the non-breaking spaces that fill the French indicators", () => {
  const clean = cleanCurriculumText("Décrire sa famille");
  assert.equal(clean, "Décrire sa famille");
  assert.ok(!clean.includes(" "));
});

test("removes invisible formatting characters and collapses the gaps they leave", () => {
  const clean = cleanCurriculumText("Read​ the­ text﻿  now");
  assert.equal(clean, "Read the text now");
});

test("keeps line breaks, which carry real structure", () => {
  assert.equal(cleanCurriculumText("First line\nSecond line"), "First line\nSecond line");
});

test("collapses a run of stranded bullets left by the extraction", () => {
  assert.equal(cleanCurriculumText("text    more"), "text • more");
});

test("passes clean text through untouched, and handles absent text", () => {
  assert.equal(cleanCurriculumText("Model number quantities up to 1000"), "Model number quantities up to 1000");
  assert.equal(cleanCurriculumText(null), undefined);
  assert.equal(cleanCurriculumText(undefined), undefined);
});

test("truncates at a word boundary so a shortened indicator never ends mid-word", () => {
  const long = "Describe the call of the religious leaders and explain their significance in Ghana today";
  const short = truncateAtWord(long, 40);

  assert.ok(short.length <= 41, "stays within the cell");
  assert.ok(short.endsWith("…"));
  assert.ok(!short.includes("relig…"), "never cuts a word in half");
  assert.ok(long.startsWith(short.slice(0, -1)));
});

test("leaves text that already fits completely alone", () => {
  assert.equal(truncateAtWord("Short indicator", 40), "Short indicator");
});
