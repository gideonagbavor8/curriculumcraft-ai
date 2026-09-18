"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  UploadCloud,
  CheckCircle2,
  XCircle,
  FileText,
  Library,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PencilLine,
  Trash2,
} from "lucide-react";
import { useCurriculumCatalog } from "@/components/curriculum/useCurriculumCatalog";
import { displayStrandLabel } from "@/lib/schemeImport/headings";
import LessonPlanTable from "@/components/lesson/LessonPlanTable";
import LessonDownloadPanel from "@/components/lesson/LessonDownloadPanel";
import TeachingDayPicker, { WEEKDAYS, type Weekday } from "@/components/lesson/TeachingDayPicker";
import LessonSizingFields, { isValidDuration, isValidClassSize } from "@/components/lesson/LessonSizingFields";
import { DEFAULT_DURATION_MINUTES, DEFAULT_CLASS_SIZE } from "@/lib/lessonSizing";
import type { GenerateResponse } from "@/types/curriculum";

type UploadKind = "full_school" | "single_subject" | "single_week";
type UploadStatus = "pending" | "parsed" | "needs_review" | "failed";
type MatchConfidence = "exact" | "fuzzy" | "unmatched";

const TERMS = ["First Term", "Second Term", "Third Term"];

interface LibrarySubject {
  id: string;
  subjectSlug: string | null;
  subjectLabel: string;
}

interface LibraryEntry {
  id: string;
  fileName: string;
  mimeType: string;
  gradeCode: string;
  termLabel: string | null;
  uploadKind: UploadKind;
  parseStatus: UploadStatus;
  parseWarnings: string[];
  uploadedAt: string;
  subjects: LibrarySubject[];
}

interface ReviewIndicator {
  id: string;
  indicatorCode: string;
  indicatorText: string | null;
  matchConfidence: MatchConfidence;
}

interface ReviewWeek {
  id: string;
  weekNumber: number;
  isNonTeachingWeek: boolean;
  nonTeachingLabel: string | null;
  strandText: string | null;
  subStrandText: string | null;
  contentStandardCode: string | null;
  contentStandardText: string | null;
  resourcesText: string | null;
  rawRowText: string | null;
  indicators: ReviewIndicator[];
}

interface ReviewSubject {
  id: string;
  subjectSlug: string | null;
  subjectLabel: string;
  weeks: ReviewWeek[];
}

interface ReviewData {
  upload: {
    id: string;
    fileName: string;
    gradeCode: string;
    termLabel: string | null;
    uploadKind: UploadKind;
    parseStatus: UploadStatus;
    parseWarnings: string[];
    parseError: string | null;
  };
  subjects: ReviewSubject[];
  matchSummary: Record<MatchConfidence, number>;
  warnings: string[];
}

const STATUS_STYLE: Record<UploadStatus, string> = {
  pending: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
  parsed: "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300",
  needs_review: "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300",
  failed: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
};

// Both "parsed" and "needs_review" mean the same thing to a teacher: the
// scheme is imported and ready to generate lessons from. The distinction
// only matters for diagnostics (see the collapsed "Import notes" below) -
// the school-issued scheme can't be edited by the teacher anyway, so nothing
// here is ever presented as something they need to go fix first.
const STATUS_LABEL: Record<UploadStatus, string> = {
  pending: "Importing…",
  parsed: "Ready to generate lessons",
  needs_review: "Ready to generate lessons",
  failed: "Couldn't be read",
};

const UPLOAD_KIND_LABEL: Record<UploadKind, string> = {
  full_school: "Full School Scheme",
  single_subject: "Single Subject",
  single_week: "Single Week",
};

// Match confidence is metadata about the curriculum-DB link only - it never
// blocks or implies action on the teacher's part. Even "unmatched"
// indicators use the scheme's own wording and generate lessons normally.
function MatchBadge({ confidence }: { confidence: MatchConfidence }) {
  if (confidence === "exact") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
        <CheckCircle2 size={11} /> Matched
      </span>
    );
  }
  if (confidence === "fuzzy") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        <CheckCircle2 size={11} /> Likely match
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      As uploaded
    </span>
  );
}

/**
 * A scheme is identified by the class and term it covers, not by whatever the
 * file happened to be called - so the class/term leads, the subject it covers
 * follows, and the filename stays a quiet third line for telling two uploads
 * of the same term apart.
 */
