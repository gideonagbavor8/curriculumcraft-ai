import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Extractor for the official NaCCA Common Core Programme (CCP) curricula -
 * JHS 1-3 (B7-B9), published 2021 and hosted at nacca.gov.gh.
 *
 * The CCP documents share one table layout, distinct from the 2019 Primary
 * books that db/extract-primary-subjects.ts reads:
 *
 *   CONTENT STANDARD | INDICATORS AND EXEMPLARS | CORE COMPETENCIES
 *   B7.1.1.1 text    | B7.1.1.1.1 text          | CP 5.1: ...
 *                    | Exemplars:               |
 *                    | 1. ...                   |
 *                    | 2. ...                   |
 *
 * so a content standard is a 4-part code and an indicator a 5-part one, with
 * exemplars as numbered lines beneath. What varies between subjects is the
 * numbering typography - "B7.1.1.1.1", "B7 1.1.1.1", "B7/JHS1.1.1.1.1",
 * "B7. 2.1.1" - and the column positions, which drift from page to page. Both
 * are handled here rather than by per-subject parsers: codes are normalised
 * to the canonical "B7.1.1.1.1" before anything else looks at them, and the
 * column edges are measured from where the codes actually sit on each page
 * instead of trusted from the header row (whose labels are centred and
 * squeezed, and lied to the Primary extractor).
 *
 * Extract first, flag uncertainty, never silently discard: every indicator
 * the document numbers becomes a record. One that arrives without wording,
 * without a resolvable strand name, or with a code the document reuses is
 * kept, given its raw source text, and marked needs-review with a note
 * saying exactly why.
 *
 * Input:  pdftotext -layout output, one .txt per subject, next to its .pdf
 *         (see JHS_SOURCE_DIR). The PDF is hashed for the source registry.
 * Output: one import envelope per subject, consumable by
 *         `npm run curriculum:import -- <file>`.
 *
 * Run:    npm run curriculum:extract-jhs            (all subjects)
 *         npm run curriculum:extract-jhs -- science (one subject)
 */

const JHS_SOURCE_DIR = resolve(process.env.JHS_SOURCE_DIR ?? resolve(process.env.TEMP ?? ".", "nacca-jhs-ccp"));
const EXTRACTION_VERSION = "jhs-ccp-pdftotext-layout-v1";
const ORGANIZATION = "National Council for Curriculum and Assessment (NaCCA), Ministry of Education, Ghana";

export interface SubjectConfig {
  key: string;
  subjectSlug: string;
  subjectName: string;
  subjectSortOrder: number;
  title: string;
  sourceUrl: string;
}

/**
 * Every subject on NaCCA's Common Core Programme page, with the slug each one
 * shares with the Primary import where the same subject exists there - so a
 * subject is one row across levels, as the framework-scoped design intends.
 */
export const SUBJECTS: SubjectConfig[] = [
  { key: "english-language", subjectSlug: "english", subjectName: "English Language", subjectSortOrder: 1, title: "ENGLISH LANGUAGE (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/ENGLISH-LANGUAGE.pdf" },
  { key: "mathematics", subjectSlug: "mathematics", subjectName: "Mathematics", subjectSortOrder: 2, title: "MATHEMATICS (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/MATHEMATICS.pdf" },
  { key: "science", subjectSlug: "science", subjectName: "Science", subjectSortOrder: 3, title: "SCIENCE (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/SCIENCE.pdf" },
  { key: "social-studies", subjectSlug: "social-studies", subjectName: "Social Studies", subjectSortOrder: 4, title: "SOCIAL STUDIES (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2026/09/Social-Studies.pdf" },
  { key: "computing", subjectSlug: "computing", subjectName: "Computing", subjectSortOrder: 5, title: "COMPUTING (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/COMPUTING.pdf" },
  { key: "career-technology", subjectSlug: "career-technology", subjectName: "Career Technology", subjectSortOrder: 6, title: "CAREER TECHNOLOGY (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/Career-Technology-k-9-3rd-Aug.08.2021.pdf" },
  { key: "rme", subjectSlug: "religious-and-moral-education", subjectName: "Religious and Moral Education", subjectSortOrder: 7, title: "RELIGIOUS AND MORAL EDUCATION (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/Religious-and-Moral-Education.pdf" },
  { key: "creative-arts-and-design", subjectSlug: "creative-arts-and-design", subjectName: "Creative Arts and Design", subjectSortOrder: 8, title: "CREATIVE ARTS AND DESIGN (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/CREATIVE-ARTS-AND-DESIGN.pdf" },
  { key: "physical-education-and-health", subjectSlug: "physical-education-and-health", subjectName: "Physical Education and Health", subjectSortOrder: 9, title: "PHYSICAL EDUCATION AND HEALTH (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/PHYSICAL-EDUCATION-AND-HEALTH.pdf" },
  { key: "ghanaian-language", subjectSlug: "ghanaian-language", subjectName: "Ghanaian Language", subjectSortOrder: 10, title: "GHANAIAN LANGUAGE (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/GHANAIAN-LANGUAGE.pdf" },
  { key: "french", subjectSlug: "french", subjectName: "French", subjectSortOrder: 11, title: "FRENCH LANGUAGE (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/FRENCH-LANGUAGE.pdf" },
  { key: "arabic", subjectSlug: "arabic", subjectName: "Arabic", subjectSortOrder: 12, title: "ARABIC (JHS 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2023/06/ARABIC.pdf" },
];

const GRADES: Record<number, { code: string; name: string; aliases: string[]; sortOrder: number; ageMin: number; ageMax: number }> = {
  7: { code: "B7", name: "JHS 1", aliases: ["JHS1", "JHS 1"], sortOrder: 1, ageMin: 12, ageMax: 13 },
  8: { code: "B8", name: "JHS 2", aliases: ["JHS2", "JHS 2"], sortOrder: 2, ageMin: 13, ageMax: 14 },
  9: { code: "B9", name: "JHS 3", aliases: ["JHS3", "JHS 3"], sortOrder: 3, ageMin: 14, ageMax: 15 },
};

