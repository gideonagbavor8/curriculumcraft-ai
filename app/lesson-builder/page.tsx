"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Save, Printer, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import SubjectSelector from "@/components/curriculum/SubjectSelector";
import SectionCard from "@/components/lesson/SectionCard";
import LessonSectionTable from "@/components/lesson/LessonSectionTable";
import VisualPromptCard from "@/components/lesson/VisualPromptCard";
import { SHOW_VISUAL_PROMPTS } from "@/lib/featureFlags";
import CitationBanner from "@/components/lesson/CitationBanner";
import LessonPlanTable from "@/components/lesson/LessonPlanTable";
import LessonDownloadPanel from "@/components/lesson/LessonDownloadPanel";
import LessonSizingFields, { isValidDuration, isValidClassSize } from "@/components/lesson/LessonSizingFields";
import StudentWorksheetModal from "@/components/lesson/StudentWorksheetModal";
import ReferenceInspector from "@/components/lesson/ReferenceInspector";
import ErrorCard from "@/components/lesson/ErrorCard";
import GeneratedNotice from "@/components/lesson/GeneratedNotice";
import type { GenerateResponse, DifficultyLevel } from "@/types/curriculum";
import { useTeacherProfile, readExampleHistory, writeExampleHistory } from "@/lib/teacherProfile";
import LocationCascadeSelect, { type LocationCascadeValue } from "@/components/location/LocationCascadeSelect";
import type { LocalExampleCategory } from "@/lib/localContext/types";
import { lessonDateFor } from "@/lib/lessonDate";

