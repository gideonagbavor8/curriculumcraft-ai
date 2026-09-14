import {
  normalizeSchemeRows,
  looksLikeHeaderRow,
  detectColumnMapping,
  type RawTableRow,
} from "./normalizeRows";
import { splitHeadings } from "./headings";
import type { ParseResult, ParsedSchemeSection } from "./types";

interface TextItem {
  text: string;
  x: number;
  y: number;
}

interface Line {
  y: number;
  page: number;
  /** Y position as a 0-1 fraction of the page's own inked range, 0 = top. Used only to spot running headers/footers. */
  yFraction: number;
  items: TextItem[];
}

const Y_TOLERANCE = 3;
// A running header/footer sits in the page margins. Only lines inside these
// bands are even considered for repeat-removal, so a genuine table row that
// happens to repeat is never dropped.
const HEADER_BAND = 0.12;
const FOOTER_BAND = 0.92;
// How many pages a margin line must appear on before it counts as furniture
// rather than content.
const MIN_REPEAT_PAGES = 3;

/**
 * Groups same-page text items into visual lines by Y position (within
 * tolerance), top of page first. yFraction is measured against the page's own
 * topmost and bottommost inked line rather than the declared page height: a
 * scheme is typically printed landscape, and a rotated page's viewport height
 * does not correspond to the text-space Y that getTextContent reports.
 */
function clusterLines(items: TextItem[], page: number): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];
  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= Y_TOLERANCE);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, page, yFraction: 0, items: [item] });
  }

  const top = Math.max(...lines.map((l) => l.y));
  const bottom = Math.min(...lines.map((l) => l.y));
  const span = top - bottom;
  for (const line of lines) line.yFraction = span > 0 ? (top - line.y) / span : 0;
  return lines;
}

function lineText(line: Line): string {
  return line.items.map((it) => it.text).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Drops the running header/footer that repeats on every page of a printed
 * scheme ("2026/2027 Academic Year", "BBEKO STRATEGIC SCHEME OF LEARNING …
 * 14"). These carry no scheme content, but they land at the same X positions
 * as real columns - the year in particular sat squarely in the Week column,
 * so every page contributed a phantom "week 2026" row and a stray "Year"
 * heading. Matching is by text with digits masked (page numbers and dates
 * vary per page) and restricted to the page's top/bottom margin bands, so a
 * repeated *table* line is never mistaken for furniture.
 */
function stripRunningHeadersAndFooters(lines: Line[]): Line[] {
  const pagesByKey = new Map<string, Set<number>>();
  for (const line of lines) {
    if (line.yFraction > HEADER_BAND && line.yFraction < FOOTER_BAND) continue;
    const key = lineText(line).replace(/\d+/g, "#").toLowerCase();
    if (!key) continue;
    const pages = pagesByKey.get(key) ?? new Set<number>();
    pages.add(line.page);
    pagesByKey.set(key, pages);
  }

  return lines.filter((line) => {
    if (line.yFraction > HEADER_BAND && line.yFraction < FOOTER_BAND) return true;
    const key = lineText(line).replace(/\d+/g, "#").toLowerCase();
    return (pagesByKey.get(key)?.size ?? 0) < MIN_REPEAT_PAGES;
  });
}

/**
 * Assigns each item in a line to the column it starts inside: the last column
 * whose left edge is at or before the item, with anything left of the first
 * edge falling into the first column.
 *
 * Assigning to the *nearest* column edge instead is what silently emptied the
 * Indicators column of every four-column scheme. A header label is centred
 * over its column while the cell text below is left-aligned, so in a wide
 * Indicators column ("INDICATORS" centred at x=557 over text starting at
 * x=385) every indicator sat nearer the Content Standard label than its own -
 * and was filed there, leaving the week with no indicators at all.
 */
function assignColumns(line: Line, columnStarts: number[]): string[] {
  const cells = columnStarts.map(() => [] as string[]);
  for (const item of line.items) {
    let column = 0;
    for (let i = 0; i < columnStarts.length; i++) {
      if (item.x >= columnStarts[i] - COLUMN_EDGE_TOLERANCE) column = i;
    }
    cells[column].push(item.text);
  }
  return cells.map((words) => words.join(" ").trim());
}

/** Slack for a cell that starts a hair left of its column's dominant edge (a wider glyph, a leading bullet). */
const COLUMN_EDGE_TOLERANCE = 4;
/** Two left edges within this distance are the same column. */
const CLUSTER_TOLERANCE = 5;

/**
 * Finds each column's left edge from the table body rather than from the
 * header, then hands each header label the column it sits over.
 *
 * Body text in a PDF table is left-aligned, so every wrapped line of a column
 * starts at the same X - those repeated X positions *are* the column edges,
 * and they are the only trustworthy record of them (see assignColumns for why
 * the header's own positions are not). Edges that no header label sits over
 * are indents within the column to their left, not columns of their own, so
 * they're folded into it.
 */
function deriveColumnStarts(headerAnchors: number[], dataLines: Line[]): number[] {
  const xs = dataLines.flatMap((line) => line.items.map((item) => item.x)).sort((a, b) => a - b);
  if (xs.length === 0) return headerAnchors;

  const clusters: { x: number; count: number }[] = [];
  for (const x of xs) {
    const last = clusters[clusters.length - 1];
    if (last && x - last.x <= CLUSTER_TOLERANCE) last.count++;
    else clusters.push({ x, count: 1 });
  }

  // A real column repeats down the page; a one-off X is a centred heading
  // inside the table ("REVISION") or a stray glyph.
  const minCount = Math.max(3, Math.round(xs.length * 0.01));
  const edges = clusters.filter((c) => c.count >= minCount).map((c) => c.x);
  if (edges.length < headerAnchors.length) return headerAnchors;

  const starts: number[] = [];
  let previousEdgeIndex = -1;
  for (const anchor of headerAnchors) {
    let edgeIndex = 0;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] <= anchor + COLUMN_EDGE_TOLERANCE) edgeIndex = i;
    }
    // Two labels over one edge means the guess collapsed two columns into
    // one; step the later label along so columns stay distinct and ordered.
    if (edgeIndex <= previousEdgeIndex) edgeIndex = previousEdgeIndex + 1;
    if (edgeIndex >= edges.length) return headerAnchors;
    starts.push(edges[edgeIndex]);
    previousEdgeIndex = edgeIndex;
  }
  return starts;
}

