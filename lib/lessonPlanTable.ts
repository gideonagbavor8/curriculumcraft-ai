import type { LessonHeader, LessonPhase } from "@/types/curriculum";
import { flattenMarkdown } from "@/lib/lessonPhases";
import { parseInlineRuns, type InlineRun } from "@/lib/markdownBlocks";

/**
 * A cell's text split into bold/italic/plain runs. The generator writes its
 * output in markdown, so a cell commonly arrives as "**Critical Thinking:**
 * Learners analyse..."; printing that string verbatim leaks the asterisks into
 * the lesson plan. Parsing once here means the screen, the Word export and the
 * PDF each draw real emphasis from the same runs.
 */
export function cellRuns(value: string): InlineRun[] {
  return parseInlineRuns(value);
}

/**
 * The GES/NaCCA lesson plan as a single table - the form a Ghanaian teacher
 * actually teaches from and submits. This module is the one definition of that
 * layout; the on-screen table, the Word export and the PDF export all render
 * what it returns, so the three can never drift into different shapes.
 *
 * The layout, top to bottom:
 *
 *   Date | Time | Class | Class size | Subject | Strand | Sub-strand
 *   Content Standard | Indicators | References
 *   Keywords
 *   Performance Standards | Core Competencies
 *   Time/Phases | Learner Activity | TLM/TLRs      <- one row per phase
 */

export interface LessonTableCell {
  label: string;
  /** The cell text with its markdown markers still in place - render it through cellRuns(). */
  value: string;
}

/** A band of the table: a set of labelled cells laid out across one row. */
export interface LessonTableRow {
  cells: LessonTableCell[];
}

export interface LessonPhaseRow {
  phase: string;
  time: string;
  learnerActivity: string;
  resources: string;
}

export interface LessonPlanTableModel {
  /** The identifying row: date, time, class, class size, subject, strand, sub-strand. */
  identity: LessonTableRow;
  /** Content Standard | Indicators | References. */
  curriculum: LessonTableRow;
  /** Keywords, on its own full-width row. */
  keywords: LessonTableCell;
  /** Performance Standards | Core Competencies. */
  standards: LessonTableRow;
  /** The delivery phases - Time/Phases | Learner Activity | TLM/TLRs. */
  phases: LessonPhaseRow[];
}

/**
 * Past this many characters a curriculum statement no longer fits its cell
 * without crushing the rest of the table, so only its code is printed. A
 * teacher reads the full wording from the curriculum or the scheme against
 * that code - which is exactly how the codes are used in the staffroom.
 */
const MAX_CURRICULUM_CELL_LENGTH = 140;

/** The code alone once the wording is too long for the cell, the code and wording together while it fits. */
export function codeOrFullText(code: string | undefined, text: string | undefined): string {
  const cleanText = text ? flattenMarkdown(text) : "";
  if (!code) return cleanText || "—";
  if (!cleanText) return code;
  const combined = `${code}: ${cleanText}`;
  return combined.length > MAX_CURRICULUM_CELL_LENGTH ? code : combined;
}

/** Joins several indicator codes/texts into one cell, shortening to codes as soon as the whole cell would overflow. */
export function indicatorsCell(indicators: { code: string; text?: string }[]): string {
  if (indicators.length === 0) return "—";
  const full = indicators.map((ind) => codeOrFullText(ind.code, ind.text)).join("\n");
  return full.length > MAX_CURRICULUM_CELL_LENGTH ? indicators.map((ind) => ind.code).join(", ") : full;
}

function value(text: string | undefined): string {
  const flat = text ? flattenMarkdown(text) : "";
  return flat || "—";
}

/**
 * Builds the table for one generated lesson. `date` is the calendar date the
 * lesson is taught on, which the header carries as its Week Ending / Day
 * fields; everything else comes from the lesson itself.
 */
export function buildLessonPlanTable(
  header: LessonHeader,
  phases: LessonPhase[],
  indicators?: { code: string; text?: string }[]
): LessonPlanTableModel {
  return {
    identity: {
      cells: [
        { label: "Date", value: value(header.lessonDate ?? header.weekEnding) },
        { label: "Day", value: value(header.day) },
        { label: "Time", value: `${header.duration} minutes` },
        { label: "Class", value: `${header.gradeName} (${header.grade})` },
        { label: "Class Size", value: value(header.classSize) },
        { label: "Subject", value: value(header.subject) },
        { label: "Strand", value: value(header.strand) },
        { label: "Sub-Strand", value: value(header.subStrand) },
      ],
    },
    curriculum: {
      cells: [
        { label: "Content Standard", value: codeOrFullText(header.contentStandardCode, header.contentStandardText) },
        {
          label: "Indicators",
          value: indicatorsCell(
            indicators ?? [{ code: header.indicatorCode, text: header.indicatorText }]
          ),
        },
        { label: "References", value: value(header.reference) },
      ],
    },
    keywords: { label: "Keywords", value: value(header.keywords) },
    standards: {
      cells: [
        { label: "Performance Standards", value: value(header.performanceIndicator) },
        { label: "Core Competencies", value: value(header.coreCompetencies) },
      ],
    },
    phases: phases.map((phase) => ({
      phase: phase.phase,
      time: phase.time || "—",
      learnerActivity: phase.learnerActivity || "—",
      // A phase with no materials of its own falls back to the lesson's
      // overall resources rather than printing a dash at the teacher.
      resources: phase.resources || value(header.teachingLearningResources),
    })),
  };
}
