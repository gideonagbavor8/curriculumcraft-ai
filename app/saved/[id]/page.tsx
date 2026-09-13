"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Printer, Download } from "lucide-react";
import SectionCard from "@/components/lesson/SectionCard";
import LessonHeaderTable from "@/components/lesson/LessonHeaderTable";
import type { LessonHeader } from "@/types/curriculum";
import type { LessonDocumentType } from "@/lib/lessonExport";

interface SavedLesson {
  id: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  lessonPlan?: string | null;
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  createdAt: string;
  lessonHeader?: LessonHeader | null;
}

// Older saved lessons predate the structured header column - reconstruct a
// minimal one from the fields that do exist so the page never crashes.
function fallbackHeader(lesson: SavedLesson): LessonHeader {
  return {
    curriculumSlug: "ghana-nacca-sbc",
    levelName: "School",
    subject: lesson.subject,
    gradeName: lesson.grade,
    grade: lesson.grade,
    classSize: "-",
    duration: "-",
    strand: lesson.strand,
    subStrand: lesson.subStrand,
    indicatorCode: lesson.indicatorCode,
    indicatorText: "",
    reference: "Ghana NaCCA Standards-Based Curriculum (2019)",
  };
}

export default function SavedLessonViewPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [lesson, setLesson] = useState<SavedLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [activeTab, setActiveTab] = useState<"plan" | "note" | "reading" | "visual">("plan");
//   const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/lessons");
        const data = await res.json();
        if (!cancelled && data.success) {
          const found = data.data.find((l: SavedLesson) => l.id === id);
          if (found) {
            setLesson(found);
          } else {
            setError("Lesson not found.");
          }
        }
      } catch {
        setError("Failed to load lesson.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

const handleExportPDF = async (documentType: LessonDocumentType) => {
  if (!lesson) return;
  setExporting(true);
  try {
    const { exportLessonPdf } = await import("@/lib/exportLessonPdf");
    await exportLessonPdf({
      header: lesson.lessonHeader ?? fallbackHeader(lesson),
      lessonPlan: lesson.lessonPlan ?? lesson.teacherNotes,
      lessonNote: lesson.teacherNotes,
    }, documentType);
  } catch (err) {
    console.error("PDF export error:", err);
  } finally {
    setExporting(false);
  }
};

const handleExportDocx = async (documentType: LessonDocumentType) => {
  if (!lesson) return;
  setExportingDocx(true);
  try {
    const { exportLessonDocx } = await import("@/lib/exportLessonDocx");
    await exportLessonDocx({
      header: lesson.lessonHeader ?? fallbackHeader(lesson),
      lessonPlan: lesson.lessonPlan ?? lesson.teacherNotes,
      lessonNote: lesson.teacherNotes,
    }, documentType);
  } catch (err) {
    console.error("DOCX export error:", err);
  } finally {
    setExportingDocx(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading lesson...</span>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error || "Lesson not found."}
          </p>
          <button
            onClick={() => router.push("/saved")}
            className="text-sm text-green-700 dark:text-green-400 hover:underline"
          >
            Back to saved lessons
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          nav, footer, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-8 no-print">
          <div className="mx-auto max-w-4xl">
            <button
              onClick={() => router.push("/saved")}
              className="flex items-center gap-2 text-green-200 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to saved lessons
            </button>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
                {lesson.indicatorCode}
              </span>
              <span className="text-xs text-white/70">
                {lesson.subject} · {lesson.grade} · {lesson.strand}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">Saved Lesson</h1>
            <p className="text-green-100 text-xs mt-1">
              Saved on{" "}
              {new Date(lesson.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          {/* Print header */}
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              CurriculumCraft AI — Lesson Materials
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {lesson.indicatorCode} · {lesson.subject} · {lesson.grade} · {lesson.strand}
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Lesson content */}
          <div className="space-y-4">
            <LessonHeaderTable header={lesson.lessonHeader ?? fallbackHeader(lesson)} />

            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 no-print">
              {([
                { key: "plan", label: "Lesson Plan" },
                { key: "note", label: "Lesson Note" },
                { key: "reading", label: "Student Reading" },
                { key: "visual", label: "Visual Prompts" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-white dark:bg-gray-900 text-green-700 dark:text-green-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "plan" && (
              <SectionCard icon="📋" label="Lesson Plan" content={lesson.lessonPlan ?? lesson.teacherNotes} accentColor="green" />
            )}
            {activeTab === "note" && (
              <SectionCard icon="📝" label="Lesson Note" content={lesson.teacherNotes} accentColor="green" />
            )}
            {activeTab === "visual" && (
              <SectionCard icon="🎨" label="Visual Content Prompts" content={lesson.visualPrompts} accentColor="amber" />
            )}
            {activeTab === "reading" && (
              <SectionCard icon="📖" label="Student Reading Material" content={lesson.studentReading} accentColor="blue" />
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
            <button
              onClick={() => handleExportPDF("plan")}
              disabled={exporting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all disabled:opacity-60"
            >
              <Download size={14} />Plan PDF
            </button>
            <button
              onClick={() => handleExportDocx("plan")}
              disabled={exportingDocx}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-60"
            >
              <Download size={14} />Plan Word
            </button>
            <button
              onClick={() => handleExportPDF("note")}
              disabled={exporting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all disabled:opacity-60"
            >
              <Download size={14} />Note PDF
            </button>
            <button
              onClick={() => handleExportDocx("note")}
              disabled={exportingDocx}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-60"
            >
              <Download size={14} />Note Word
            </button>
          </div>
          <div className="no-print">
            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>
      </div>
    </>
  );
}