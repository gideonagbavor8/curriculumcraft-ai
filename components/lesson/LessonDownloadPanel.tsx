"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { LessonDocumentType, LessonExportData } from "@/lib/lessonExport";

interface LessonDownloadPanelProps {
  /** The generated lessons, in teaching order. Each one's header carries the day it's taught. */
  lessons: LessonExportData[];
  /** Label for each lesson in the scope picker - the weekday it's taught on. */
  dayLabels: string[];
}

/** Which of the generated days go into the download. */
const ALL_DAYS = "all";

const FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "docx", label: "Word" },
] as const;
type ExportFormat = (typeof FORMATS)[number]["id"];

const DOCUMENTS: { id: LessonDocumentType; label: string; hint: string }[] = [
  { id: "plan", label: "Lesson Plan", hint: "The one-page table you submit and teach from" },
  { id: "note", label: "Lesson Note", hint: "The table plus the full expanded script" },
];

/**
 * Download controls for a week's generated lessons: which document, which
 * format, and how many days. A teacher rarely wants exactly one thing here -
 * they submit the whole week's plans to the head teacher but print a single
 * day's note to teach from - so the scope is a choice rather than a fixed
 * "download everything".
 */
export default function LessonDownloadPanel({ lessons, dayLabels }: LessonDownloadPanelProps) {
  const [documentType, setDocumentType] = useState<LessonDocumentType>("plan");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [scope, setScope] = useState<string>(ALL_DAYS);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lessons.length === 0) return null;

  const selected = scope === ALL_DAYS ? lessons : [lessons[Number(scope)]].filter(Boolean);

  const handleDownload = async () => {
    setExporting(true);
    setError(null);
    try {
      if (format === "pdf") {
        const { exportLessonPdf } = await import("@/lib/exportLessonPdf");
        await exportLessonPdf(selected, documentType);
      } else {
        const { exportLessonDocx } = await import("@/lib/exportLessonDocx");
        await exportLessonDocx(selected, documentType);
      }
    } catch (err) {
      console.error("Lesson download failed:", err);
      setError(err instanceof Error ? err.message : "Download failed - try the other format.");
    } finally {
      setExporting(false);
    }
  };

  const selectClass =
    "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600/40 cursor-pointer";
  const labelClass = "block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Download</h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="min-w-0">
          <span className={labelClass}>Document</span>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value as LessonDocumentType)} className={selectClass}>
            {DOCUMENTS.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.label}</option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className={labelClass}>Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className={selectClass}>
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className={labelClass}>Days</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={selectClass}>
            <option value={ALL_DAYS}>
              All {lessons.length} day{lessons.length === 1 ? "" : "s"}
            </option>
            {lessons.map((_, index) => (
              <option key={index} value={index}>{dayLabels[index] ?? `Day ${index + 1}`} only</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleDownload}
          disabled={exporting || selected.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 disabled:bg-green-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? "Preparing…" : `Download ${selected.length} ${selected.length === 1 ? "lesson" : "lessons"}`}
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {DOCUMENTS.find((d) => d.id === documentType)?.hint}
        </span>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