function SchemeLibraryRow({
  entry,
  gradeLabel,
  onOpen,
  onDelete,
}: {
  entry: LibraryEntry;
  gradeLabel: string;
  onOpen: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const subjectNames = entry.subjects.map((s) => s.subjectLabel);
  const shown = subjectNames.slice(0, MAX_SUBJECTS_LISTED);
  const remaining = subjectNames.length - shown.length;
  // A whole-school scheme covers every subject, so its title stays the class
  // and term; a single-subject upload is only distinguishable by its subject.
  const titleParts = [gradeLabel, entry.termLabel];
  if (entry.uploadKind !== "full_school" && subjectNames.length === 1) titleParts.push(subjectNames[0]);

  return (
    <div className="flex items-stretch group">
      <button
        onClick={onOpen}
        className="min-w-0 flex-1 text-left px-4 py-3.5 space-y-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {titleParts.filter(Boolean).join(" · ")}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[entry.parseStatus]}`}>
            {STATUS_LABEL[entry.parseStatus]}
          </span>
        </div>

        {entry.uploadKind === "full_school" && subjectNames.length > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {shown.join(", ")}
            {remaining > 0 && <span className="text-gray-400 dark:text-gray-500"> +{remaining} more</span>}
          </p>
        )}

        <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 min-w-0">
          <FileText size={11} className="flex-shrink-0" />
          <span className="truncate">{entry.fileName}</span>
          <span aria-hidden>&middot;</span>
          <span className="flex-shrink-0">{UPLOAD_KIND_LABEL[entry.uploadKind]}</span>
          <span aria-hidden>&middot;</span>
          <span className="flex-shrink-0">{formatUploadedAt(entry.uploadedAt)}</span>
        </p>
      </button>

      <div className="flex items-center gap-1 pr-3 pl-1">
        {confirmingDelete ? (
          <>
            <button
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setDeleting(false);
                  setConfirmingDelete(false);
                }
              }}
              disabled={deleting}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white transition-colors cursor-pointer"
            >
              {deleting ? "Removing…" : "Remove"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-xs font-medium px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            title={`Remove ${entry.fileName} from the library`}
            aria-label={`Remove ${entry.fileName} from the library`}
            className="p-2 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The Scheme Library's "See more" control: a quiet full-width row at the foot
 * of the list saying how much of the history is on show, with one action to
 * reveal the next batch or, once everything is out, to fold it back up.
 */
function LibraryFooter({
  shown,
  total,
  onSeeMore,
  onShowLess,
}: {
  shown: number;
  total: number;
  onSeeMore: () => void;
  onShowLess: () => void;
}) {
  const remaining = total - shown;
  const allShown = remaining <= 0;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Showing {shown} of {total} uploads
      </span>
      <button
        type="button"
        onClick={allShown ? onShowLess : onSeeMore}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 cursor-pointer"
      >
        {allShown ? (
          <>
            Show less <ChevronUp size={14} />
          </>
        ) : (
          <>
            See {Math.min(remaining, LIBRARY_PAGE_SIZE)} more <ChevronDown size={14} />
          </>
        )}
      </button>
    </div>
  );
}

/** How many subject names a library row spells out before collapsing the rest into "+N more". */
const MAX_SUBJECTS_LISTED = 4;

/**
 * How many uploads the Scheme Library shows at first, and how many each
 * "See more" reveals. The most recent uploads are the ones a teacher comes
 * back for; older terms and test uploads stay one click away rather than
 * pushing the current scheme off the screen.
 */
const LIBRARY_PAGE_SIZE = 10;

function formatUploadedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** The Monday of the current week, as the default start of the teaching week. */
function currentMonday(): string {
  const today = new Date();
  const offsetToMonday = (today.getDay() + 6) % 7;
  today.setDate(today.getDate() - offsetToMonday);
  return today.toISOString().slice(0, 10);
}

/** The date a given weekday falls on, counting from the week's Monday. */
function dateForWeekday(weekStart: string, weekday: Weekday): string {
  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  start.setDate(start.getDate() + WEEKDAYS.indexOf(weekday));
  return start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** What /api/scheme-weeks/[weekId]/generate-day returns: a generated lesson plus which scheme week and indicators it came from. */
interface SchemeGeneratedLesson extends GenerateResponse {
  schemeContext?: {
    weekNumber: number;
    dayIndex: number;
    totalDays: number;
    isPracticeDay: boolean;
    indicatorCodes: string[];
    indicators: { code: string; text?: string }[];
  };
}

/** Sentinel for the "no filter applied" option of the Strand / Sub-strand dropdowns. */
const ALL = "";

/** Distinct values of one field across a subject's weeks, in the order the scheme lists them. */
function distinctValues(weeks: ReviewWeek[], field: "strandText" | "subStrandText"): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const week of weeks) {
    const value = week[field];
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push(value);
  }
  return values;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel: string;
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, allLabel, onChange }: FilterSelectProps) {
  return (
    <label className="flex flex-col gap-1 min-w-0 flex-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600/40 cursor-pointer"
      >
        <option value={ALL}>{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

interface SchemeFilterBarProps {
  subjects: ReviewSubject[];
  activeSubjectId: string | null;
  strandFilter: string;
  subStrandFilter: string;
  onSubjectChange: (id: string) => void;
  onStrandChange: (value: string) => void;
  onSubStrandChange: (value: string) => void;
}

/**
 * Subject -> Strand -> Sub-strand, each populated from the uploaded scheme
 * itself. Choosing a subject narrows the Strand list to that subject's
 * strands, and choosing a strand narrows the Sub-strand list to the
 * sub-strands taught under it - so the teacher walks down their own document
 * rather than scanning a wall of every heading it contains.
 */
function SchemeFilterBar({
  subjects,
  activeSubjectId,
  strandFilter,
  subStrandFilter,
  onSubjectChange,
  onStrandChange,
  onSubStrandChange,
}: SchemeFilterBarProps) {
  const subject = subjects.find((s) => s.id === activeSubjectId);
  if (!subject) return null;

  const strands = distinctValues(subject.weeks, "strandText");
  const weeksInStrand = strandFilter === ALL ? subject.weeks : subject.weeks.filter((w) => w.strandText === strandFilter);
  const subStrands = distinctValues(weeksInStrand, "subStrandText");
  const visibleWeeks = filterWeeks(subject.weeks, strandFilter, subStrandFilter);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Subject</span>
          <select
            value={activeSubjectId ?? ""}
            onChange={(e) => onSubjectChange(e.target.value)}
            disabled={subjects.length === 1}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600/40 disabled:cursor-default cursor-pointer"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.subjectLabel}</option>
            ))}
          </select>
        </label>

        {strands.length > 0 && (
          <FilterSelect
            label="Strand"
            value={strandFilter}
            allLabel={`All strands (${strands.length})`}
            options={strands.map((value) => ({ value, label: displayStrandLabel(value) }))}
            onChange={onStrandChange}
          />
        )}

        {subStrands.length > 0 && (
          <FilterSelect
            label="Sub-strand"
            value={subStrandFilter}
            allLabel={`All sub-strands (${subStrands.length})`}
            options={subStrands.map((value) => ({ value, label: displayStrandLabel(value) }))}
            onChange={onSubStrandChange}
          />
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing {visibleWeeks.length} of {subject.weeks.length} week{subject.weeks.length === 1 ? "" : "s"} in this scheme.
      </p>
    </div>
  );
}

/** The weeks a teacher is currently looking at, given the Strand / Sub-strand dropdowns. */
function filterWeeks(weeks: ReviewWeek[], strandFilter: string, subStrandFilter: string): ReviewWeek[] {
  return weeks.filter(
    (week) =>
      (strandFilter === ALL || week.strandText === strandFilter) &&
      (subStrandFilter === ALL || week.subStrandText === subStrandFilter)
  );
}

function weekMatchSummary(week: ReviewWeek) {
  if (week.isNonTeachingWeek) return null;
  const counts = { exact: 0, fuzzy: 0, unmatched: 0 };
  for (const ind of week.indicators) counts[ind.matchConfidence]++;
  return counts;
}

export default function SchemeOfLearningPage() {
  const { catalog } = useCurriculumCatalog();
  const grades = catalog?.levels.flatMap((level) =>
    level.grades.map((grade) => ({ code: grade.code, label: `${grade.name} (${grade.code})` }))
  ) ?? [];

  // Library list state
  const [library, setLibrary] = useState<LibraryEntry[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryVisible, setLibraryVisible] = useState(LIBRARY_PAGE_SIZE);
  const [view, setView] = useState<"library" | "upload" | "scheme">("library");

  // Upload form state
  const [uploadKind, setUploadKind] = useState<UploadKind>("single_subject");
  const [subjectSlug, setSubjectSlug] = useState("");
  const [gradeCode, setGradeCode] = useState("");
  const [termLabel, setTermLabel] = useState(TERMS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [manual, setManual] = useState({
    weekNumber: "1",
    strandText: "",
    subStrandText: "",
    contentStandardCode: "",
    contentStandardText: "",
    indicatorsText: "",
    resourcesText: "",
  });

  // Scheme drill-down state
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [strandFilter, setStrandFilter] = useState(ALL);
  const [subStrandFilter, setSubStrandFilter] = useState(ALL);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [teachingDayNames, setTeachingDayNames] = useState<Weekday[]>([...WEEKDAYS]);
  const [weekStart, setWeekStart] = useState(currentMonday);
  const [duration, setDuration] = useState(DEFAULT_DURATION_MINUTES);
  const [classSize, setClassSize] = useState(DEFAULT_CLASS_SIZE);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<{ day: number; total: number } | null>(null);
  const [generatedLessons, setGeneratedLessons] = useState<SchemeGeneratedLesson[] | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const gradeLabel = (code: string) =>
    catalog?.levels.flatMap((level) => level.grades).find((grade) => grade.code === code)?.name ?? code;

  const loadLibrary = async () => {
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/scheme-uploads");
      const json = await res.json();
      if (json.success) setLibrary(json.data);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, not a render-triggered cascade
    loadLibrary();
  }, []);

  const deleteScheme = async (id: string) => {
    const res = await fetch(`/api/scheme-uploads/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to remove scheme");
    setLibrary((current) => current?.filter((entry) => entry.id !== id) ?? current);
  };

  const openScheme = async (id: string) => {
    setView("scheme");
    setReview(null);
    setSelectedWeekId(null);
    setGeneratedLessons(null);
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/scheme-uploads/${id}`);
      const json = await res.json();
      if (json.success) {
        setReview(json.data);
        setActiveSubjectId(json.data.subjects[0]?.id ?? null);
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const canUpload =
    !useManualEntry &&
    Boolean(file && gradeCode && (uploadKind === "full_school" || subjectSlug)) &&
    !uploading;

  const canSubmitManual =
    useManualEntry &&
    Boolean(gradeCode && subjectSlug && manual.weekNumber && manual.indicatorsText) &&
    !uploading;

  const resetUploadForm = () => {
    setFile(null);
    setSubjectSlug("");
    setGradeCode("");
    setTermLabel(TERMS[0]);
    setUploadKind("single_subject");
    setUseManualEntry(false);
    setManual({
      weekNumber: "1",
      strandText: "",
      subStrandText: "",
      contentStandardCode: "",
      contentStandardText: "",
      indicatorsText: "",
      resourcesText: "",
    });
  };

  const handleUpload = async () => {
    if (!file || !gradeCode) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("gradeCode", gradeCode);
      form.set("uploadKind", uploadKind);
      if (uploadKind !== "full_school") form.set("subjectSlug", subjectSlug);
      if (termLabel) form.set("termLabel", termLabel);

      const res = await fetch("/api/scheme-uploads", { method: "POST", body: form });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");

      await loadLibrary();
      resetUploadForm();
      await openScheme(json.data.schemeUploadId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!gradeCode || !subjectSlug) return;
    setUploading(true);
    setUploadError(null);
    try {
      const subjectLabel = catalog?.subjects.find((s) => s.slug === subjectSlug)?.name ?? subjectSlug;
      const res = await fetch("/api/scheme-uploads/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeCode,
          termLabel,
          subjectSlug,
          subjectLabel,
          weekNumber: Number(manual.weekNumber),
          strandText: manual.strandText || undefined,
          subStrandText: manual.subStrandText || undefined,
          contentStandardCode: manual.contentStandardCode || undefined,
          contentStandardText: manual.contentStandardText || undefined,
          indicatorsText: manual.indicatorsText,
          resourcesText: manual.resourcesText || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save week");

      await loadLibrary();
      resetUploadForm();
      await openScheme(json.data.schemeUploadId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to save week");
    } finally {
      setUploading(false);
    }
  };

  const activeSubject = review?.subjects.find((s) => s.id === activeSubjectId) ?? null;
  const visibleWeeks = activeSubject ? filterWeeks(activeSubject.weeks, strandFilter, subStrandFilter) : [];
  const selectedWeek = activeSubject?.weeks.find((w) => w.id === selectedWeekId) ?? null;
  const weekWarnings = selectedWeek
    ? review?.warnings.filter((w) => w.startsWith(`Week ${selectedWeek.weekNumber}`)) ?? []
    : [];

  const handleGenerateWeek = async () => {
    if (!selectedWeek || teachingDayNames.length === 0) return;
    setGenerating(true);
    setGenerateError(null);
    setGeneratedLessons(null);
    const results: SchemeGeneratedLesson[] = [];
    const totalDays = teachingDayNames.length;
    try {
      for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        setGenerateProgress({ day: dayIndex + 1, total: totalDays });
        const res = await fetch(`/api/scheme-weeks/${selectedWeek.id}/generate-day`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayIndex,
            totalDays,
            // The weekday the teacher picked prints on the lesson itself, so
            // a head teacher can check it against the timetable.
            day: teachingDayNames[dayIndex],
            lessonDate: dateForWeekday(weekStart, teachingDayNames[dayIndex]),
            duration,
            classSize,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || `Failed to generate ${teachingDayNames[dayIndex]}'s lesson`);
        results.push(json.data);
      }
      setGeneratedLessons(results);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate lessons");
    } finally {
      setGenerating(false);
      setGenerateProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">NaCCA SBC</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Library size={22} />
            Scheme Library
          </h1>
          <p className="text-green-100 text-sm mt-1">
            Upload your school&apos;s termly Scheme of Learning once, then reuse it all term - select a
            scheme, pick a subject, strand and week, choose the days you teach it, and generate a lesson for each.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {view !== "upload" && (
          <button
            onClick={() => {
              setView("upload");
              setUploadError(null);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-all cursor-pointer"
          >
            <UploadCloud size={16} /> Upload a New Scheme
          </button>
        )}

        {view === "scheme" && (
          <button
            onClick={() => setView("library")}
            className="inline-flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400 hover:underline cursor-pointer"
          >
            <ChevronLeft size={14} /> Back to Scheme Library
          </button>
        )}

        {/* LIBRARY VIEW */}
        {view === "library" && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
              Your Schemes
            </h2>
            {libraryLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Loading your Scheme Library…
              </div>
            )}
            {!libraryLoading && library && library.length === 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No schemes uploaded yet. Upload one to get started - it becomes your source of truth for the term.
              </div>
            )}
            {library && library.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {library.slice(0, libraryVisible).map((entry) => (
                    <SchemeLibraryRow
                      key={entry.id}
                      entry={entry}
                      gradeLabel={gradeLabel(entry.gradeCode)}
                      onOpen={() => openScheme(entry.id)}
                      onDelete={() => deleteScheme(entry.id)}
                    />
                  ))}
                </div>

                {/* Only when there is history beyond the first page - a
                    library of three uploads needs no footer at all. */}
                {library.length > LIBRARY_PAGE_SIZE && (
                  <LibraryFooter
                    shown={Math.min(libraryVisible, library.length)}
                    total={library.length}
                    onSeeMore={() => setLibraryVisible((n) => n + LIBRARY_PAGE_SIZE)}
                    onShowLess={() => setLibraryVisible(LIBRARY_PAGE_SIZE)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* UPLOAD VIEW */}
        {view === "upload" && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
              Upload Scheme
            </h2>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Upload type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(UPLOAD_KIND_LABEL) as UploadKind[]).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => {
                      setUploadKind(kind);
                      setUseManualEntry(false);
                    }}
                    className={`text-xs font-semibold px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                      uploadKind === kind
                        ? "bg-green-700 border-green-700 text-white"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400"
                    }`}
                  >
                    {UPLOAD_KIND_LABEL[kind]}
                  </button>
                ))}
              </div>
              {uploadKind === "full_school" && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                  Every subject in the file is detected and separated automatically.
                </p>
              )}
              {uploadKind === "single_week" && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                  Upload a DOCX, PDF, or a photo of the page below - or type it in by hand instead.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {uploadKind !== "full_school" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Subject</label>
                  <select
                    value={subjectSlug}
                    title="Subject"
                    onChange={(e) => setSubjectSlug(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">Select subject…</option>
                    {catalog?.subjects.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Grade / Class</label>
                <select
                  value={gradeCode}
                  title="Grade or class"
                  onChange={(e) => setGradeCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">Select grade…</option>
                  {grades.map((g) => (
                    <option key={g.code} value={g.code}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Term</label>
                <select
                  value={termLabel}
                  title="Term"
                  onChange={(e) => setTermLabel(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {TERMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {uploadKind === "single_week" && (
              <button
                onClick={() => setUseManualEntry((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:underline cursor-pointer"
              >
                <PencilLine size={13} /> {useManualEntry ? "Upload a file or photo instead" : "Type this week in by hand instead"}
              </button>
            )}

            {!useManualEntry && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">
                    Scheme of Learning file (.docx, .pdf, or a photo)
                  </label>
                  <input
                    type="file"
                    accept=".docx,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-green-100 file:text-green-800 dark:file:bg-green-900/40 dark:file:text-green-300 file:text-xs file:font-semibold hover:file:bg-green-200"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-green-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Uploading &amp; parsing scheme…
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} /> Upload &amp; Parse
                    </>
                  )}
                </button>
              </>
            )}

            {useManualEntry && (
              <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Week number</label>
                    <input
                      type="number"
                      min={1}
                      value={manual.weekNumber}
                      onChange={(e) => setManual((m) => ({ ...m, weekNumber: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Strand</label>
                    <input
                      type="text"
                      value={manual.strandText}
                      onChange={(e) => setManual((m) => ({ ...m, strandText: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Sub-strand</label>
                    <input
                      type="text"
                      value={manual.subStrandText}
                      onChange={(e) => setManual((m) => ({ ...m, subStrandText: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Content standard code</label>
                    <input
                      type="text"
                      value={manual.contentStandardCode}
                      onChange={(e) => setManual((m) => ({ ...m, contentStandardCode: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Content standard text</label>
                    <input
                      type="text"
                      value={manual.contentStandardText}
                      onChange={(e) => setManual((m) => ({ ...m, contentStandardText: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">
                    Indicators (one per line, e.g. &quot;B4.1.1.1.1 Model number quantities…&quot;)
                  </label>
                  <textarea
                    rows={4}
                    value={manual.indicatorsText}
                    onChange={(e) => setManual((m) => ({ ...m, indicatorsText: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Resources (optional)</label>
                  <input
                    type="text"
                    value={manual.resourcesText}
                    onChange={(e) => setManual((m) => ({ ...m, resourcesText: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100"
                  />
                </div>
                <button
                  onClick={handleManualSubmit}
                  disabled={!canSubmitManual}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-green-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving week…
                    </>
                  ) : (
                    <>
                      <PencilLine size={16} /> Save Week to Library
                    </>
                  )}
                </button>
              </div>
            )}

            {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
          </div>
        )}

        {/* SCHEME DRILL-DOWN VIEW */}
        {view === "scheme" && (
          <>
            {reviewLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Loading scheme…
              </div>
            )}

            {review && (
              <>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{review.upload.fileName}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[review.upload.parseStatus]}`}>
                    {STATUS_LABEL[review.upload.parseStatus]}
                  </span>
                </div>

                {review.upload.parseStatus === "failed" && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                      <XCircle size={14} /> This file couldn&apos;t be read
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {review.upload.parseError ?? review.warnings[0] ?? "The file could not be parsed for an unknown reason."}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Double-check the file isn&apos;t corrupted or a scanned image without selectable text, then try uploading again -
                      or use manual entry for a single week instead.
                    </p>
                  </div>
                )}

                {/* Diagnostics, not a task list - kept out of the way as one quiet line the teacher can ignore. */}
                {review.upload.parseStatus === "needs_review" && review.warnings.length > 0 && (
                  <details className="group">
                    <summary className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer list-none">
                      {review.warnings.length} import note{review.warnings.length === 1 ? "" : "s"} &middot; nothing to fix
                    </summary>
                    <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        These items couldn&apos;t be auto-matched to the curriculum database or had unusual formatting. The
                        scheme&apos;s own wording was kept, and lessons generate normally either way.
                      </p>
                      <ul className="list-disc list-inside space-y-1 mt-2 max-h-48 overflow-y-auto">
                        {review.warnings.map((w, i) => (
                          <li key={i} className="text-xs text-gray-500 dark:text-gray-400">{w}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )}

                <SchemeFilterBar
                  subjects={review.subjects}
                  activeSubjectId={activeSubjectId}
                  strandFilter={strandFilter}
                  subStrandFilter={subStrandFilter}
                  onSubjectChange={(id) => {
                    setActiveSubjectId(id);
                    setStrandFilter(ALL);
                    setSubStrandFilter(ALL);
                    setSelectedWeekId(null);
                    setGeneratedLessons(null);
                  }}
                  onStrandChange={(value) => {
                    setStrandFilter(value);
                    setSubStrandFilter(ALL);
                    setSelectedWeekId(null);
                    setGeneratedLessons(null);
                  }}
                  onSubStrandChange={(value) => {
                    setSubStrandFilter(value);
                    setSelectedWeekId(null);
                    setGeneratedLessons(null);
                  }}
                />


                {activeSubject && (
                  <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
                    {/* Compact week list - detail lives in the panel beside it, never duplicated here */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {visibleWeeks.map((week) => {
                          const counts = weekMatchSummary(week);
                          const matchedCount = counts ? counts.exact + counts.fuzzy : 0;
                          const isSelected = selectedWeekId === week.id;
                          return (
                            <button
                              key={week.id}
                              onClick={() => {
                                setSelectedWeekId(week.id);
                                setGeneratedLessons(null);
                                setGenerateError(null);
                              }}
                              className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                                isSelected ? "bg-green-50 dark:bg-green-950/30" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Week {week.weekNumber}</span>
                                {!week.isNonTeachingWeek && (
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {week.indicators.length} indicator{week.indicators.length === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>
                              {week.isNonTeachingWeek ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5">{week.nonTeachingLabel}</p>
                              ) : (
                                <>
                                  {/* The strand is already named by the dropdown once one is chosen - repeating it on every row only crowds them. */}
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {[strandFilter === ALL ? week.strandText : null, week.subStrandText]
                                      .filter(Boolean)
                                      .map((text) => displayStrandLabel(text as string))
                                      .join(" \u00b7 ") || "\u2014"}
                                  </p>
                                  {counts && (matchedCount > 0 || counts.unmatched > 0) && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                      {matchedCount > 0 && <span className="text-green-700 dark:text-green-400 font-medium">{matchedCount} matched</span>}
                                      {matchedCount > 0 && counts.unmatched > 0 && " \u00b7 "}
                                      {counts.unmatched > 0 && `${counts.unmatched} as uploaded`}
                                    </p>
                                  )}
                                </>
                              )}
                            </button>
                          );
                        })}
                        {visibleWeeks.length === 0 && (
                          <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                            No weeks match the selected strand.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Detail + generation panel for the selected week */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                      {!selectedWeek ? (
                        <div className="p-10 text-center text-sm text-gray-400 dark:text-gray-500">
                          Select a week on the left to preview it and generate lessons.
                        </div>
                      ) : selectedWeek.isNonTeachingWeek ? (
                        <div className="p-6">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Week {selectedWeek.weekNumber}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-1">
                            {selectedWeek.nonTeachingLabel} - no lesson content for this week.
                          </p>
                        </div>
                      ) : (
                        <div className="p-6 space-y-5">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Week {selectedWeek.weekNumber}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {[selectedWeek.strandText, selectedWeek.subStrandText]
                                .filter(Boolean)
                                .map((text) => displayStrandLabel(text as string))
                                .join(" \u00b7 ") || "\u2014"}
                            </p>
                          </div>

                          <div>
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                              Content Standard
                            </span>
                            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                              {selectedWeek.contentStandardCode && (
                                <span className="font-mono text-xs text-green-700 dark:text-green-400 mr-1.5">{selectedWeek.contentStandardCode}</span>
                              )}
                              {selectedWeek.contentStandardText || (!selectedWeek.contentStandardCode ? "\u2014" : "")}
                            </p>
                          </div>

                          <div>
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                              Indicators ({selectedWeek.indicators.length})
                            </span>
                            <div className="space-y-2">
                              {selectedWeek.indicators.map((ind) => (
                                <div key={ind.id} className="flex items-start justify-between gap-3 text-sm rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                                  <div className="min-w-0">
                                    <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 mr-1.5">{ind.indicatorCode}</span>
                                    <span className="text-gray-700 dark:text-gray-300">{ind.indicatorText}</span>
                                  </div>
                                  <MatchBadge confidence={ind.matchConfidence} />
                                </div>
                              ))}
                              {selectedWeek.indicators.length === 0 && (
                                <p className="text-sm text-gray-400 dark:text-gray-500">No indicators extracted for this week.</p>
                              )}
                            </div>
                          </div>

                          {selectedWeek.resourcesText && (
                            <div>
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">Resources</span>
                              <p className="text-sm text-gray-800 dark:text-gray-100">{selectedWeek.resourcesText}</p>
                            </div>
                          )}

                          {weekWarnings.length > 0 && (
                            <details className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                              <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer">
                                Import notes ({weekWarnings.length})
                              </summary>
                              <ul className="list-disc list-inside space-y-0.5 mt-1.5">
                                {weekWarnings.map((w, i) => (
                                  <li key={i} className="text-xs text-gray-500 dark:text-gray-400">{w}</li>
                                ))}
                              </ul>
                            </details>
                          )}

                          {/* Generation controls */}
                          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                            <div className="flex flex-wrap items-end gap-4">
                              <label className="min-w-0">
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                                  Week beginning
                                </span>
                                <input
                                  type="date"
                                  value={weekStart}
                                  onChange={(e) => setWeekStart(e.target.value)}
                                  disabled={generating}
                                  className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100"
                                />
                              </label>
                              <TeachingDayPicker
                                selected={teachingDayNames}
                                onChange={setTeachingDayNames}
                                disabled={generating}
                              />
                              <div className="w-64 min-w-0">
                                <LessonSizingFields
                                  duration={duration}
                                  classSize={classSize}
                                  onDurationChange={setDuration}
                                  onClassSizeChange={setClassSize}
                                  disabled={generating}
                                  compact
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                onClick={handleGenerateWeek}
                                disabled={
                                  generating ||
                                  selectedWeek.indicators.length === 0 ||
                                  teachingDayNames.length === 0 ||
                                  !isValidDuration(duration) ||
                                  !isValidClassSize(classSize)
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 disabled:bg-green-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all cursor-pointer"
                              >
                                {generating ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Generating {teachingDayNames[(generateProgress?.day ?? 1) - 1] ?? "lesson"} ({generateProgress?.day ?? 1} of {generateProgress?.total ?? teachingDayNames.length})…
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={14} /> Generate {teachingDayNames.length} Lesson{teachingDayNames.length === 1 ? "" : "s"}
                                  </>
                                )}
                              </button>
                              {teachingDayNames.length === 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">Pick at least one teaching day.</span>
                              )}
                            </div>

                            {generateError && <p className="text-sm text-red-600 dark:text-red-400">{generateError}</p>}

                            {generatedLessons && generatedLessons.length > 0 && (
                              <div className="space-y-4">
                                <LessonDownloadPanel
                                  lessons={generatedLessons.map((lesson) => ({
                                    header: lesson.header,
                                    lessonPlan: lesson.lessonPlan,
                                    lessonNote: lesson.lessonNote,
                                    phases: lesson.phases,
                                    indicators: lesson.schemeContext?.indicators,
                                  }))}
                                  dayLabels={teachingDayNames}
                                />

                                {generatedLessons.map((lesson, i) => (
                                  <LessonPlanTable
                                    key={`${lesson.header.indicatorCode}-${i}`}
                                    header={lesson.header}
                                    phases={lesson.phases}
                                    lessonPlan={lesson.lessonPlan}
                                    indicators={lesson.schemeContext?.indicators}
                                    title={`${teachingDayNames[i] ?? `Day ${i + 1}`} — Week ${selectedWeek.weekNumber}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
