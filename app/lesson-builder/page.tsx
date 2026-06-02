"use client";

import { useState, useRef } from "react";
import { Loader2, Save, Printer, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import SubjectSelector from "@/components/curriculum/SubjectSelector";
import SectionCard from "@/components/lesson/SectionCard";
import VisualPromptCard from "@/components/lesson/VisualPromptCard";
import CitationBanner from "@/components/lesson/CitationBanner";
import type { GenerateResponse, DifficultyLevel } from "@/types/curriculum";

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



const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; description: string; color: string }[] = [
  { value: "struggling", label: "Needs Support", description: "Extra scaffolding", color: "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 text-red-700 dark:text-red-300" },
  { value: "average", label: "On Track", description: "Standard level", color: "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 text-green-700 dark:text-green-300" },
  { value: "advanced", label: "Advanced", description: "Extension tasks", color: "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700 text-purple-700 dark:text-purple-300" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-100 dark:border-gray-700">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-150 dark:from-gray-700 dark:to-gray-600 rounded w-32" />
          </div>
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((line) => (
              <div key={line} className="h-3 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded" style={{ width: `${100 - line * 15}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LessonBuilderPage() {
  const [selectedIndicator, setSelectedIndicator] = useState<SelectedIndicator | null>(null);
  const [duration, setDuration] = useState("60");
  const [classSize, setClassSize] = useState("35");
  const language = "English";
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("average");
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
          language,
          difficultyLevel,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.data);
      toast.success(`Lesson generated in ${language}!`);
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
          language,
          difficultyLevel,
        }),
      });
      const data = await res.json();
      if (data.success) { setSaved(true); toast.success("Lesson saved to your library!"); }
    } catch { toast.error("Failed to save lesson."); }
    finally { setSaving(false); }
  };

  const handleExportPDF = async () => {
    if (!result || !printRef.current) return;
    setExporting(true);
    toast.info("Preparing PDF export...");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
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
      pdf.save(`lesson-${result.indicatorCode}-${language}.pdf`);
      toast.success("PDF downloaded!");
    } catch { toast.error("PDF export failed. Try printing instead."); }
    finally { setExporting(false); }
  };

  return (
    <>
      <style>{`@media print { nav, .no-print { display: none !important; } body { background: white !important; } }`}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="bg-gradient-to-r from-green-800 via-green-700 to-green-600 dark:from-green-900 dark:via-green-800 dark:to-green-700 px-6 py-8 no-print shadow-md">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 mb-2 animate-fadeIn">
              <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm">NaCCA SBC</span>
              <span className="text-xs text-white/70">Ghana JHS</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 animate-fadeIn-1">Lesson & Material Builder</h1>
            <p className="text-green-100 text-sm animate-fadeIn-2">Generate culturally relevant lesson materials aligned to NaCCA standards</p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 no-print">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-4">Select Indicator</h2>
            <SubjectSelector onSelect={(ind) => { setSelectedIndicator(ind); setSaved(false); setResult(null); }} />

            {selectedIndicator && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 space-y-5">

                {/* Difficulty level */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-2">
                    Student Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTY_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setDifficultyLevel(level.value)}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all duration-200 transform hover:scale-105 ${
                          difficultyLevel === level.value
                            ? "bg-green-700 border-green-700 text-white shadow-lg shadow-green-500/30 scale-105"
                            : `bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-600 ${level.color} hover:border-green-300 dark:hover:border-green-600 hover:shadow-md`
                        }`}
                      >
                        <span className="text-xs font-semibold">{level.label}</span>
                        <span className={`text-[10px] mt-0.5 ${difficultyLevel === level.value ? "text-green-200" : "opacity-70"}`}>
                          {level.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration + Class size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Lesson duration</label>
                    <select value={duration} title="Lesson duration" onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
                      {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">Class size</label>
                    <select value={classSize} title="Class size" onChange={(e) => setClassSize(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
                      {CLASS_SIZES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={handleGenerate} disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 disabled:from-green-300 disabled:to-green-200 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:shadow-green-500/30 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 duration-150">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" />Generating Lesson Materials...</>
                    : "✦ Generate Lesson Materials"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 no-print">
              {error}
            </div>
          )}

          {loading && <LoadingSkeleton />}

          {result && !loading && (
            <div ref={printRef} className="space-y-4">
              <CitationBanner citations={result.citations} indicatorCode={result.indicatorCode} />

              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3 no-print">
                <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Materials generated for {result.indicatorCode}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {result.subject} · {result.grade} · {result.strand} · {language} · {difficultyLevel}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                    {difficultyLevel}
                  </span>
                </div>
              </div>

              <div className="hidden print:block mb-6">
                <h1 className="text-xl font-bold text-gray-900">CurriculumCraft AI — Lesson Materials</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {result.indicatorCode} · {result.subject} · {result.grade} · {language}
                </p>
                <hr className="mt-3 border-gray-300" />
              </div>

              <SectionCard icon="📋" label="Teacher Notes" content={result.teacherNotes} accentColor="green" citations={result.citations} />
              <VisualPromptCard content={result.visualPrompts} citations={result.citations} />
              <SectionCard icon="📖" label={`Student Reading Material — ${language}`} content={result.studentReading} accentColor="blue" citations={result.citations} />

              <div className="grid grid-cols-3 gap-3 no-print">
                <button onClick={handleSave} disabled={saving || saved}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-all disabled:opacity-60">
                  {saved ? <><CheckCircle size={14} />Saved</> : saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Save size={14} />Save to library</>}
                </button>
                <button onClick={handleExportPDF} disabled={exporting}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all disabled:opacity-60">
                  {exporting ? <><Loader2 size={14} className="animate-spin" />Exporting...</> : <><Download size={14} />Export PDF</>}
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                  <Printer size={14} />Print
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}