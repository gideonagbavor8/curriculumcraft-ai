"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Printer, Download } from "lucide-react";
import SectionCard from "@/components/lesson/SectionCard";

interface SavedLesson {
  id: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  createdAt: string;
}

export default function SavedLessonViewPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [lesson, setLesson] = useState<SavedLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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

const handleExportPDF = async () => {
  if (!lesson) return;
  setExporting(true);
  try {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPage = (needed = 10) => {
      if (y + needed > pageHeight - 15) {
        pdf.addPage();
        y = 20;
      }
    };

    const addTitle = (text: string) => {
      checkPage(12);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(20, 90, 20);
      pdf.text(text, margin, y);
      y += 8;
    };

    const addBody = (raw: string) => {
      const clean = raw
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/#{1,3}\s?/g, "")
        .replace(/^-\s/gm, "• ");
      const lines = clean.split("\n");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(40, 40, 40);
      lines.forEach((line) => {
        if (!line.trim()) { y += 3; return; }
        const wrapped = pdf.splitTextToSize(line.trim(), maxWidth);
        wrapped.forEach((wl: string) => {
          checkPage(6);
          pdf.text(wl, margin, y);
          y += 5;
        });
      });
      y += 4;
    };

    const addDivider = () => {
      checkPage(8);
      pdf.setDrawColor(180, 220, 180);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
    };

    // Header
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(20, 90, 20);
    pdf.text("CurriculumCraft AI", margin, y);
    y += 9;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    pdf.text(
      `${lesson.indicatorCode} · ${lesson.subject} · Grade ${lesson.grade} · ${lesson.strand}`,
      margin, y
    );
    y += 6;

    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text("curriculumcraft-ai.vercel.app · Built for Ghana NaCCA JHS", margin, y);
    y += 10;

    addDivider();
    addTitle("TEACHER NOTES");
    addBody(lesson.teacherNotes);

    addDivider();
    addTitle("VISUAL CONTENT PROMPTS");
    addBody(lesson.visualPrompts);

    addDivider();
    addTitle("STUDENT READING MATERIAL");
    addBody(lesson.studentReading);

    // Footer on last page
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(160, 160, 160);
      pdf.text(
        `CurriculumCraft AI · Page ${i} of ${totalPages}`,
        margin,
        pageHeight - 8
      );
    }

    pdf.save(`lesson-${lesson.indicatorCode}-${lesson.subject}.pdf`);
  } catch (err) {
    console.error("PDF export error:", err);
  } finally {
    setExporting(false);
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
            <SectionCard
              icon="📋"
              label="Teacher Notes"
              content={lesson.teacherNotes}
              accentColor="green"
            />
            <SectionCard
              icon="🎨"
              label="Visual Content Prompts"
              content={lesson.visualPrompts}
              accentColor="amber"
            />
            <SectionCard
              icon="📖"
              label="Student Reading Material"
              content={lesson.studentReading}
              accentColor="blue"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all disabled:opacity-60"
            >
              {exporting ? (
                <><Loader2 size={14} className="animate-spin" />Exporting...</>
              ) : (
                <><Download size={14} />Export PDF</>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
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