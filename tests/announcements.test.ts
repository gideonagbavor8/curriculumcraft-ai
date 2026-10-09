import assert from "node:assert/strict";
import test from "node:test";
import { ANNOUNCEMENTS, ANNOUNCEMENT_SETTINGS } from "../lib/announcements";

test("four distinct announcements cover the intended product directions", () => {
  assert.equal(ANNOUNCEMENTS.length, 4);
  assert.equal(new Set(ANNOUNCEMENTS.map((item) => item.id)).size, 4);
  assert.deepEqual(ANNOUNCEMENTS.map((item) => item.area), ["CREATE", "CREATE", "DISCOVER", "STAY UPDATED · GROW"]);
});

test("early-access copy derives its date and price from shared settings", () => {
  assert.equal(ANNOUNCEMENTS[0].title, `🎉 FREE until ${ANNOUNCEMENT_SETTINGS.earlyAccessEnds}`);
  assert.equal(ANNOUNCEMENTS[0].message, `Premium from ${ANNOUNCEMENT_SETTINGS.premiumPrice}`);
  assert.equal(ANNOUNCEMENT_SETTINGS.premiumPrice, "GH₵10/month");
  assert.ok(ANNOUNCEMENT_SETTINGS.rotationMs >= 5000 && ANNOUNCEMENT_SETTINGS.rotationMs <= 7000);
});

test("announcement copy expands existing teaching tools without access-code messaging", () => {
  assert.match(ANNOUNCEMENTS[1].message, /Improved Activities/);
  for (const item of ANNOUNCEMENTS) {
    assert.ok(item.title && item.message && item.description && item.cta);
    assert.doesNotMatch(`${item.title} ${item.message} ${item.description}`, /access.code/i);
  }
});
