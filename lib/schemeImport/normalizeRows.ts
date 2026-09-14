// Shared, format-agnostic scheme-of-learning row normalizer. Both the DOCX
// and PDF parsers (see parseDocx.ts / parsePdf.ts) reduce their very
// different raw extraction into the same `RawTableRow[]` shape, then this
// module does all the actual interpretation - so DOCX and PDF converge
// immediately after extraction and every quirk-handling rule lives in one
// place.

export interface RawTableRow {
  /** Cell text in left-to-right column order, exactly as extracted (no trimming yet). */
  cells: string[];
}

export type ColumnKind =
  | "week"
  | "strand"
  | "subStrand"
  | "contentStandard"
  | "indicators"
  | "resources"
  | "unknown";

export interface NormalizedIndicator {
  code: string;
  text?: string;
}

export interface NormalizedSchemeWeek {
  weekNumber: number;
  isNonTeachingWeek: boolean;
  nonTeachingLabel?: string;
  strandText?: string;
  subStrandText?: string;
  contentStandardCode?: string;
  contentStandardText?: string;
  resourcesText?: string;
  rawRowText: string;
  indicators: NormalizedIndicator[];
}

export interface NormalizeResult {
  weeks: NormalizedSchemeWeek[];
  warnings: string[];
}

const NON_TEACHING_KEYWORDS = /\b(revision|exam(?:ination)?s?|mid[-\s]?term|holiday|break)\b/i;
// e.g. "B4.1.1.1" (content standard) or "B4.1.1.1.1" (indicator) - any depth.
// Tolerates a stray space after a dot (e.g. "B4. 1.1.1.5"), a common typing
// artifact in real scheme documents.
const CODE_PATTERN = /([A-Z]\d+(?:\.\s*\d+)+)/;
const RANGE_PATTERN = /([A-Z]\d+(?:\.\s*\d+)+)\s*[-\u2013\u2014]\s*([A-Z]\d+(?:\.\s*\d+)+)/;

