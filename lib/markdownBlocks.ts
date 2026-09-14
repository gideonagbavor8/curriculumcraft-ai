// Framework-agnostic markdown parser shared by the PDF and DOCX exporters,
// so both convert the AI's constrained markdown subset (see prompts/lesson.ts
// "Formatting Rules") into real document structure instead of leaking raw
// markdown characters. Deliberately does not handle $...$ LaTeX math - export
// documents pass it through as literal text, same as before this change.

export type InlineRun =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string };

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; runs: InlineRun[] }
  | { type: "bullet"; runs: InlineRun[] }
  | { type: "numbered"; marker: string; runs: InlineRun[] }
  | { type: "paragraph"; runs: InlineRun[] }
  | { type: "rule" }
  | { type: "blank" };

/** Splits one line of text into bold/italic/plain runs (backticks stripped to plain). */
export function parseInlineRuns(text: string): InlineRun[] {
  const withoutBackticks = text.replace(/`([^`]+)`/g, "$1");
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = withoutBackticks.split(regex).filter((part) => part !== "");

  const runs: InlineRun[] = [];
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      runs.push({ kind: "bold", text: part.slice(2, -2) });
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      runs.push({ kind: "italic", text: part.slice(1, -1) });
    } else {
      runs.push({ kind: "text", text: part });
    }
  }
  return runs;
}

/** Parses the AI's constrained markdown subset into a flat list of blocks. */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      blocks.push({ type: "blank" });
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ type: "rule" });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, runs: parseInlineRuns(heading[2]) });
      continue;
    }

    const bullet = line.match(/^[-\u2022]\s+(.+)/) ?? line.match(/^\*\s+(.+)/);
    if (bullet) {
      blocks.push({ type: "bullet", runs: parseInlineRuns(bullet[1]) });
      continue;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.+)/);
    if (numbered) {
      blocks.push({ type: "numbered", marker: `${numbered[1]}.`, runs: parseInlineRuns(numbered[2]) });
      continue;
    }

    blocks.push({ type: "paragraph", runs: parseInlineRuns(line) });
  }

  return blocks;
}

/** Flattens a run list back down to plain text, discarding bold/italic emphasis. */
export function runsToPlainText(runs: InlineRun[]): string {
  return runs.map((run) => run.text).join("");
}

/** Strips markdown syntax from a single string down to plain text (for short, single-line displays like indicator text - never renders bold/italic, just removes the markers). */
export function stripInlineMarkdown(text: string): string {
  return runsToPlainText(parseInlineRuns(text));
}

export interface MarkdownSection {
  /** Plain-text heading title (e.g. "Main Activity"), markdown markers removed. */
  heading: string;
  /** The section's original raw markdown text (excluding the heading line itself). */
  body: string;
}

/**
 * Splits raw markdown into (heading, body) sections at each "#"/"##"/"###"
 * line, for rendering a lesson's headed sections as table rows on screen
 * (where the body is re-rendered by the existing MarkdownRenderer, so this
 * keeps the original text - including $...$ math - completely intact).
 */
export function splitMarkdownSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of content.split("\n")) {
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });
      current = { heading: stripInlineMarkdown(heading[1].trim()), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });

  return sections;
}

export interface MarkdownBlockSection {
  heading: string;
  blocks: MarkdownBlock[];
}

/** Same section split as splitMarkdownSections, but over already-parsed blocks - used by the PDF/DOCX exporters, which render blocks directly rather than raw markdown text. */
export function splitBlocksIntoSections(blocks: MarkdownBlock[]): MarkdownBlockSection[] {
  const sections: MarkdownBlockSection[] = [];
  let current: MarkdownBlockSection | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      current = { heading: runsToPlainText(block.runs), blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "", blocks: [] };
      sections.push(current);
    }
    if (block.type !== "blank") current.blocks.push(block);
  }

  return sections;
}
