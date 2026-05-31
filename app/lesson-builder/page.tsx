"use client";

import { useState, useRef } from "react";
import { Loader2, Save, Printer, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import SubjectSelector from "@/components/curriculum/SubjectSelector";
import SectionCard from "@/components/lesson/SectionCard";
import type { GenerateResponse } from "@/types/curriculum";

interface SelectedIndicator {
  code: string;
  text: string;
  bloomsLevel: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
}

const DURATIONS = [
  { value: "40", label: "40 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "80", label: "80 minutes (double)" },
];

const CLASS_SIZES = [
  { value: "25", label: "~25 students" },
  { value: "35", label: "~35 students" },
  { value: "45", label: "~45 students" },
  { value: "60", label: "60+ students" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
          <div className="p-5 space-y-3">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/6" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LessonBuilderPage() {
  const [selectedIndicator, setSelectedIndicator] =
    useState<SelectedIndicator | null>(null);
  const [duration, setDuration] = useState("60");
  const [classSize, setClassSize] = useState("35");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!selectedIndicator) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorCode: selectedIndicator.code,
          indicatorText: selectedIndicator.text,
          subject: selectedIndicator.subject,
          grade: selectedIndicator.grade,
          strand: selectedIndicator.strand,
          subStrand: selectedIndicator.subStrand,
          bloomsLevel: selectedIndicator.bloomsLevel,
          duration,
          classSize,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.data);
      toast.success("Lesson materials generated successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate lesson";
      setError(msg);
      toast.error("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !selectedIndicator) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorCode: selectedIndicator.code,
          subject: selectedIndicator.subject,
          grade: selectedIndicator.grade,
          strand: selectedIndicator.strand,
          subStrand: selectedIndicator.subStrand,
          teacherNotes: result.teacherNotes,
          visualPrompts: result.visualPrompts,
          studentReading: result.studentReading,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        toast.success("Lesson saved to your library!");
      }
    } catch {
      toast.error("Failed to save lesson.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!result || !printRef.current) return;
    setExporting(true);
    toast.info("Preparing PDF export...");

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`lesson-${result.indicatorCode}-${result.subject}-${result.grade}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch {
      toast.error("PDF export failed. Try printing instead.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          .print-content { padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-8 no-print">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
                NaCCA SBC
              </span>
              <span className="text-xs text-white/70">Ghana JHS</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Lesson & Material Builder
            </h1>
            <p className="text-green-100 text-sm mt-1">
              Generate teacher notes, visual prompts and student materials from
              any NaCCA indicator
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-6 space-y-5 print-content">
          {/* Selector card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 no-print">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Select Indicator
            </h2>
            <SubjectSelector onSelect={setSelectedIndicator} />

            {selectedIndicator && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Lesson duration
                    </label>
                    <select
                      value={duration}
                      title="Lesson duration"
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Class size
                    </label>
                    <select
                      value={classSize}
                      title="Class size"
                      onChange={(e) => setClassSize(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      {CLASS_SIZES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating lesson materials...
                    </>
                  ) : (
                    "✦ Generate Lesson Materials"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 no-print">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <LoadingSkeleton />}

          {/* Results */}
          {result && !loading && (
            <div ref={printRef} className="space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 no-print">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Materials generated for {result.indicatorCode}
                  </p>
                  <p className="text-xs text-green-600">
                    {result.subject} · {result.grade} · {result.strand}
                  </p>
                </div>
              </div>

              {/* Print header — only shows when printing */}
              <div className="hidden print:block mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                  CurriculumCraft AI — Lesson Materials
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {result.indicatorCode} · {result.subject} · {result.grade} · {result.strand}
                </p>
                <hr className="mt-3 border-gray-300" />
              </div>

              {/* Section cards */}
              <SectionCard
                icon="📋"
                label="Teacher Notes"
                content={result.teacherNotes}
                accentColor="green"
              />
              <SectionCard
                icon="🎨"
                label="Visual Content Prompts"
                content={result.visualPrompts}
                accentColor="amber"
              />
              <SectionCard
                icon="📖"
                label="Student Reading Material"
                content={result.studentReading}
                accentColor="blue"
              />

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-3 no-print">
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-300 bg-green-50 text-green-800 text-sm font-medium hover:bg-green-100 transition-all disabled:opacity-60"
                >
                  {saved ? (
                    <>
                      <CheckCircle size={14} />
                      Saved
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save to library
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-medium hover:bg-blue-100 transition-all disabled:opacity-60"
                >
                  {exporting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Export PDF
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all"
                >
                  <Printer size={14} />
                  Print
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}