import assert from "node:assert/strict";
import test from "node:test";
import { getLocalContextProvider, resolveLocalContext, updateHistory } from "../lib/localContext";
import { buildLessonUserPrompt } from "../prompts/lesson";
import { buildActivityUserPrompt } from "../prompts/activity";
import type { LocationProfile } from "../lib/localContext/types";

const provider = getLocalContextProvider("GH");
const OVERUSED = /accra|kumasi|cape coast|\btema\b/i;

const HO: LocationProfile = { region: "Volta", district: "Ho", community: "Ho" };
const KETA: LocationProfile = { region: "Volta", district: "Keta", community: "Keta" };
const TAMALE: LocationProfile = { region: "Northern", district: "Tamale", community: "Tamale" };
const TAKORADI: LocationProfile = {
  region: "Western",
  district: "Sekondi Takoradi",
  community: "Takoradi",
};
const BOLGATANGA: LocationProfile = { region: "Upper East", district: "Bolgatanga", community: "Bolgatanga" };

const baseIndicator = {
  indicatorCode: "B7.1.2.1",
  indicatorText: "Apply understanding of fractions to solve real-life problems involving sharing and grouping.",
  subject: "Mathematics",
  grade: "B7",
  strand: "Number",
  subStrand: "Fractions, Decimals and Percentages",
  duration: "60",
  classSize: "35",
};

test("Ho and Tamale resolve to different regions with different examples", () => {
  const ho = resolveLocalContext(provider, HO, {});
  const tamale = resolveLocalContext(provider, TAMALE, {});

  assert.equal(ho.regionName, "Volta");
  assert.equal(tamale.regionName, "Northern");
  assert.notEqual(ho.regionName, tamale.regionName);
  assert.notDeepEqual(ho.examples, tamale.examples);
  assert.equal(ho.examples.market, "Ho Market");
  assert.equal(tamale.examples.market, "Tamale Central Market");
});

test("Keta and Takoradi resolve to different examples (and Keta differs from Ho despite same region)", () => {
  const keta = resolveLocalContext(provider, KETA, {});
  const takoradi = resolveLocalContext(provider, TAKORADI, {});
  const ho = resolveLocalContext(provider, HO, {});

  assert.equal(keta.regionName, "Volta");
  assert.equal(takoradi.regionName, "Western");
  assert.notDeepEqual(keta.examples, takoradi.examples);

  // Same region as Ho, but the town-name bias should surface Keta-specific
  // facts (the Keta Lagoon) instead of Ho's Lake Volta/market defaults.
  assert.match(keta.examples.waterBody, /Keta Lagoon/);
  assert.match(keta.examples.occupation, /Keta Lagoon/);
  assert.notEqual(keta.examples.waterBody, ho.examples.waterBody);
});

test("Bolgatanga resolves to Upper East with basket/millet examples", () => {
  const bolga = resolveLocalContext(provider, BOLGATANGA, {});
  assert.equal(bolga.regionName, "Upper East");
  assert.equal(bolga.examples.market, "Bolgatanga Market");
  assert.match(bolga.examples.occupation, /basket/i);
  assert.match(bolga.examples.crop, /millet/i);
});

test("resolved examples never default to Accra/Kumasi/Cape Coast/Tema unless selected", () => {
  for (const profile of [HO, KETA, TAMALE, TAKORADI, BOLGATANGA]) {
    const resolved = resolveLocalContext(provider, profile, {});
    assert.equal(OVERUSED.test(resolved.regionName), false, `${profile.region} region name leaked an overused city`);
    for (const value of Object.values(resolved.examples)) {
      assert.equal(OVERUSED.test(value), false, `${profile.region} examples leaked an overused city: ${value}`);
    }
  }
});

test("match priority: community/district resolve the region even if it doesn't exactly equal profile.region", () => {
  // Simulates a free-text / partially-filled profile where only the town is
  // a recognised name - district/community should still resolve correctly.
  const resolved = resolveLocalContext(provider, { region: "Not A Real Region", community: "Keta" }, {});
  assert.equal(resolved.regionName, "Volta");
  assert.equal(resolved.isFallback, false);
});

test("district suffix normalization: 'Ho Municipal' matches the 'Ho' alias", () => {
  const resolved = resolveLocalContext(provider, { region: "Volta", district: "Ho Municipal" }, {});
  assert.equal(resolved.regionName, "Volta");
});

test("rotation avoids repeating an example across successive calls when alternatives exist", () => {
  let history = {};
  const picks: string[] = [];
  for (let i = 0; i < 3; i++) {
    const resolved = resolveLocalContext(provider, TAKORADI, history);
    picks.push(resolved.examples.crop);
    history = updateHistory(history, resolved.examples);
  }
  // Western region has 3 crop options (cocoa, rubber, oil palm) - rotation
  // should not just repeat the same one 3 times in a row.
  assert.ok(new Set(picks).size > 1, `expected rotation, got repeated picks: ${picks.join(", ")}`);
});

test("curriculum content is identical across towns - only the Local Context block differs", () => {
  const ho = resolveLocalContext(provider, HO, {});
  const keta = resolveLocalContext(provider, KETA, {});

  const hoPrompt = buildLessonUserPrompt({ ...baseIndicator, localContext: ho });
  const ketaPrompt = buildLessonUserPrompt({ ...baseIndicator, localContext: keta });

  const hoLines = hoPrompt.split("\n");
  const ketaLines = ketaPrompt.split("\n");
  assert.equal(hoLines.length, ketaLines.length);

  const differingLines = hoLines.filter((line, i) => line !== ketaLines[i]);
  // Every differing line must be part of the Local Context block (region/
  // district/community/school/example lines), never the curriculum headings,
  // indicator text, subject, grade, or formatting instructions.
  for (const line of differingLines) {
    const isLocalContextLine =
      /^- Region:|^- School:|^- (market|waterBody|landform|crop|festival|occupation|transport|landmark|activity):|^Naming priority:/.test(
        line
      );
    assert.ok(isLocalContextLine, `unexpected non-local-context diff line: "${line}"`);
  }
  assert.ok(differingLines.length > 0, "expected at least one differing line between Ho and Keta");
});

test("activity prompt also stays curriculum-identical across towns except the Local Context block", () => {
  const ho = resolveLocalContext(provider, HO, {});
  const tamale = resolveLocalContext(provider, TAMALE, {});

  const activityBase = {
    indicatorCode: "B7.1.2.1",
    indicatorText: "Apply understanding of fractions to solve real-life problems involving sharing and grouping.",
    subject: "Mathematics",
    grade: "B7",
    strand: "Number",
  };
  const hoPrompt = buildActivityUserPrompt({ ...activityBase, localContext: ho });
  const tamalePrompt = buildActivityUserPrompt({ ...activityBase, localContext: tamale });

  // Same indicator/subject/grade/strand and JSON-shape instructions must be
  // present verbatim in both regardless of location.
  assert.ok(hoPrompt.includes("Indicator Code: B7.1.2.1"));
  assert.ok(tamalePrompt.includes("Indicator Code: B7.1.2.1"));
  assert.ok(hoPrompt.includes('"mcqs"') && tamalePrompt.includes('"mcqs"'));
  assert.notEqual(hoPrompt, tamalePrompt);
});
