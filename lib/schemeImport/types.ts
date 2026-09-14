import type { NormalizedSchemeWeek } from "./normalizeRows";

export interface ParsedSchemeSection {
  /**
   * Heading text that plausibly names a *subject* (e.g. "BASIC 4 - ENGLISH
   * LANGUAGE - FIRST TERM"), or null when this table sits under a heading
   * that named a strand instead - a subject's scheme is routinely split into
   * one table per strand, and only the first of them carries the subject
   * name. importScheme.ts carries the last named subject forward across the
   * nulls. Never a curriculum-DB lookup - that happens later in
   * importScheme.ts.
   */
  subjectHint: string | null;
  /** The "STRAND n: ..." heading this table sits under, when the strand is named above the table rather than in a Strand column. */
  strandHint: string | null;
  weeks: NormalizedSchemeWeek[];
}

export interface ParseResult {
  sections: ParsedSchemeSection[];
  warnings: string[];
}
