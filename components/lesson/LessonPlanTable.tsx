import { buildLessonPlanTable, cellRuns, type LessonTableCell } from "@/lib/lessonPlanTable";
import { extractLessonPhases } from "@/lib/lessonPhases";
import type { LessonHeader, LessonPhase } from "@/types/curriculum";

interface LessonPlanTableProps {
  header: LessonHeader;
  /** Delivery phases, when the generator supplied them. Otherwise they're read back out of `lessonPlan`. */
  phases?: LessonPhase[];
  /** The Lesson Plan markdown, used to recover the phases of a lesson saved before they were returned separately. */
  lessonPlan?: string;
  /** Every indicator this lesson covers. Defaults to the header's single indicator. */
  indicators?: { code: string; text?: string }[];
  title?: string;
}

const CELL = "px-3 py-2 border border-gray-300 dark:border-gray-600 align-top";
const LABEL = "block text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5";
const VALUE = "text-[13px] leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line";

/** Renders a cell's text with its **bold** and *italic* as real emphasis rather than literal asterisks. */
function RichText({ value }: { value: string }) {
  return (
    <>
      {cellRuns(value).map((run, index) => {
        if (run.kind === "bold") return <strong key={index} className="font-semibold">{run.text}</strong>;
        if (run.kind === "italic") return <em key={index}>{run.text}</em>;
        return <span key={index}>{run.text}</span>;
      })}
    </>
  );
}

function Cell({ cell, span }: { cell: LessonTableCell; span?: number }) {
  return (
    <td className={CELL} colSpan={span}>
      <span className={LABEL}>{cell.label}</span>
      <span className={VALUE}>
        <RichText value={cell.value} />
      </span>
    </td>
  );
}

/**
 * The generated lesson as the single GES/NaCCA lesson-plan table a teacher can
 * teach straight from - identity row, curriculum row, keywords, standards, then
 * one row per delivery phase. The layout itself lives in lib/lessonPlanTable.ts
 * so this, the Word export and the PDF export all draw the same table.
 */
export default function LessonPlanTable({ header, phases, lessonPlan, indicators, title }: LessonPlanTableProps) {
  // A lesson saved before phases were returned separately still carries them
  // in its Lesson Plan text, so they're parsed back out rather than lost.
  const resolvedPhases = phases?.length ? phases : lessonPlan ? extractLessonPhases(lessonPlan) : [];
  const table = buildLessonPlanTable(header, resolvedPhases, indicators);
  // Twelve columns so every band divides into whole colSpans: four cells per
  // identity line (3 each), three per curriculum/phase line (4 each), two per
  // standards line (6 each). A fractional colSpan is silently dropped by the
  // browser, which left the identity row short of the table's right edge.
  const COLUMNS = 12;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
          {title ?? "Lesson Plan — GES / NaCCA Format"}
        </h3>
        {header.schoolName && (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">{header.schoolName}</span>
        )}
      </div>

      {header.sourceNeedsReview && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
          ⚠ This indicator&apos;s source text is flagged for human review. Verify the Content Standard / Indicator
          wording against the official NaCCA document before classroom use.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[720px]">
          <tbody>
            {/* Date · Day · Time · Class · Class size · Subject · Strand · Sub-strand */}
            <tr>
              {table.identity.cells.slice(0, 4).map((cell) => (
                <Cell key={cell.label} cell={cell} span={COLUMNS / 4} />
              ))}
            </tr>
            <tr>
              {table.identity.cells.slice(4).map((cell) => (
                <Cell key={cell.label} cell={cell} span={COLUMNS / 4} />
              ))}
            </tr>

            {/* Content Standard · Indicators · References */}
            <tr>
              {table.curriculum.cells.map((cell) => (
                <Cell key={cell.label} cell={cell} span={COLUMNS / 3} />
              ))}
            </tr>

            {/* Keywords, full width */}
            <tr>
              <Cell cell={table.keywords} span={COLUMNS} />
            </tr>

            {/* Performance Standards · Core Competencies */}
            <tr>
              {table.standards.cells.map((cell) => (
                <Cell key={cell.label} cell={cell} span={COLUMNS / 2} />
              ))}
            </tr>

            {/* The delivery phases the teacher works through in the room */}
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className={`${CELL} text-left`} colSpan={COLUMNS / 3}>
                <span className={LABEL}>Time / Phases</span>
              </th>
              <th className={`${CELL} text-left`} colSpan={COLUMNS / 3}>
                <span className={LABEL}>Learner Activity</span>
              </th>
              <th className={`${CELL} text-left`} colSpan={COLUMNS / 3}>
                <span className={LABEL}>TLM / TLRs</span>
              </th>
            </tr>
            {table.phases.map((phase) => (
              <tr key={phase.phase}>
                <td className={CELL} colSpan={COLUMNS / 3}>
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{phase.phase}</span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">{phase.time}</span>
                </td>
                <td className={`${CELL} ${VALUE}`} colSpan={COLUMNS / 3}>
                  <RichText value={phase.learnerActivity} />
                </td>
                <td className={`${CELL} ${VALUE}`} colSpan={COLUMNS / 3}>
                  <RichText value={phase.resources} />
                </td>
              </tr>
            ))}
            {table.phases.length === 0 && (
              <tr>
                <td className={`${CELL} text-center text-sm text-gray-400 dark:text-gray-500`} colSpan={COLUMNS}>
                  No delivery phases could be read from this lesson — regenerate it to fill in the phase table.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