// ---------------------------------------------------------------------------
// Code normalisation
// ---------------------------------------------------------------------------

/**
 * Matches every typography the CCP books use for a curriculum reference at
 * the start of a cell - "B7.1.1.1.1", "B7 1.1.1.1:", "B7/JHS1.1.1.1.1.",
 * "B7. 2.1.1" - and captures its numeric parts. Four parts is a content
 * standard, five an indicator. Anchored to the cell start so a reference
 * quoted mid-sentence ("see B7.1.2.1.1") is never taken for a new row.
 */
const CODE_AT_START =
  /^[\s\u2022\u25cf\u25aa\u2013\uf0b7\uf0a7\uf0fc\ufffd\u200e\u200f\u202a-\u202e\u2066-\u2069-]*B\s?(7|8|9)\s?(?:\/\s?JHS\s?\d\s?)?[.:]?\s?(\d{1,2})\s?[.:]\s?(\d{1,2})\s?[.:]\s?(\d{1,2})(?:\s?[.:]\s?(\d{1,2}))?(?:\s?[.:]\s?(\d{1,2}))?\.?\s*[:.\-\u2013]?\s*/;

interface ParsedCode {
  grade: number;
  strand: number;
  subStrand: number;
  standard: number;
  indicator?: number;
  code: string;
  rest: string;
  /** The source printed a sixth number ("B9.5.1.2.2.2") - a typo to be checked, not a code to trust. */
  malformed?: string;
}

export function parseCode(cell: string): ParsedCode | null {
  const match = cell.match(CODE_AT_START);
  if (!match) return null;
  const grade = Number(match[1]);
  const strand = Number(match[2]);
  const subStrand = Number(match[3]);
  const standard = Number(match[4]);
  const indicator = match[5] !== undefined ? Number(match[5]) : undefined;
  const code = indicator === undefined
    ? `B${grade}.${strand}.${subStrand}.${standard}`
    : `B${grade}.${strand}.${subStrand}.${standard}.${indicator}`;
  const malformed = match[6] !== undefined ? `${code}.${match[6]}` : undefined;
  return { grade, strand, subStrand, standard, indicator, code, rest: cell.slice(match[0].length).trim(), malformed };
}

// ---------------------------------------------------------------------------
// Source text
// ---------------------------------------------------------------------------

interface SourceLine {
  text: string;
  pdfPage: number;
  line: number;
}

function sourceLines(path: string): SourceLine[] {
  let pdfPage = 1;
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((raw, index) => {
      // pdftotext marks a page break with a form feed at the start of the
      // first line of the new page.
      if (raw.includes("\f")) pdfPage += 1;
      return { text: raw.replace(/\f/g, ""), pdfPage, line: index + 1 };
    });
}

/** Page furniture and table-of-contents lines that carry no curriculum content. */
const NOISE = [
  /NaCCA,?\s*Ministry of Education/i,
  /^\s*(?:[ivxlc]+|\d{1,3})\s*$/i, // page numbers, roman or arabic
  /\.{6,}/, // dotted leaders in the contents pages
  /^\s*Basic Year \d\s*$/i,
  /^\s*(CONTENT STANDARDS?|CONTENT|STANDARDS?|INDICATORS? AND EXEMPLARS?\(?S?\)?|CORE COMPETENC(?:IES|Y)(?: AND)?|SUBJECT SPECIFIC PRACTICES)\s*$/i,
];

function isNoise(text: string): boolean {
  return NOISE.some((pattern) => pattern.test(text));
}

/**
 * Header row of a curriculum table. Keyed on the middle label alone: the
 * left one wraps onto a second line in Computing ("CONTENT" / "STANDARD") and
 * the right one grows a suffix in English ("CORE COMPETENCIES AND SUBJECT
 * SPECIFIC PRACTICES"), but "INDICATORS AND EXEMPLAR(S)" is on every table.
 */
const TABLE_HEADER = /INDICATORS?\s+AND\s+EXEMPLAR/i;

/**
 * "STRAND 1: NUMBER", "STRAND: B7.1 LISTENING" (Arabic), "STRAND 1: B7.1
 * CUSTOMS" (Ghanaian Language), "STRAND: 1.Design" (Creative Arts). The
 * number is taken from the plain digit when there is one, else from the
 * B7.n reference, else from a leading "n." on the name.
 */