/**
 * Groups a header line's individual text items (PDFs have no cell markup, so
 * a multi-word column label like "Content Standard" arrives as two separate
 * items) into logical columns, so column detection and cell assignment see
 * "Content Standard" as one label instead of two unrecognized ones - without
 * this, real multi-word headers silently misalign every column after them.
 * Deliberately conservative: two adjacent words are merged only when doing
 * so turns an unrecognized label into a recognized column kind (e.g.
 * "Content" + "Standard" -> contentStandard) - merging based on X-spacing
 * alone was tried and is unreliable across real documents' varying column
 * widths/fonts, and risks merging two genuinely different (just narrow)
 * columns together.
 */
function clusterHeaderColumns(headerLine: Line): { anchors: number[]; headerCells: string[] } {
  const items = [...headerLine.items].sort((a, b) => a.x - b.x);
  if (items.length === 0) return { anchors: [], headerCells: [] };

  const anchors: number[] = [items[0].x];
  const headerCells: string[] = [items[0].text];
  for (let i = 1; i < items.length; i++) {
    const prevCell = headerCells[headerCells.length - 1];
    const prevKind = detectColumnMapping([prevCell])[0];
    const combinedCell = `${prevCell} ${items[i].text}`;
    const combinedKind = detectColumnMapping([combinedCell])[0];
    if (prevKind === "unknown" && combinedKind !== "unknown") {
      headerCells[headerCells.length - 1] = combinedCell;
    } else {
      anchors.push(items[i].x);
      headerCells.push(items[i].text);
    }
  }
  return { anchors, headerCells };
}

/**
 * A PDF has no table markup, so a header line is the *only* thing that tells
 * one table from the next - and the column anchors it sets are what every
 * following row is measured against. A false positive therefore doesn't just
 * add a section, it re-anchors and scrambles the rest of the table. So on top
 * of the shared shape test, a section header here must name a Week column:
 * without one, normalizeSchemeRows has no week numbers to key rows by and
 * would guess sequentially down a misaligned table anyway.
 */
function isSectionHeaderLine(line: Line): boolean {
  const { headerCells } = clusterHeaderColumns(line);
  if (!looksLikeHeaderRow(headerCells)) return false;
  return detectColumnMapping(headerCells).includes("week");
}

/**
 * Extracts the scheme table from an uploaded PDF using text-item
 * coordinates (PDFs have no structural table markup, only visual position).
 * Column boundaries are anchored to the header row's item X-positions; every
 * subsequent visual text line is assigned to the nearest column, then lines
 * that don't start a new week number are merged into the previous logical
 * row (a table row's cell content commonly wraps across several PDF text
 * lines - e.g. a week with 6 indicators).
 */
