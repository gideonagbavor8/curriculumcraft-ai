import type { LessonHeader } from "@/types/curriculum";

interface LessonHeaderTableProps {
  header: LessonHeader;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="col-span-2 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
        {value}
      </span>
    </div>
  );
}

// Renders the GES/NaCCA standard lesson-plan header block. Curriculum fields
// come straight from the selected indicator; school/teacher/week/day are the
// only fields a teacher fills in manually.
export default function LessonHeaderTable({ header }: LessonHeaderTableProps) {
  const contentStandard = header.contentStandardCode
    ? `${header.contentStandardCode}: ${header.contentStandardText ?? ""}`
    : header.contentStandardText;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
          Lesson Plan Header — GES / NaCCA Standard
        </h3>
      </div>
      {header.sourceNeedsReview && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
          ⚠ This indicator&apos;s source text is flagged for human review (extraction
          ambiguity). Verify the Content Standard / Indicator wording against the
          official NaCCA document before classroom use.
        </div>
      )}
      <div>
        <Row label="School" value={header.schoolName || "—"} />
        <Row label="Teacher" value={header.teacherName || "—"} />
        <Row label="Week Ending" value={header.weekEnding || "—"} />
        <Row label="Day" value={header.day || "—"} />
        <Row label="Subject" value={header.subject} />
        <Row label="Class" value={`${header.gradeName} (${header.grade})`} />
        <Row label="Class Size" value={header.classSize} />
        <Row label="Duration" value={`${header.duration} minutes`} />
        <Row label="Strand" value={header.strand} />
        <Row label="Sub-Strand" value={header.subStrand} />
        <Row label="Content Standard" value={contentStandard} />
        <Row label="Indicator" value={`${header.indicatorCode}: ${header.indicatorText}`} />
        <Row label="Performance Indicator" value={header.performanceIndicator} />
        <Row label="Core Competencies" value={header.coreCompetencies} />
        <Row label="Teaching & Learning Resources" value={header.teachingLearningResources} />
        <Row label="Reference" value={header.reference} />
      </div>
    </div>
  );
}
