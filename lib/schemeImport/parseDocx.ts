import mammoth from "mammoth";
import { parse as parseHtml, type HTMLElement } from "node-html-parser";
import { normalizeSchemeRows, looksLikeHeaderRow, type RawTableRow } from "./normalizeRows";
import { splitHeadings } from "./headings";
import type { ParseResult } from "./types";

// mammoth wraps each line of a Word table cell in its own <p>, which is how
// we recover per-indicator line breaks (joined with "\n") for
// normalizeRows.ts's splitIndicators() - td.text alone would concatenate
// every line into one run with no separator.
function cellText(td: HTMLElement): string {
  const paragraphs = td.querySelectorAll("p");
  if (paragraphs.length > 0) {
    return paragraphs
      .map((p) => p.text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
  }
  return td.text.replace(/\s+/g, " ").trim();
}

/**
 * Extracts every Week/Strand/Sub-strand/Content Standard/Indicators/Resources
 * table from an uploaded .docx Scheme of Learning - a "full school" scheme
 * bundles one such table per subject in a single file, each usually preceded
 * by a heading naming the subject (e.g. "BASIC 4 - MATHEMATICS - FIRST
 * TERM"), which is captured as that table's subjectHint. A single-subject
 * upload just produces one section. Vertically merged Word table cells (e.g.
 * Strand repeated across several weeks) come through mammoth's HTML as empty
 * <td> cells for the merged-into rows, which is exactly what
 * normalizeRows.ts's carry-forward logic expects.
 */
export async function parseDocxScheme(buffer: Buffer): Promise<ParseResult> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const root = parseHtml(html);
  const topLevel = root.children;

  const sections: ParseResult["sections"] = [];
  const warnings: string[] = [];
  // Every heading line seen since the previous table, oldest first. A table
  // is commonly preceded by *both* a subject heading and a strand heading
  // ("BASIC 4 - ENGLISH LANGUAGE - FIRST TERM" then "STRAND 1: ORAL
  // LANGUAGE"); keeping only the last one lost the subject entirely and made
  // every strand look like a subject of its own.
  let pendingHeadings: string[] = [];
  let tablesSeen = 0;

  for (const el of topLevel) {
    if (el.tagName?.toLowerCase() !== "table") {
      const text = el.text?.replace(/\s+/g, " ").trim();
      if (text) pendingHeadings.push(text);
      continue;
    }
    tablesSeen++;

    const rows = el.querySelectorAll("tr").map((tr) => tr.querySelectorAll("td, th").map((td) => cellText(td)));
    if (rows.length === 0) continue;

    const headerIndex = rows.findIndex((cells) => looksLikeHeaderRow(cells));
    if (headerIndex === -1) {
      // Not a scheme table (e.g. a cover-page school/class/term table) - skip
      // silently rather than warn, these are common and expected.
      pendingHeadings = [];
      continue;
    }

    const headerCells = rows[headerIndex];
    const dataRows: RawTableRow[] = rows.slice(headerIndex + 1).map((cells) => ({ cells }));
    const result = normalizeSchemeRows(headerCells, dataRows);

    const { subjectHint, strandHint } = splitHeadings(pendingHeadings);
    const warningPrefix = subjectHint ?? strandHint;
    sections.push({ subjectHint, strandHint, weeks: result.weeks });
    warnings.push(...result.warnings.map((w) => (warningPrefix ? `[${warningPrefix}] ${w}` : w)));
    pendingHeadings = []; // consumed - the next table collects its own headings
  }

  if (sections.length === 0) {
    warnings.push(
      tablesSeen === 0
        ? "No table found in the uploaded DOCX - expected a Week/Strand/Sub-strand/Content Standard/Indicators table."
        : "Found tables in the document but none had a recognisable Week/Strand/... header row."
    );
  }

  return { sections, warnings };
}

