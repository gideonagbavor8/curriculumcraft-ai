import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownBlocks, parseInlineRuns } from "../lib/markdownBlocks";

test("headings are parsed as heading blocks, not left as raw # characters", () => {
  const blocks = parseMarkdownBlocks("### Performance Indicator\nSome text.");
  assert.equal(blocks[0].type, "heading");
  assert.deepEqual((blocks[0] as { level: number }).level, 3);
  assert.deepEqual((blocks[0] as { runs: { text: string }[] }).runs, [{ kind: "text", text: "Performance Indicator" }]);
});

test("bold and italic markers become styled runs, not literal asterisks", () => {
  const runs = parseInlineRuns("Learners can **apply** and *reflect on* fractions.");
  assert.deepEqual(runs, [
    { kind: "text", text: "Learners can " },
    { kind: "bold", text: "apply" },
    { kind: "text", text: " and " },
    { kind: "italic", text: "reflect on" },
    { kind: "text", text: " fractions." },
  ]);
  const joined = runs.map((r) => r.text).join("");
  assert.equal(/[*]/.test(joined), false);
});

test("bullet lines with a leading bold term parse into a bullet block with a bold run", () => {
  const blocks = parseMarkdownBlocks("- **Critical Thinking:** Learners analyze problems.");
  assert.equal(blocks[0].type, "bullet");
  const runs = (blocks[0] as { runs: { kind: string; text: string }[] }).runs;
  assert.equal(runs[0].kind, "bold");
  assert.equal(runs[0].text, "Critical Thinking:");
});

test("numbered list items are parsed with their marker separated from the text", () => {
  const blocks = parseMarkdownBlocks("1. Introduce the concept.\n2. Demonstrate an example.");
  assert.equal(blocks[0].type, "numbered");
  assert.equal((blocks[0] as { marker: string }).marker, "1.");
  assert.equal(blocks[1].type, "numbered");
  assert.equal((blocks[1] as { marker: string }).marker, "2.");
});

test("horizontal rules and backticks never leak into any run's text", () => {
  const blocks = parseMarkdownBlocks("---\nUse the `Fraction` term correctly.");
  assert.equal(blocks[0].type, "rule");
  const runs = (blocks[1] as { runs: { text: string }[] }).runs;
  const joined = runs.map((r) => r.text).join("");
  assert.equal(joined.includes("`"), false);
  assert.ok(joined.includes("Fraction"));
});

test("no block or run ever retains raw markdown control characters", () => {
  const sample = `### Main Activity
1. Share **3 cassava** pieces among *4 learners*.
- Use \`counters\` as manipulatives.
---
### Key Vocabulary
- Numerator`;
  const blocks = parseMarkdownBlocks(sample);
  const allText = blocks
    .flatMap((b) => ("runs" in b ? b.runs.map((r) => r.text) : []))
    .join(" ");
  assert.equal(/\*\*/.test(allText), false);
  assert.equal(/(^|[^\w])\*([^*]|$)/.test(allText), false);
  assert.equal(/`/.test(allText), false);
  assert.equal(/^#{1,3}\s/m.test(allText), false);
});