function normalizeCell(value: string | undefined): string {
  // Collapse horizontal whitespace but preserve line breaks - splitIndicators
  // relies on "\n" to tell separate indicators apart within one cell.
  return (value ?? "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Maps a header row's cell text to the column it represents. Deliberately
 * tolerant of real-world naming variance across schools ("WK" vs "Week",
 * "Period" vs "Week Ending", etc.) - a best-effort match is far more useful
 * than rejecting the whole file over a naming difference.
 */
export function detectColumnMapping(headerCells: string[]): ColumnKind[] {
  return headerCells.map((raw) => {
    const cell = normalizeCell(raw).toLowerCase();
    if (/\bwk\b|week|period|day\s*\/?\s*date/.test(cell)) return "week";
    // "SUB- STRAND" (dash *and* space) and "SUBSTRAND" are both common in
    // real documents - matching only "sub-strand"/"sub strand" used to let
    // these fall through to the generic /strand/ test below, silently filing
    // every sub-strand under the Strand column.
    if (/sub[\s\-–—]*(strand|theme)/.test(cell)) return "subStrand";
    if (/strand|theme|topic/.test(cell)) return "strand";
    if (/content\s*standard|c\.?\s*s\.?\b/.test(cell)) return "contentStandard";
    if (/indicator|learning\s*outcome|performance\s*indicator/.test(cell)) return "indicators";
    if (/resource|t\s*\/?\s*l\s*r|tlr/.test(cell)) return "resources";
    return "unknown";
  });
}

/** A header cell is a short label. Anything longer is prose from a data row. */
const MAX_HEADER_CELL_LENGTH = 48;

/**
 * A row "looks like" a header if it names at least two recognizable scheme
 * columns - a Week column is common but not required (some schools imply
 * week numbers by row grouping instead), so requiring it here would reject
 * otherwise-perfectly-readable tables just for a naming/layout difference.
 *
 * Keyword presence alone is not enough, though: a *data* row commonly reads
 * "1 | STRAND 1: DIVERSITY OF MATTER | Sub-Strand 1: Living things | B4.1.1.1
 * Understand... | B4.1.1.1.1 Classify..." and so names two column keywords
 * too. Treating that as a header row split real subject tables apart
 * mid-page and re-anchored every column onto the wrong X positions. So a
 * header row must also *look* like one: every cell a short label, none
 * carrying indicator/content-standard codes, and most cells recognized.
 */
export function looksLikeHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.map((c) => normalizeCell(c)).filter(Boolean);
  if (nonEmpty.length === 0) return false;

  const mapping = detectColumnMapping(nonEmpty);
  const knownCount = mapping.filter((k) => k !== "unknown").length;
  if (knownCount < 2) return false;
  if (nonEmpty.some((cell) => cell.length > MAX_HEADER_CELL_LENGTH)) return false;
  if (nonEmpty.some((cell) => CODE_PATTERN.test(cell))) return false;
  return knownCount / nonEmpty.length >= 0.6;
}

/**
 * Removes the stray spaces real scheme documents sprinkle inside a code
 * ("B4.1. 3.1.2", "B4. 1.4.1.2") and drops a trailing dot, so the stored code
 * is the one the curriculum database knows. CODE_PATTERN deliberately
 * tolerates those spaces when *finding* a code; keeping them in the stored
 * value would just make every such indicator unmatchable.
 */
function tidyCode(code: string): string {
  return code.replace(/\s+/g, "").replace(/\.$/, "");
}

/**
 * Drops the punctuation left stranded at the front of a statement once its
 * code has been split off - "B4.1.1.1: Demonstrate..." leaves ": Demonstrate",
 * and a code written with a trailing dot ("B4.1.1.1.1.") leaves ". Listen".
 * Without this the lesson plan prints "B4.1.1.1: : Demonstrate...".
 */
function stripLeadingPunctuation(text: string): string {
  return text.replace(/^[\s:.\-–—]+/, "").trim();
}

/** Splits a content-standard cell into its leading code and descriptive text. */
function splitCodeAndText(cell: string): { code?: string; text?: string } {
  const trimmed = normalizeCell(cell);
  if (!trimmed) return {};
  const match = trimmed.match(new RegExp(`^${CODE_PATTERN.source}\\s*(.*)$`, "s"));
  if (!match) return { text: trimmed };
  return { code: tidyCode(match[1]), text: stripLeadingPunctuation(match[2]) || undefined };
}

/**
 * Splits an indicators cell (often several indicators, one per line/sentence)
 * into individual entries. Continuation lines (wrapped text with no leading
 * code) are appended to the previous indicator's text. Tolerates stray
 * leading characters before the code (e.g. "B B4.1.2.1.1 ...") by searching
 * for the code pattern anywhere near the start of the line rather than
 * anchoring to position 0. Expands "CODE1 - CODE2" range notation into two
 * entries sharing the same text.
 */
function splitIndicators(cell: string): NormalizedIndicator[] {
  const lines = cell
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const indicators: NormalizedIndicator[] = [];
  for (const line of lines) {
    const range = line.match(new RegExp(`^${RANGE_PATTERN.source}\\s*(.*)$`));
    if (range) {
      const text = stripLeadingPunctuation(range[3]) || undefined;
      indicators.push({ code: tidyCode(range[1]), text });
      indicators.push({ code: tidyCode(range[2]), text });
      continue;
    }

    const match = line.match(new RegExp(`${CODE_PATTERN.source}\\s*(.*)$`));
    if (match) {
      indicators.push({ code: tidyCode(match[1]), text: stripLeadingPunctuation(match[2]) || undefined });
    } else if (indicators.length > 0 && indicators[indicators.length - 1].code) {
      // Wrapped continuation of the previous (coded) indicator's text - only
      // merge onto an entry that has a real code, so two genuinely separate
      // uncoded lines don't get collapsed into one indicator.
      const prev = indicators[indicators.length - 1];
      prev.text = [prev.text, line].filter(Boolean).join(" ");
    } else {
      // No code found, and nothing coded to attach it to as a continuation -
      // still keep the teacher's text rather than silently discarding it;
      // normalizeSchemeRows assigns a placeholder code and flags it for review.
      indicators.push({ code: "", text: line });
    }
  }
  return indicators;
}

// A school term runs ~12-16 weeks; 60 is generous headroom for a whole-year
// scheme. Anything above it is a year ("2026/2027") or a page number that a
// running page header dropped into the Week column, not a week.
const MAX_PLAUSIBLE_WEEK_NUMBER = 60;

function parseWeekNumber(cell: string): number | null {
  const match = normalizeCell(cell).match(/\d+/);
  if (!match) return null;
  const value = Number(match[0]);
  return value >= 1 && value <= MAX_PLAUSIBLE_WEEK_NUMBER ? value : null;
}

/**
 * Reassembles a Strand / Sub-strand value that a PDF broke across several
 * wrapped text lines. A merged Strand cell spanning weeks 1-5 reads
 * "STRAND 1:" / "DIVERSITY" / "OF" / "MATTER" down the page, and because
 * each of those lines sits beside a different week's row, the fragments land
 * on different weeks - producing strands named "OF MATTER" and a Strand
 * dropdown full of nonsense.
 *
 * The rule is narrow on purpose: a fragment is only stitched onto the
 * previous value when this document labels its strands ("STRAND 2: CYCLES",
 * "Sub-strand 1: Songs"), because then any *unlabelled* cell can only be a
 * wrapped continuation. A scheme that names its strands plainly ("Number",
 * "Algebra") never has a labelled cell, so the rule never fires and each
 * row keeps its own value.
 */
class WrappedColumnJoiner {
  private readonly labelPattern: RegExp;
  private groups: string[] = [];
  private sawLabel = false;

  constructor(labelPattern: RegExp) {
    this.labelPattern = labelPattern;
  }

  /** Returns the index of the group this cell belongs to. */
  push(cell: string): number {
    const flat = cell.replace(/\s+/g, " ").trim();
    const startsNewValue = this.labelPattern.test(flat);
    if (startsNewValue) this.sawLabel = true;

    if (this.groups.length === 0 || startsNewValue || !this.sawLabel) {
      this.groups.push(flat);
    } else {
      const current = this.groups[this.groups.length - 1];
      // A word hyphenated across the line break ("Living and Non-" +
      // "Living Things") rejoins without the space.
      const separator = current.endsWith("-") ? "" : " ";
      this.groups[this.groups.length - 1] = `${current}${separator}${flat}`.trim();
    }
    return this.groups.length - 1;
  }

  /** The completed value for a group - only final once every row has been pushed. */
  resolve(groupIndex: number): string | undefined {
    return this.groups[groupIndex] || undefined;
  }
}

const STRAND_LABEL = /^(strand|theme)\b/i;
const SUB_STRAND_LABEL = /^sub[\s\-–—]*(strand|theme)\b/i;

/**
 * Normalizes raw table rows (already split into cells, in header-row column
 * order) into structured weeks. `headerCells` is used only to determine the
 * column mapping; `dataRows` are every row after it.
 */
export function normalizeSchemeRows(headerCells: string[], dataRows: RawTableRow[]): NormalizeResult {
  const mapping = detectColumnMapping(headerCells);
  const warnings: string[] = [];
  const weeks: NormalizedSchemeWeek[] = [];

  // Strand/sub-strand values are resolved in a second pass: a wrapped value
  // isn't complete until every row has been read (see WrappedColumnJoiner),
  // so rows record a group index now and read the finished text at the end.
  const strandJoiner = new WrappedColumnJoiner(STRAND_LABEL);
  const subStrandJoiner = new WrappedColumnJoiner(SUB_STRAND_LABEL);
  const strandGroupByWeek: (number | undefined)[] = [];
  const subStrandGroupByWeek: (number | undefined)[] = [];
  let lastStrandGroup: number | undefined;
  let lastSubStrandGroup: number | undefined;
  let lastContentStandardCode: string | undefined;
  let lastContentStandardText: string | undefined;
  let previousWeekNumber = 0;

  for (const row of dataRows) {
    const get = (kind: ColumnKind): string => {
      const idx = mapping.indexOf(kind);
      return idx === -1 ? "" : normalizeCell(row.cells[idx]);
    };

    const rawRowText = row.cells.map((c) => normalizeCell(c)).filter(Boolean).join(" | ");
    if (!rawRowText) continue; // fully blank row (spacer) - not a warning-worthy case

    const weekCellRaw = get("week");
    let weekNumber = parseWeekNumber(weekCellRaw);
    if (weekNumber === null) {
      warnings.push(`Row "${rawRowText.slice(0, 80)}" has no readable week number - guessed week ${previousWeekNumber + 1}.`);
      weekNumber = previousWeekNumber + 1;
    }
    previousWeekNumber = weekNumber;

    const strandCellRaw = get("strand");
    const subStrandCellRaw = get("subStrand");
    const contentStandardCellRaw = get("contentStandard");
    const indicatorsCellRaw = get("indicators");
    const resourcesCellRaw = get("resources");

    // Non-teaching weeks (Revision / Exams / etc.) typically have no content
    // standard or indicators at all - just one keyword-bearing cell.
    const candidateLabel = [strandCellRaw, subStrandCellRaw, contentStandardCellRaw]
      .find((cell) => NON_TEACHING_KEYWORDS.test(cell));
    if (!contentStandardCellRaw && !indicatorsCellRaw && candidateLabel) {
      weeks.push({
        weekNumber,
        isNonTeachingWeek: true,
        nonTeachingLabel: candidateLabel,
        rawRowText,
        indicators: [],
      });
      continue;
    }

    // Carry forward blank Strand/Sub-strand/Content Standard cells (merged
    // cells in the source table collapse to empty strings once extracted) -
    // a content standard commonly spans several weeks, with only the later
    // weeks' new indicators printed. Carry-forward only applies to a fully
    // blank cell (a genuine merged continuation) - if a row has its own text
    // but no parsed code, that's a data-quality gap in the source, not a
    // continuation, so we don't splice in a different week's code.
    if (strandCellRaw) lastStrandGroup = strandJoiner.push(strandCellRaw);
    if (subStrandCellRaw) lastSubStrandGroup = subStrandJoiner.push(subStrandCellRaw);

    const splitStandard = splitCodeAndText(contentStandardCellRaw);
    let contentStandardCode = splitStandard.code;
    let contentStandardText = splitStandard.text;
    if (!contentStandardCellRaw) {
      contentStandardCode = lastContentStandardCode;
      contentStandardText = lastContentStandardText;
    }
    if (contentStandardCode) lastContentStandardCode = contentStandardCode;
    if (contentStandardText) lastContentStandardText = contentStandardText;
    const indicators = splitIndicators(indicatorsCellRaw);

    // Assign a placeholder code to any indicator whose text carried no
    // recognizable code, so it's still imported (and can still be generated
    // from) instead of being silently dropped - just flagged for review.
    indicators.forEach((ind, i) => {
      if (!ind.code) {
        ind.code = `UNCODED-W${weekNumber}-${i + 1}`;
        warnings.push(`Week ${weekNumber}: indicator "${(ind.text ?? "").slice(0, 60)}" had no code in the source - imported as-is (${ind.code}) using the scheme's own wording.`);
      }
    });

    if (contentStandardCellRaw && !contentStandardCode) {
      warnings.push(`Week ${weekNumber}: content standard had no code in the source - kept exactly as written ("${contentStandardCellRaw.slice(0, 60)}").`);
    }
    if (!contentStandardCellRaw && !indicatorsCellRaw) {
      warnings.push(`Week ${weekNumber}: no content standard or indicators were present in the source for this row.`);
    }
    if (indicatorsCellRaw && indicators.length === 0) {
      warnings.push(`Week ${weekNumber}: indicator text found but no code pattern was recognized ("${indicatorsCellRaw.slice(0, 60)}").`);
    }

    strandGroupByWeek[weeks.length] = lastStrandGroup;
    subStrandGroupByWeek[weeks.length] = lastSubStrandGroup;
    weeks.push({
      weekNumber,
      isNonTeachingWeek: false,
      contentStandardCode,
      contentStandardText,
      resourcesText: resourcesCellRaw || undefined,
      rawRowText,
      indicators,
    });
  }

  weeks.forEach((week, i) => {
    if (week.isNonTeachingWeek) return;
    const strandGroup = strandGroupByWeek[i];
    const subStrandGroup = subStrandGroupByWeek[i];
    if (strandGroup !== undefined) week.strandText = strandJoiner.resolve(strandGroup);
    if (subStrandGroup !== undefined) week.subStrandText = subStrandJoiner.resolve(subStrandGroup);
  });

  return { weeks, warnings };
}