interface SelectedIndicator {
  code: string;
  text: string;
  bloomsLevel: string | null;
  grade: string;
  curriculumSlug?: string;
  levelCode?: string;
  levelName?: string;
  gradeName?: string;
  typicalAgeMin?: number;
  typicalAgeMax?: number;
  exemplarRevision?: string;
  subject: string;
  subjectSlug?: string;
  strand: string;
  subStrand: string;
}


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
  const [schoolName, setSchoolName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [weekEnding, setWeekEnding] = useState("");
  const [day, setDay] = useState("");
  const language = "English";
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("average");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"plan" | "note" | "reading" | "visual">("plan");
  const [isWorksheetOpen, setIsWorksheetOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  // Counts finished generations so each one gets a fresh "ready" card.
  const [readyCount, setReadyCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { profile } = useTeacherProfile();
  // The school on the plan's header is the one saved in Settings unless the
  // teacher types another - typed once, not once per lesson.
  const headerSchoolName = schoolName || profile.schoolName || "";
  const [locationOverride, setLocationOverride] = useState<LocationCascadeValue>({
    region: "",
    district: "",
    community: "",
    schoolName: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const text = params.get("text");
    const subject = params.get("subject");
    const grade = params.get("grade");
    const strand = params.get("strand");
    const subStrand = params.get("subStrand");
    const bloomsLevel = params.get("bloomsLevel");

    if (code && text && subject && grade && strand && subStrand) {
      const timeout = window.setTimeout(() => {
        setSelectedIndicator({
          code,
          text,
          subject,
          subjectSlug: params.get("subjectSlug") ?? undefined,
          grade,
          strand,
          subStrand,
          bloomsLevel: bloomsLevel || null,
          curriculumSlug: params.get("curriculumSlug") ?? undefined,
          levelCode: params.get("levelCode") ?? undefined,
          levelName: params.get("levelName") ?? undefined,
          gradeName: params.get("gradeName") ?? undefined,
          exemplarRevision: params.get("exemplarRevision") || undefined,
        });
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, []);

  // Core generation logic - takes explicit params so a retry can pass the values it was called with
  const handleGenerateWith = async (
    indicator: SelectedIndicator,
    dur: string,
    size: string,
    difficulty: DifficultyLevel
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorCode: indicator.code,
          indicatorText: indicator.text,
          subject: indicator.subject,
          grade: indicator.grade,
          curriculumSlug: indicator.curriculumSlug,
          levelCode: indicator.levelCode,
          levelName: indicator.levelName,
          gradeName: indicator.gradeName,
          typicalAgeMin: indicator.typicalAgeMin,
          typicalAgeMax: indicator.typicalAgeMax,
          exemplarRevision: indicator.exemplarRevision,
          strand: indicator.strand,
          subStrand: indicator.subStrand,
          bloomsLevel: indicator.bloomsLevel,
          duration: dur,
          classSize: size,
          language,
          difficultyLevel: difficulty,
          schoolName: headerSchoolName || undefined,
          teacherName: teacherName || undefined,
          weekEnding: weekEnding || undefined,
          day: day || undefined,
          lessonDate: lessonDateFor(weekEnding, day) || undefined,
          locationProfile: locationOverride.region
            ? {
                region: locationOverride.region,
                district: locationOverride.district || undefined,
                community: locationOverride.community || undefined,
                schoolName: locationOverride.schoolName || undefined,
              }
            : profile,
          exampleHistory: readExampleHistory(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.data);
      setReadyCount((count) => count + 1);
      const used = data.data.resolvedLocalContext?.examples as Partial<Record<LocalExampleCategory, string>> | undefined;
      if (used) {
        const history = readExampleHistory();
        for (const [category, value] of Object.entries(used)) {
          if (!value) continue;
          const prior = (history[category] ?? []).filter((item: string) => item !== value);
          history[category] = [value, ...prior].slice(0, 4);
        }
        writeExampleHistory(history);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate lesson";
      setError(msg);
      toast.error("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedIndicator) return;
    handleGenerateWith(selectedIndicator, duration, classSize, difficultyLevel);
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
          curriculumSlug: selectedIndicator.curriculumSlug,
          levelCode: selectedIndicator.levelCode,
          strand: selectedIndicator.strand,
          subStrand: selectedIndicator.subStrand,
          lessonPlan: result.lessonPlan,
          teacherNotes: result.lessonNote,
          visualPrompts: result.visualPrompts,
          studentReading: result.studentReading,
          lessonHeader: result.header,
          language,
          difficultyLevel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        toast.success("Lesson saved to your library!");
        window.dispatchEvent(new Event("lesson-saved"));
      }
    } catch {
      toast.error("Failed to save lesson.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`@media print { nav, .no-print { display: none !important; } body { background: white !important; } }`}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="bg-gradient-to-r from-green-800 via-green-700 to-green-600 dark:from-green-900 dark:via-green-800 dark:to-green-700 px-6 py-8 no-print shadow-md">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 mb-2 animate-fadeIn">
              <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm">NaCCA SBC</span>
              <span className="text-xs text-white/70">
                Ghana {selectedIndicator?.levelName ?? "Primary & JHS"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 animate-fadeIn-1">Lesson & Material Builder</h1>
            <p className="text-green-100 text-sm animate-fadeIn-2">Generate culturally relevant lesson materials aligned to NaCCA standards</p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 no-print">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-4">Select Indicator</h2>
            <SubjectSelector
              key={selectedIndicator?.code ?? "empty"}
              initialSelection={selectedIndicator}
              onSelect={(ind) => { setSelectedIndicator(ind); setSaved(false); setResult(null); }}
            />

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

                {/* Duration + Class size - typed, so a 70-minute double period or a class of 52 is stated exactly */}
                <LessonSizingFields
                  duration={duration}
                  classSize={classSize}
                  onDurationChange={setDuration}
                  onClassSizeChange={setClassSize}
                />

                {/* Local context - full Region→District→Town→School cascade drives examples */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">
                    Location for local examples (optional override)
                  </label>
                  <LocationCascadeSelect value={locationOverride} onChange={setLocationOverride} />
                  {!profile.region && !locationOverride.region && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      No location saved - set one in Settings, or pick Region → District → Town → School above just for this lesson.
                    </p>
                  )}
                  {profile.region && !locationOverride.region && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      Using your saved location: {[profile.schoolName, profile.community, profile.district, profile.region].filter(Boolean).join(", ")}. Fill in above to override for this lesson only.
                    </p>
                  )}
                </div>

                {/* Optional GES header identity fields */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">
                    Lesson plan header details (optional)
                    {lessonDateFor(weekEnding, day) && (
                      <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
                        Date on the plan: {lessonDateFor(weekEnding, day)}
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
                      placeholder={profile.schoolName ? `School: ${profile.schoolName}` : "School name"}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                    <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="Teacher name"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                    <input type="date" value={weekEnding} onChange={(e) => setWeekEnding(e.target.value)}
                      title="Week ending"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                    <select value={day} onChange={(e) => setDay(e.target.value)} title="Day"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
                      <option value="">Day</option>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button onClick={handleGenerate} disabled={loading || !isValidDuration(duration) || !isValidClassSize(classSize)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 disabled:from-green-300 disabled:to-green-200 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:shadow-green-500/30 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 duration-150">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" />Generating Lesson Materials...</>
                    : "✦ Generate Lesson Materials"}
                </button>
              </div>
            )}
          </div>

          {result && readyCount > 0 && (
            <GeneratedNotice
              key={readyCount}
              title="Lesson materials ready"
              detail={`${result.indicatorCode} · ${result.subject} · ${selectedIndicator?.gradeName ?? result.grade}`}
            />
          )}

          {error && (
            <div className="no-print">
              <ErrorCard message={error} onRetry={handleGenerate} />
            </div>
          )}

          {loading && <LoadingSkeleton />}

          {result && !loading && (
            <div ref={printRef} className="space-y-4">
              <CitationBanner 
                citations={result.citations} 
                indicatorCode={result.indicatorCode} 
                onInspect={() => setIsInspectorOpen(true)}
              />

              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3 no-print">
                <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Materials generated for {result.indicatorCode}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {result.subject} · {result.grade} · {result.strand} · {difficultyLevel}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {result.resolvedLocalContext && (
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                      📍 {result.resolvedLocalContext.regionName}
                      {result.resolvedLocalContext.isFallback ? " (auto-varied)" : ""}
                    </span>
                  )}
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                    {difficultyLevel}
                  </span>
                </div>
              </div>

              <div className="hidden print:block mb-6">
                <h1 className="text-xl font-bold text-gray-900">CurriculumCraft AI — Lesson Materials</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {result.indicatorCode} · {result.subject} · {result.grade}
                </p>
                <hr className="mt-3 border-gray-300" />
              </div>

              <LessonPlanTable header={result.header} phases={result.phases} lessonPlan={result.lessonPlan} />

              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 no-print">
                {([
                  { key: "plan", label: "Lesson Plan" },
                  { key: "note", label: "Lesson Note" },
                  { key: "reading", label: "Student Reading" },
                  { key: "visual", label: "Visual Prompts" },
                ] as const)
                  .filter((tab) => tab.key !== "visual" || SHOW_VISUAL_PROMPTS)
                  .map((tab) => (
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
                <LessonSectionTable
                  icon="📋"
                  label="Lesson Plan"
                  content={result.lessonPlan}
                  accentColor="green"
                  citations={result.citations}
                  onInspect={() => setIsInspectorOpen(true)}
                />
              )}
              {activeTab === "note" && (
                <LessonSectionTable
                  icon="📝"
                  label="Lesson Note"
                  content={result.lessonNote}
                  accentColor="green"
                  citations={result.citations}
                  onInspect={() => setIsInspectorOpen(true)}
                />
              )}
              {activeTab === "visual" && (
                <VisualPromptCard
                  content={result.visualPrompts}
                  citations={result.citations}
                  subject={result.subject}
                  onInspect={() => setIsInspectorOpen(true)}
                />
              )}
              {activeTab === "reading" && (
                <SectionCard
                  icon="📖"
                  label={`Student Reading Material — ${language}`}
                  content={result.studentReading}
                  accentColor="blue"
                  citations={result.citations}
                  onInspect={() => setIsInspectorOpen(true)}
                />
              )}

              {/* One action bar: the download controls on the left with the
                  button they drive, the three one-off actions on the right.
                  The four Plan/Note x PDF/Word buttons this replaces were the
                  same action four times over. */}
              <div className="no-print">
                <LessonDownloadPanel
                  lessons={[{
                    header: result.header,
                    lessonPlan: result.lessonPlan,
                    lessonNote: result.lessonNote,
                    phases: result.phases,
                  }]}
                >
                  <button onClick={handleSave} disabled={saving || saved}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-60 cursor-pointer">
                    {saved ? <><CheckCircle size={14} />Saved</> : saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Save size={14} />Save</>}
                  </button>
                  <button onClick={() => setIsWorksheetOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer">
                    <FileText size={14} />Worksheet
                  </button>
                  <button onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                    <Printer size={14} />Print
                  </button>
                </LessonDownloadPanel>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <StudentWorksheetModal
          isOpen={isWorksheetOpen}
          onClose={() => setIsWorksheetOpen(false)}
          studentReading={result.studentReading}
          indicatorCode={result.indicatorCode}
          subject={result.subject}
          grade={result.grade}
          strand={result.strand}
          subStrand={selectedIndicator?.subStrand}
        />
      )}

      {result && (
        <ReferenceInspector
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          indicatorCode={result.indicatorCode}
          indicatorText={selectedIndicator?.text || ""}
          subject={result.subject}
          grade={result.grade}
          strand={result.strand}
          subStrand={selectedIndicator?.subStrand}
          bloomsLevel={selectedIndicator?.bloomsLevel}
          foundryContext={result.foundryContext}
        />
      )}
    </>
  );
}