const STRAND_HEADING = /(?<!SUB[\s\u2013\u2014-]{0,3})\bSTRAND\s*:?\s*(\d{1,2})?\s*[:.\-\u2013]*\s*(?:B\d\.(\d+)\s+)?(?:(\d{1,2})\.\s*)?([A-Za-z\u00C0-\u024F(][^\n]*?)(?=\s{3,}|\s*$)/i;
/** "STRAND 4:" alone on its line - the name follows on the next. */
const BARE_STRAND_HEADING = /^\s*STRAND\s*:?\s*(\d{1,2})\s*[:.\-\u2013]*\s*$/i;
const SUB_STRAND_HEADING = /\bSUB\s*[\u2013\u2014-]?\s*STRAND\s*:?\s*(\d{1,2}(?:\.\d{1,2})?)?\s*[:.\-\u2013]*\s*(?:B\d\.(\d+)\.(\d+)\s+)?([A-Za-z\u00C0-\u024F(][^\n]*?)(?=\s{3,}|\s*$)/i;

function titleCase(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned !== cleaned.toUpperCase()) return cleaned;
  return cleaned
    .toLowerCase()
    .replace(/(^|[\s(\/\-'])([a-z])/g, (_m, lead: string, letter: string) => lead + letter.toUpperCase());
}

function cleanText(parts: string[]): string {
  return parts
    .join(" ")
    .replace(/[\u2022\u25cf\u25aa\u2013\uf0b7\uf0a7\uf0fc\ufffd]/g, " ")
    // Bidi embedding controls from the Arabic book are layout, not content.
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .trim();
}

// ---------------------------------------------------------------------------
// Column geometry
// ---------------------------------------------------------------------------

interface Columns {
  /** First character index of the Indicators column. */
  mid: number;
  /** First character index of the Core Competencies column. */
  right: number;
}

/** A five-part indicator reference anywhere in a line, for measuring where the Indicators column starts. */
// At most one space on either side of a separator: a run of spaces between a
// four-part standard and the "6." of an exemplar beside it must not read as a
// fifth part, or the column edge is measured at the wrong place.
const INDICATOR_CODE_ANYWHERE =
  /B\s?(?:7|8|9)\s?(?:\/\s?JHS\s?\d\s?)?[.:]?\s?\d{1,2}\s?[.:]\s?\d{1,2}\s?[.:]\s?\d{1,2}\s?[.:]\s?\d{1,2}(?!\s?[.:]\s?\d)/g;

/** The same reference, non-global, for a single search. */
const INDICATOR_CODE_ANYWHERE_ONCE = new RegExp(INDICATOR_CODE_ANYWHERE.source);

/** An exemplar line: "1.", "2)", Mathematics' "E.g.,1." / "E.g.2.", or a bullet. */
const NUMBERED_LINE = /^(\s*)(?:E\.?\s?g\.?,?\s*)?(\d{1,2})[.)]\s*\S/i;
/** A core-competency reference: "CP 5.1", "CC9.1", "DL 6.4". */
const COMPETENCY_TOKEN = /\b(?:CP|CC|CI|DL|CG|PL|PD)\s?\d+\.\d+/;
/** A competency name (with its abbreviation) inside a text - the right column bled in. */
const COMPETENCY_NAME_INSIDE =
  /\b(?:Communication and Collaboration|Digital Literacy|Personal Development and Leadership|Cultural Identity and [Gg]lobal [Cc]itizenship|Critical Thinking and Problem[- ][Ss]olving|Creativity and Innovation)\s?\([A-Z]{2}\)/;
/** The core competency names as the right column prints them, when one closes a run of text. */
const COMPETENCY_NAME_AT_END =
  /\s(?:(?:Communication and Collaboration|Digital Literacy|Personal Development and Leadership|Cultural Identity and [Gg]lobal [Cc]itizenship|Critical Thinking and Problem[- ][Ss]olving|Creativity and Innovation|Presentation)(?:\s?\([A-Z]{2}\))?,?\s*)+$/;

/**
 * Where the three columns start on one page, measured from the content: the
 * indicator codes are left-aligned in the middle column, so their modal
 * position is that column's edge; numbered exemplar lines sometimes sit a few
 * characters left of the code, and pull the edge out to meet them; and the
 * Core Competencies label in the header, or failing that the competency
 * references themselves, give the right column. Pages that carry only
 * continuation text inherit the previous page's geometry.
 */
function measureColumns(page: SourceLine[], previous: Columns | null): Columns | null {
  const codeStarts: number[] = [];
  for (const { text } of page) {
    for (const match of text.matchAll(INDICATOR_CODE_ANYWHERE)) {
      if (match.index !== undefined) codeStarts.push(match.index);
    }
  }
  let mid = previous?.mid ?? -1;
  if (codeStarts.length > 0) mid = mode(codeStarts);
  if (mid < 0) return previous;

  for (const { text } of page) {
    const match = text.match(NUMBERED_LINE);
    if (!match) continue;
    const start = match[1].length;
    if (start >= mid - 12 && start < mid) mid = start;
  }

  let right = previous?.right ?? -1;
  const header = page.find(({ text }) => TABLE_HEADER.test(text));
  if (header) {
    const at = header.text.search(/CORE\s+COMPETENC|COMPETENC/i);
    if (at > mid) right = at;
  } else {
    const tokenStarts = page
      .map(({ text }) => text.search(COMPETENCY_TOKEN))
      .filter((at) => at > mid + 20);
    if (tokenStarts.length >= 2) right = Math.min(...tokenStarts);
  }

  // The body knows the right column better than the header: in English the
  // competency names start at column 93 under a label printed at 110, and
  // anything between would be read as indicator text. On lines that carry a
  // middle cell and one more cell to its right, the modal start of that last
  // cell is where the right column really begins.
  const lastCellStarts: number[] = [];
  for (const { text } of page) {
    const starts = [...text.matchAll(/\S(?:\S| (?! ))*/g)].map((m) => m.index ?? 0).filter((at) => at >= mid - 6);
    if (starts.length >= 2) {
      const last = starts[starts.length - 1];
      if (last > mid + 25) lastCellStarts.push(last);
    }
  }
  if (lastCellStarts.length >= 3) {
    const bodyRight = mode(lastCellStarts);
    if (bodyRight > mid + 25 && (right <= mid || bodyRight < right)) right = bodyRight;
  }

  if (right <= mid) right = Math.max(previous?.right ?? 0, mid + 60);

  return { mid, right };
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

/**
 * Splits one layout line into its three cells. The cells are the runs of text
 * separated by two or more spaces - that is what pdftotext -layout emits for
 * a table row - and each run goes to the column its first character falls
 * in. Cutting at fixed column indexes instead would clip any exemplar that
 * runs on beneath an empty Core Competencies cell ("…make a billion" losing
 * its "ion"), and would split a wrapped standard mid-word.
 */
function splitCells(text: string, columns: Columns): { left: string; mid: string; right: string } {
  const midStart = Math.max(0, columns.mid - 1);
  const rightStart = Math.max(midStart, columns.right - 1);
  const cells = { left: [] as string[], mid: [] as string[], right: [] as string[] };

  for (const match of text.matchAll(/\S(?:\S| (?! ))*/g)) {
    const start = match.index ?? 0;
    if (start < midStart - 6) cells.left.push(match[0]);
    else if (start < rightStart - 2) {
      // English sets its competency names one space after the indicator
      // text, so the layout pass reads "...meaningful and Communication and
      // Collaboration" as one run. A competency name that closes the run
      // reaching towards the right column is that column's. (The reach is
      // measured on the run's end: a page whose text is shifted left puts
      // the name well short of the column, but the run still ends near it.)
      const name = match[0].match(COMPETENCY_NAME_AT_END);
      if (name && name.index !== undefined && start + match[0].length >= rightStart - 30) {
        const before = match[0].slice(0, name.index).trim();
        if (before) cells.mid.push(before);
        cells.right.push(name[0].trim());
      } else cells.mid.push(match[0]);
    } else cells.right.push(match[0]);
  }

  return {
    left: cells.left.join(" ").trim(),
    mid: cells.mid.join(" ").trim(),
    right: cells.right.join(" ").trim(),
  };
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface ExemplarDraft {
  number: number;
  parts: string[];
  /** Column the exemplar's first line started at - a deeper line beneath it is a sub-point, not a new exemplar. */
  indent: number;
}

interface IndicatorDraft {
  code: ParsedCode;
  parts: string[];
  exemplars: ExemplarDraft[];
  inExemplars: boolean;
  competencies: string[];
  pdfPage: number;
  line: number;
  raw: string[];
  strandName?: string;
  subStrandName?: string;
  /**
   * The standard this indicator sits under - held by reference, because the
   * standard's wording wraps down the left column for many lines after the
   * indicator begins and is only complete once the table moves on.
   */
  standard?: StandardDraft;
  /** The standard's code does not prefix the indicator's - a numbering slip in the source. */
  standardMismatch?: boolean;
  notes: string[];
}

interface StandardDraft {
  code: ParsedCode;
  parts: string[];
}

interface ImportRecord {
  curriculumSlug: string;
  curriculumName: string;
  countryCode: string;
  authority: string;
  version: string;
  levelCode: string;
  levelName: string;
  gradeCode: string;
  gradeName: string;
  gradeAliases: string[];
  gradeSortOrder: number;
  typicalAgeMin: number;
  typicalAgeMax: number;
  subjectSlug: string;
  subjectName: string;
  subjectSortOrder: number;
  strandCode: string;
  strandName: string;
  strandSortOrder: number;
  subStrandCode: string;
  subStrandName: string;
  subStrandSortOrder: number;
  contentStandardCode?: string;
  contentStandardText?: string;
  contentStandardSortOrder: number;
  indicatorCode: string;
  indicatorText: string;
  indicatorSortOrder: number;
  bloomsLevel: null;
  documentSha256: string;
  pdfPage: number;
  sourceReference: string;
  extractionConfidence: "high" | "medium" | "low";
  reviewStatus: "pending" | "needs-review";
  ambiguityFlag: boolean;
  rawSourceText: string;
  guidance: { target: "indicator"; kind: "core_competency"; text: string; sortOrder: number; documentSha256: string; pdfPage: number; sourceReference: string; extractionConfidence: "medium"; reviewStatus: "pending"; ambiguityFlag: false }[];
  exemplars: { code: string; text: string; sortOrder: number; revision: string; documentSha256: string; pdfPage: number; sourceReference: string; extractionConfidence: "high" | "medium" | "low"; reviewStatus: "pending" | "needs-review"; ambiguityFlag: boolean; rawSourceText: string }[];
}

interface ExtractionReport {
  subject: string;
  indicators: Record<string, number>;
  exemplars: number;
  needsReview: number;
  blankText: number;
  unresolvedStrand: number;
  unresolvedSubStrand: number;
  missingStandard: number;
  duplicateCodes: string[];
  notes: string[];
}

/** "Exemplars:", "EXEMPLARS", "Exemplar(s):" - the marker that opens the exemplar list, sometimes glued to the end of the indicator's own line. */
/** "APPENDIX: UNPACKING THE CORE COMPETENCES" - the back matter begins. */
const APPENDIX_HEADING = /^\s*APPENDIX\b/i;
const EXEMPLAR_MARKER = /EXEMPLAR\s?\(?S?\)?\s*:?/i;
/** "1." "2)" "E.g.,1." "E.g.2." "E.g.1 Round" "E.g.3:" - a numbered exemplar. Mathematics often drops the dot after the digit. */
const EXEMPLAR_NUMBER = /^(?:E\.?\s?g\.?,?\s*(\d{1,2})[.):]?|(\d{1,2})[.)])\s*(.*)$/i;
/** An "E.g.N" marker glued mid-line after a run of one or two spaces: the exemplar begins there, not on a new line. */
const INLINE_EG = /(?<=\S) {1,2}(?=E\.?\s?g\.?,?\s?\d{1,2}[.):]?\s*\S)/i;
/** A bulleted exemplar, as English lays them out without any numbering. */
const EXEMPLAR_BULLET = /^[\u2022\u25cf\u25aa\u2013\uf0b7\uf0a7\uf0fc\ufffd-]\s*(.*)$/;
/** "i." "ii." "a)" - a sub-point within an exemplar, never an exemplar of its own. */
const SUB_POINT = /^(?:[ivx]{1,4}|[a-h])[.)]\s+/i;

/**
 * Feeds one middle-column line into the open indicator. The line is the
 * indicator's own wording until the exemplar list opens, and the list opens
 * on any of the five conventions the CCP books use: an "Exemplars:" line, a
 * marker glued to the indicator text, a numbered line, an "E.g." numbered
 * line, or a bare bullet. Nesting is decided by indent - a line that starts
 * deeper than the exemplar above it is that exemplar's sub-point.
 */
function consumeMiddle(current: IndicatorDraft, mid: string, indent: number) {
  // "... quantities  E.g.1 Round ..." - an exemplar opened on the same line
  // as the wording before it. Each side is fed on its own.
  const inlineEg = mid.search(INLINE_EG);
  if (inlineEg > 0) {
    consumeMiddle(current, mid.slice(0, inlineEg), indent);
    consumeMiddle(current, mid.slice(inlineEg).trim(), indent + inlineEg + 1);
    return;
  }

  // A marker glued mid-line: what precedes it is still the indicator text.
  const glued = mid.search(EXEMPLAR_MARKER);
  if (glued > 0) {
    const before = mid.slice(0, glued).trim();
    if (before) {
      if (current.inExemplars && current.exemplars.length > 0) current.exemplars[current.exemplars.length - 1].parts.push(before);
      else current.parts.push(before);
    }
    current.inExemplars = true;
    const after = mid.slice(glued).replace(EXEMPLAR_MARKER, "").trim();
    if (after) consumeMiddle(current, after, indent + glued);
    return;
  }
  if (glued === 0) {
    current.inExemplars = true;
    const after = mid.replace(EXEMPLAR_MARKER, "").trim();
    if (after) consumeMiddle(current, after, indent);
    return;
  }

  const last = current.exemplars[current.exemplars.length - 1];
  const isSubPoint = SUB_POINT.test(mid) || (last !== undefined && indent > last.indent + 3);

  const numbered = mid.match(EXEMPLAR_NUMBER);
  if (numbered && !isSubPoint) {
    current.inExemplars = true;
    current.exemplars.push({ number: Number(numbered[1] ?? numbered[2]), parts: [numbered[3]], indent });
    return;
  }
  const bullet = mid.match(EXEMPLAR_BULLET);
  if (bullet && !isSubPoint) {
    current.inExemplars = true;
    current.exemplars.push({ number: current.exemplars.length + 1, parts: [bullet[1]], indent });
    return;
  }

  if (current.inExemplars && last) last.parts.push(mid);
  else current.parts.push(mid);
}

/**
 * Whether a second row bearing the same code is the first row printed again
 * across a page break, rather than a genuinely different indicator the
 * document mis-numbered. The repeat is compared on letters alone because it
 * is often lightly damaged - a stray column fragment glued to its front, a
 * word doubled at the break - and a repeat that carries no wording at all
 * ("Exemplar 1.") is the continuation of the exemplar list.
 */
const lettersOnly = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

/** Keys are "grade.strand" or "grade.strand.subStrand"; the same heading under another grade may carry the full wording. */
function completeHeadingNames(names: Map<string, string>) {
  for (const [key, name] of names) {
    const [, ...rest] = key.split(".");
    for (const grade of [7, 8, 9]) {
      const other = names.get([grade, ...rest].join("."));
      if (other && other.length > name.length && other.toLowerCase().startsWith(name.toLowerCase())) {
        names.set(key, other);
      }
    }
  }
}

function isPageBreakRepeat(first: string, second: string): boolean {
  const a = lettersOnly(first);
  const b = lettersOnly(second);
  if (b.length < 12 || /^exemplars?\d*$/.test(b)) return true;
  if (a.length < 12) return true;
  const head = 30;
  return a.includes(b.slice(0, head)) || b.includes(a.slice(0, head));
}

export function extractSubject(subject: SubjectConfig): { records: ImportRecord[]; report: ExtractionReport; sha256: string } {
  const pdfPath = resolve(JHS_SOURCE_DIR, `${subject.key}.pdf`);
  const txtPath = resolve(JHS_SOURCE_DIR, `${subject.key}.txt`);
  if (!existsSync(pdfPath) || !existsSync(txtPath)) {
    throw new Error(`Missing ${subject.key}.pdf / .txt in ${JHS_SOURCE_DIR} - download the PDF from ${subject.sourceUrl} and run pdftotext -layout on it.`);
  }
  const sha256 = createHash("sha256").update(readFileSync(pdfPath)).digest("hex").toUpperCase();
  const version = `2021-ccp-jhs-${subject.key}`;

  const lines = sourceLines(txtPath);
  const pages = new Map<number, SourceLine[]>();
  for (const line of lines) {
    const list = pages.get(line.pdfPage) ?? [];
    list.push(line);
    pages.set(line.pdfPage, list);
  }

  // Heading names by grade -> strand -> sub-strand, filled as headings are
  // met. A heading can precede its grade's first code, so the current grade
  // is taken from the most recent indicator code seen and the name is filed
  // under every grade until a code corrects it.
  const strandNames = new Map<string, string>();
  const subStrandNames = new Map<string, string>();
  let lastStrandHeading: { number?: number; name: string } | null = null;
  let pendingStrandNumber: number | null = null;
  let currentGrade = 7;

  const drafts: IndicatorDraft[] = [];
  // TypeScript cannot see the closures below assigning these, so they live
  // in a box rather than as narrowed locals.
  const open: { indicator: IndicatorDraft | null; standard: StandardDraft | null } = { indicator: null, standard: null };
  let columns: Columns | null = null;
  let inTable = false;
  let inAppendix = false;

  const closeIndicator = () => {
    if (open.indicator) drafts.push(open.indicator);
    open.indicator = null;
  };

  const startIndicator = (parsed: ParsedCode, pdfPage: number, line: number, raw: string, indent: number) => {
    // The front matter explains the numbering with a worked example
    // ("B7.1.1.1.1 Learning indicator") and a sample table, both of which
    // carry real-looking codes. The curriculum body proper begins at the
    // first numbered strand and sub-strand headings; nothing before them is
    // an indicator.
    if (strandNames.size === 0 || subStrandNames.size === 0) return;
    closeIndicator();
    currentGrade = parsed.grade;
    const draft: IndicatorDraft = {
      code: parsed,
      parts: [],
      exemplars: [],
      inExemplars: false,
      competencies: [],
      pdfPage,
      line,
      raw: [raw],
      notes: parsed.malformed
        ? [`The source prints this reference with six parts ("${parsed.malformed}"); imported under ${parsed.code}. Confirm the intended number against the document.`]
        : [],
    };
    const standard = open.standard;
    if (standard && standard.code.grade === parsed.grade && standard.code.strand === parsed.strand && standard.code.subStrand === parsed.subStrand && standard.code.standard === parsed.standard) {
      draft.standard = standard;
    } else if (standard && standard.code.grade === parsed.grade) {
      // The document sometimes prints one standard for a run of indicators
      // whose 4th part differs by a typo; keep it, but say so.
      draft.standard = standard;
      draft.standardMismatch = true;
      draft.notes.push(`Content standard ${standard.code.code} does not match the indicator's own prefix; bound to the standard the document had open.`);
    }
    open.indicator = draft;
    // The rest of the code's own line goes through the same reader as every
    // later line, so a marker glued to it ("…numbersExemplar(s):") is caught.
    if (parsed.rest) consumeMiddle(draft, parsed.rest, indent);
  };

  for (const pageNumber of [...pages.keys()].sort((a, b) => a - b)) {
    const page = pages.get(pageNumber)!;
    columns = measureColumns(page, columns);

    for (const { text, pdfPage, line } of page) {
      if (!text.trim() || isNoise(text)) continue;

      // The books close with an appendix (the core competencies unpacked,
      // glossary, contributors). Nothing there is an indicator, and nothing
      // there belongs to the indicator that happened to be open before it.
      if (APPENDIX_HEADING.test(text)) {
        inAppendix = true;
        closeIndicator();
        open.standard = null;
        continue;
      }
      if (inAppendix && !STRAND_HEADING.test(text)) continue;
      inAppendix = false;

      if (TABLE_HEADER.test(text)) {
        inTable = true;
        continue;
      }

      // Strand / sub-strand headings sit on their own lines between tables.
      const sub = text.match(SUB_STRAND_HEADING);
      if (sub && !/exemplar/i.test(text)) {
        const name = titleCase(sub[4].replace(/[.:\s]+$/, ""));
        const numbers = sub[1]?.split(".").map(Number);
        const subNumber = numbers ? numbers[numbers.length - 1] : sub[3] ? Number(sub[3]) : undefined;
        const strandNumber =
          numbers && numbers.length === 2 ? numbers[0] : sub[2] ? Number(sub[2]) : lastStrandHeading?.number;
        if (subNumber !== undefined && strandNumber !== undefined) {
          for (const grade of [currentGrade, 7, 8, 9]) {
            const key = `${grade}.${strandNumber}.${subNumber}`;
            if (grade === currentGrade || !subStrandNames.has(key)) subStrandNames.set(key, name);
          }
        }
        continue;
      }
      // "STRAND 4:" with its name on the following line (French).
      const bareStrand = text.match(BARE_STRAND_HEADING);
      if (bareStrand) {
        pendingStrandNumber = Number(bareStrand[1]);
        continue;
      }
      const strand = text.match(STRAND_HEADING) ?? (pendingStrandNumber !== null && !TABLE_HEADER.test(text) ? [text, String(pendingStrandNumber), undefined, undefined, text.trim()] : null);
      pendingStrandNumber = null;
      if (strand && !/^\s*sub/i.test(text)) {
        const name = titleCase(strand[4].replace(/[.:\s]+$/, ""));
        const number = strand[1] ? Number(strand[1]) : strand[2] ? Number(strand[2]) : strand[3] ? Number(strand[3]) : undefined;
        lastStrandHeading = { number, name };
        if (number !== undefined) {
          for (const grade of [currentGrade, 7, 8, 9]) {
            const key = `${grade}.${number}`;
            if (grade === currentGrade || !strandNames.has(key)) strandNames.set(key, name);
          }
        }
        continue;
      }

      if (!inTable || !columns) continue;
      let { left, mid, right } = splitCells(text, columns);
      // Where the middle cell's own content begins - the indent that decides
      // whether an exemplar line is nested. The line's leading whitespace is
      // no use for this: when the standard's wording occupies the left column
      // the line starts at column 0 regardless.
      let midIndent = Math.max(0, columns.mid - 1);
      const strayCode = left ? left.search(INDICATOR_CODE_ANYWHERE_ONCE) : -1;
      if (strayCode > 0) {
        // The indicator column started further left than measured on this
        // page; split at the code so it is read as an indicator, and keep
        // the text before it as the content standard.
        const cut = strayCode;
        const rightStart = Math.max(cut, columns.right - 1);
        left = text.slice(0, cut).trim();
        mid = text.slice(cut, rightStart).trim();
        right = text.slice(rightStart).trim();
        midIndent = cut;
      }
      const midContentAt = text.slice(midIndent).search(/\S/);
      if (midContentAt >= 0) midIndent += midContentAt;

      // Left column: the content standard, which commonly wraps over many lines.
      if (left) {
        const parsed = parseCode(left);
        if (parsed && parsed.indicator === undefined) {
          open.standard = { code: parsed, parts: parsed.rest ? [parsed.rest] : [] };
        } else if (parsed && parsed.indicator !== undefined && !mid) {
          // An indicator code the geometry put in the left cell - the column
          // edge drifted on this page. Treat the whole line as the middle.
          startIndicator(parsed, pdfPage, line, text, midIndent);
          continue;
        } else if (open.standard && !parsed) {
          open.standard.parts.push(left);
        }
      }

      // Middle column: indicators and their exemplars.
      if (mid) {
        const parsed = parseCode(mid);
        const current = open.indicator;
        if (parsed && parsed.indicator !== undefined) {
          startIndicator(parsed, pdfPage, line, text, midIndent);
        } else if (parsed && parsed.indicator === undefined) {
          // A content-standard code in the middle column: the left column was
          // empty and the geometry slid. Keep it as the standard.
          open.standard = { code: parsed, parts: parsed.rest ? [parsed.rest] : [] };
        } else if (current) {
          current.raw.push(text);
          consumeMiddle(current, mid, midIndent);
        }
      }

      // Right column: core competencies, kept as guidance on the indicator.
      if (right && open.indicator && !TABLE_HEADER.test(right)) {
        open.indicator.competencies.push(right);
      }
    }
  }
  closeIndicator();

  // Resolve names, then build records - with duplicate handling that never
  // drops a row.
  const report: ExtractionReport = {
    subject: subject.subjectName,
    indicators: { B7: 0, B8: 0, B9: 0 },
    exemplars: 0,
    needsReview: 0,
    blankText: 0,
    unresolvedStrand: 0,
    unresolvedSubStrand: 0,
    missingStandard: 0,
    duplicateCodes: [],
    notes: [],
  };

  // A heading cut short by the page layout ("SUB-STRAND 1: PRODUCTION AND")
  // is printed in full for another grade; the fuller wording that begins
  // with the short one is the same heading, and every grade gets it.
  completeHeadingNames(strandNames);
  completeHeadingNames(subStrandNames);

  // Fold page-break repeats into the row they repeat, and give a genuinely
  // reused number a suffix - before any record is built, so the folded
  // exemplars end up in the output.
  const seen = new Map<string, IndicatorDraft>();
  const finalCodes = new Map<IndicatorDraft, string>();
  const merged: IndicatorDraft[] = [];
  for (const draft of drafts) {
    const text = cleanText(draft.parts);
    const previous = seen.get(draft.code.code);
    if (previous && isPageBreakRepeat(cleanText(previous.parts), text)) {
      // The row was printed again at the top of the next page. Keep the
      // fuller wording of the two (the repeat is sometimes garbled by column
      // bleed) and fold the exemplars together.
      if (text.length > cleanText(previous.parts).length) previous.parts = draft.parts;
      // A repeat sometimes reprints exemplars already listed, not just the
      // ones that spilled over; only what is new is folded in.
      const known = new Set(previous.exemplars.map((exemplar) => lettersOnly(cleanText(exemplar.parts))));
      for (const exemplar of draft.exemplars) {
        const key = lettersOnly(cleanText(exemplar.parts));
        if (key.length >= 12 && known.has(key)) continue;
        known.add(key);
        previous.exemplars.push(exemplar);
      }
      previous.competencies.push(...draft.competencies);
      previous.raw.push(...draft.raw);
      continue;
    }
    let code = draft.code.code;
    if (previous) {
      let suffix = 2;
      while (seen.has(`${code}-${suffix}`)) suffix++;
      code = `${code}-${suffix}`;
      draft.notes.push(`The source reuses indicator number ${draft.code.code} for different wording; imported under ${code}. Confirm the intended numbering against the document.`);
      report.duplicateCodes.push(draft.code.code);
    }
    seen.set(code, draft);
    finalCodes.set(draft, code);
    merged.push(draft);
  }

  const records: ImportRecord[] = [];

  for (const draft of merged) {
    const { grade, strand, subStrand, standard: standardNumber, indicator } = draft.code;
    const gradeMeta = GRADES[grade];
    if (!gradeMeta) continue;
    const code = finalCodes.get(draft) ?? draft.code.code;

    let text = cleanText(draft.parts);
    const strandName = strandNames.get(`${grade}.${strand}`) ?? (lastStrandHeading?.number === strand ? lastStrandHeading.name : undefined);
    const subStrandName = subStrandNames.get(`${grade}.${strand}.${subStrand}`);

    const notes = [...draft.notes];
    let confidence: ImportRecord["extractionConfidence"] = draft.code.malformed || code !== draft.code.code ? "low" : "high";
    // No CCP subject has more than a dozen strands; a larger number is the
    // grade digit fused onto the strand ("B982.1.1.1" for B9.2.1.1.1).
    if (strand > 12) {
      notes.push(`Strand number ${strand} is implausible - the source probably reads "B${grade}${strand}…" for B${grade}.${String(strand).slice(-1)}.…; confirm against the document.`);
      confidence = "low";
    }
    // A placeholder heading is what a teacher would see in the selector, so
    // it is a gap to review, not a detail to note.
    if (!strandName) { notes.push("Strand name not found in a heading; a placeholder name is used."); report.unresolvedStrand++; confidence = "low"; }
    if (!subStrandName) { notes.push("Sub-strand name not found in a heading; a placeholder name is used."); report.unresolvedSubStrand++; confidence = "low"; }
    if (draft.standardMismatch && confidence === "high") confidence = "medium";
    const standardCode = draft.standard?.code.code;
    const standardText = draft.standard ? cleanText(draft.standard.parts) : "";
    if (!standardCode) { notes.push("No content standard was open when this indicator began."); report.missingStandard++; if (confidence === "high") confidence = "medium"; }
    if (!text) {
      notes.push("The indicator line carried no wording in the source; only the code was read.");
      report.blankText++;
      confidence = "low";
      text = `[Indicator ${draft.code.code} - wording not extracted; see source page ${draft.pdfPage}]`;
    } else if (text.length < 15) {
      notes.push("Indicator wording is unusually short; check it against the source page.");
      confidence = "low";
    }

    // The right column's competency names, when the layout pass glued them
    // into the text without a gap the column split could see. Rare, but a
    // teacher should not meet "Digital Literacy (DL)" mid-sentence unwarned.
    const bled = [text, ...draft.exemplars.map((exemplar) => cleanText(exemplar.parts))].some((value) => COMPETENCY_NAME_INSIDE.test(value));
    if (bled) {
      notes.push("Core-competency wording appears inside the text; the right column may have bled in. Check against the source page.");
      confidence = "low";
    }

    const needsReview = confidence === "low";
    if (needsReview) report.needsReview++;
    report.indicators[gradeMeta.code]++;

    const exemplars = draft.exemplars
      .map((exemplar, index) => ({ exemplar, text: cleanText(exemplar.parts), index }))
      .filter(({ text }) => text.length > 0)
      .map(({ exemplar, text, index }) => ({
        code: `${code}.E${index + 1}`,
        text,
        sortOrder: index + 1,
        revision: version,
        documentSha256: sha256,
        pdfPage: draft.pdfPage,
        sourceReference: `${code} exemplar ${exemplar.number}`,
        extractionConfidence: text.length < 12 ? ("low" as const) : ("high" as const),
        reviewStatus: text.length < 12 ? ("needs-review" as const) : ("pending" as const),
        ambiguityFlag: text.length < 12,
        rawSourceText: exemplar.parts.join("\n").slice(0, 2000),
      }));
    report.exemplars += exemplars.length;

    const guidanceText = cleanText(draft.competencies);
    const guidance = guidanceText
      ? guidanceText
          .split(/(?=\b(?:CP|CC|CI|DL|CG|PL|PD)\s?\d+\.\d+)/)
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 3)
          .slice(0, 12)
          .map((segment, index) => ({
            target: "indicator" as const,
            kind: "core_competency" as const,
            text: segment.slice(0, 600),
            sortOrder: index + 1,
            documentSha256: sha256,
            pdfPage: draft.pdfPage,
            sourceReference: `${code} core competencies`,
            extractionConfidence: "medium" as const,
            reviewStatus: "pending" as const,
            ambiguityFlag: false as const,
          }))
      : [];

    records.push({
      curriculumSlug: "ghana-nacca-sbc",
      curriculumName: "Ghana NaCCA Standards-Based Curriculum",
      countryCode: "GH",
      authority: "NaCCA",
      version,
      levelCode: "JHS",
      levelName: "JHS",
      gradeCode: gradeMeta.code,
      gradeName: gradeMeta.name,
      gradeAliases: gradeMeta.aliases,
      gradeSortOrder: gradeMeta.sortOrder,
      typicalAgeMin: gradeMeta.ageMin,
      typicalAgeMax: gradeMeta.ageMax,
      subjectSlug: subject.subjectSlug,
      subjectName: subject.subjectName,
      subjectSortOrder: subject.subjectSortOrder,
      strandCode: `${grade}.${strand}`,
      strandName: strandName ?? `Strand ${strand}`,
      strandSortOrder: strand,
      subStrandCode: `${grade}.${strand}.${subStrand}`,
      subStrandName: subStrandName ?? `Sub-strand ${strand}.${subStrand}`,
      subStrandSortOrder: subStrand,
      contentStandardCode: standardCode,
      contentStandardText: standardText || undefined,
      contentStandardSortOrder: standardNumber,
      indicatorCode: code,
      indicatorText: text,
      indicatorSortOrder: indicator ?? 0,
      bloomsLevel: null,
      documentSha256: sha256,
      pdfPage: draft.pdfPage,
      sourceReference: `${draft.code.code} (p.${draft.pdfPage}, line ${draft.line})${notes.length ? " - " + notes.join(" ") : ""}`,
      extractionConfidence: confidence,
      reviewStatus: needsReview ? "needs-review" : "pending",
      ambiguityFlag: needsReview,
      rawSourceText: draft.raw.join("\n").slice(0, 4000),
      guidance,
      exemplars,
    });
  }

  if (records.length === 0) report.notes.push("No indicators were extracted - the layout may not be the CCP table this extractor reads.");
  return { records, report, sha256 };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function main() {
  const only = process.argv[2];
  const targets = only ? SUBJECTS.filter((s) => s.key === only || s.subjectSlug === only) : SUBJECTS;
  if (targets.length === 0) throw new Error(`Unknown subject "${only}". Known: ${SUBJECTS.map((s) => s.key).join(", ")}`);

  const summary: ExtractionReport[] = [];
  for (const subject of targets) {
    const { records, report, sha256 } = extractSubject(subject);
    const envelope = {
      manifest: {
        schemaVersion: "1",
        releaseStatus: "approved",
        documents: [
          {
            organization: ORGANIZATION,
            title: subject.title,
            publicationDate: "2021",
            version: "2021",
            sourceUrl: subject.sourceUrl,
            coverage: `${subject.subjectName}, JHS 1-3 (B7-B9), Common Core Programme`,
            sha256,
            extractionVersion: EXTRACTION_VERSION,
          },
        ],
      },
      records,
    };
    const out = resolve(JHS_SOURCE_DIR, `jhs-${subject.key}-2021.json`);
    writeFileSync(out, JSON.stringify(envelope, null, 2));
    summary.push(report);
    console.log(
      `${subject.subjectName.padEnd(32)} B7=${String(report.indicators.B7).padStart(3)} B8=${String(report.indicators.B8).padStart(3)} B9=${String(report.indicators.B9).padStart(3)}  exemplars=${String(report.exemplars).padStart(4)}  needs-review=${String(report.needsReview).padStart(3)}  blank=${report.blankText} noStrand=${report.unresolvedStrand} noSub=${report.unresolvedSubStrand} noCS=${report.missingStandard} dup=${report.duplicateCodes.length}  -> ${out}`
    );
    for (const note of report.notes) console.log(`   ! ${note}`);
  }
  writeFileSync(resolve(JHS_SOURCE_DIR, "jhs-extraction-report.json"), JSON.stringify(summary, null, 2));
}

// Run only as a script, so tests and probes can import the parser without
// triggering a full extraction.
if (process.argv[1] && /extract-jhs-ccp\.(ts|js)$/.test(process.argv[1])) main();