export async function parsePdfScheme(buffer: Buffer): Promise<ParseResult> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs-dist still tries to dynamically import its worker module even with
  // disableWorker: true (it falls back to a same-thread "fake worker" that is
  // itself loaded via a dynamic import of GlobalWorkerOptions.workerSrc).
  // Under Next.js/Turbopack that dynamic import path doesn't resolve to a
  // real file, so we pre-load the worker module ourselves and hand it to
  // pdfjs via the documented globalThis.pdfjsWorker hook - this bypasses the
  // dynamic import entirely. See pdfjs-dist's PDFWorker.#mainThreadWorkerMessageHandler.
  if (!(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker) {
    const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
  }
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as never).promise;

  const allLines: Line[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const raw of content.items) {
      const item = raw as { str?: string; transform?: number[] };
      if (!item.str || !item.str.trim() || !item.transform) continue;
      items.push({ text: item.str, x: item.transform[4], y: item.transform[5] });
    }
    allLines.push(...clusterLines(items, pageNum));
  }

  if (allLines.length === 0) {
    return { sections: [], warnings: ["No extractable text found in the PDF (it may be a scanned image without a text layer)."] };
  }

  const contentLines = stripRunningHeadersAndFooters(allLines);

  // A "full school" scheme PDF repeats the Week/Strand/... header on every
  // page of every subject - find them all and treat each as the start of a
  // section. A section is *not* the same thing as a subject: one subject's
  // scheme routinely runs to several tables (one per strand, one per page),
  // and only the first of them carries the subject heading. Each section
  // therefore reports the headings it actually saw (subject and/or strand),
  // and importScheme.ts stitches consecutive sections back into subjects.
  // Cluster each candidate line's words into columns first (not raw per-word
  // items), so a multi-word label like "Content Standard" is recognized as
  // one header, not two unrecognized halves.
  const headerIndices = contentLines.map((line, i) => (isSectionHeaderLine(line) ? i : -1)).filter((i) => i !== -1);

  if (headerIndices.length === 0) {
    return {
      sections: [],
      warnings: ["Could not locate a Week/Strand/Sub-strand/... header row in the PDF - table structure may be non-standard."],
    };
  }

  // A heading always sits directly above its table on the same page, so only
  // same-page lines above a header count as its heading candidates. Reaching
  // back further used to scoop up the previous page's last table rows ("14
  // END OF FIRST TERM EXAMINATIONS") and read them as subject names. The
  // index this block starts at also bounds the *previous* section's data, so
  // "STRAND 2: READING" isn't assigned to the Week column of the table above
  // it and imported as a phantom week 2.
  const headingStarts = headerIndices.map((headerIdx, s) => {
    const floor = s === 0 ? 0 : headerIndices[s - 1] + 1;
    let start = headerIdx;
    for (let i = headerIdx - 1; i >= floor; i--) {
      if (contentLines[i].page !== contentLines[headerIdx].page) break;
      start = i;
    }
    return start;
  });

  const sections: ParsedSchemeSection[] = [];
  const warnings: string[] = [];

  for (let s = 0; s < headerIndices.length; s++) {
    const headerIdx = headerIndices[s];
    const dataEndIdx = headingStarts[s + 1] ?? contentLines.length;
    const headerLine = contentLines[headerIdx];
    const { anchors, headerCells } = clusterHeaderColumns(headerLine);
    const mapping = detectColumnMapping(headerCells);
    const weekColumnIndex = mapping.indexOf("week");

    const headingLines = contentLines
      .slice(headingStarts[s], headerIdx)
      .map(lineText)
      .filter(Boolean);
    const { subjectHint, strandHint } = splitHeadings(headingLines);

    const dataLines = contentLines.slice(headerIdx + 1, dataEndIdx);
    const columnStarts = deriveColumnStarts(anchors, dataLines);
    const rows: string[][] = [];
    for (const line of dataLines) {
      const cells = assignColumns(line, columnStarts);
      const weekCellHasNumber = weekColumnIndex !== -1 && /\d/.test(cells[weekColumnIndex] ?? "");
      if (weekCellHasNumber || rows.length === 0) {
        rows.push(cells);
      } else {
        // Continuation of the previous row's wrapped cell content.
        const prev = rows[rows.length - 1];
        cells.forEach((text, i) => {
          if (!text) return;
          prev[i] = prev[i] ? `${prev[i]}\n${text}` : text;
        });
      }
    }

    const dataRows: RawTableRow[] = rows.map((cells) => ({ cells }));
    const result = normalizeSchemeRows(headerCells, dataRows);
    sections.push({ subjectHint, strandHint, weeks: result.weeks });
    const warningPrefix = subjectHint ?? strandHint;
    warnings.push(...result.warnings.map((w) => (warningPrefix ? `[${warningPrefix}] ${w}` : w)));
  }

  return { sections, warnings };
}

