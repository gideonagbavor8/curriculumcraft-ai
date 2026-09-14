import type { LessonPhase } from "@/types/curriculum";

// Pure text parsing of the generator's markdown into the structured pieces the
// lesson-plan table needs. Kept free of any database or network import so the
// parsing rules can be tested directly.

// Pull one "### Heading" block out of the AI-generated teacher notes, so it can
// be surfaced as its own structured header field instead of buried in prose.
export function extractHeadingSection(markdown: string, heading: string): string | undefined {
  const pattern = new RegExp(String.raw`### ${heading}\s*\n([\s\S]*?)(?=\n### |$)`, "i");
  const match = markdown.match(pattern);
  return match?.[1]?.trim() || undefined;
}

/** The lesson's delivery phases, in teaching order - the rows of the lesson-plan table. */
const LESSON_PHASES = ["Starter", "Main Activity", "Guided Practice", "Independent Practice", "Plenary"] as const;

/** "**Time:**", "**Learner Activity**:", "**TLM/TLRs:**" - the label opening a field, however the colon fell. */
const LABEL_LINE = /^\*\*\s*([^*:]+?)\s*:?\s*\*\*\s*:?\s*(.*)$/;

/** Which parsed label feeds which column, matched case-insensitively on the label's letters only. */
const TIME_LABELS = new Set(["time", "timephase", "timephases", "duration"]);
const ACTIVITY_LABELS = new Set(["learneractivity", "learneractivities", "activity", "activities"]);
const RESOURCE_LABELS = new Set(["tlm", "tlms", "tlr", "tlrs", "tlmtlr", "tlmtlrs", "tlmstlrs", "resources", "materials"]);

function labelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Splits a phase section into its "**Label:** value" fields. Walking the lines
 * rather than matching one regex per label is what lets a field's value wrap
 * onto following lines (a generator commonly continues a Learner Activity as
 * "- " bullets underneath) without swallowing the next label.
 */
function parseLabelledFields(section: string): Map<string, string[]> {
  const fields = new Map<string, string[]>();
  let current: string[] | null = null;

  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(LABEL_LINE);
    if (match) {
      current = [];
      fields.set(labelKey(match[1]), current);
      if (match[2].trim()) current.push(match[2].trim());
      continue;
    }
    // Kept with its bullet marker intact - flattenMarkdown reads the markers
    // to decide how the lines join, so stripping them here would lose that.
    if (current) current.push(line);
  }
  return fields;
}

function stripBullet(line: string): string {
  return line.replace(/^[-*•]\s*/, "").trim();
}

function fieldValue(fields: Map<string, string[]>, labels: Set<string>): string {
  for (const [key, lines] of fields) {
    if (labels.has(key)) return flattenMarkdown(lines.join("\n"));
  }
  return "";
}

/**
 * Flattens a markdown fragment to a single line for a table cell.
 *
 * A fragment carrying bullets needs a separator, or its items run together
 * into one phrase - a keyword list printed as "Stress Rhythm Actions Lyrics
 * Song" reads as nonsense. Which separator depends on what the items are:
 * single-word items are a list and take commas, while multi-word items are
 * sentences (a phase's learner activities) and take semicolons, since a comma
 * between two imperatives is a comma splice. Wrapped prose carries no bullets
 * at all and keeps its spaces.
 */
export function flattenMarkdown(fragment: string): string {
  const lines = fragment
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items = lines.map(stripBullet).filter(Boolean);
  const isList = lines.length > 1 && lines.some((line) => /^[-*•]\s/.test(line));
  if (!isList) return items.join(" ").trim();

  const separator = items.every((item) => !item.includes(" ")) ? ", " : "; ";
  return items.join(separator).trim();
}

/**
 * Turns the Lesson Plan's five delivery-phase sections into the rows of the
 * lesson-plan table. The generator is instructed to write each phase as a
 * strict **Time:** / **Learner Activity:** / **TLM:** block (see
 * prompts/lesson.ts); a phase that arrives without that structure still
 * becomes a row, carrying whatever prose it does have as the learner activity,
 * so a formatting miss degrades the table rather than emptying it.
 */
export function extractLessonPhases(lessonPlan: string): LessonPhase[] {
  const phases: LessonPhase[] = [];
  for (const phase of LESSON_PHASES) {
    const section = extractHeadingSection(lessonPlan, phase);
    if (!section) continue;

    const fields = parseLabelledFields(section);
    const learnerActivity = fieldValue(fields, ACTIVITY_LABELS);
    phases.push({
      phase,
      time: fieldValue(fields, TIME_LABELS),
      learnerActivity: learnerActivity || flattenMarkdown(section),
      resources: fieldValue(fields, RESOURCE_LABELS),
    });
  }
  return phases;
}
