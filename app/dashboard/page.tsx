"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  Search,
} from "lucide-react";
import { useCurriculumCatalog } from "@/components/curriculum/useCurriculumCatalog";
import { subjectsTaughtAt } from "@/lib/curriculum/catalog";
import type { IndicatorExemplar } from "@/types/curriculum";

interface Indicator {
  code: string;
  text: string;
  bloomsLevel: string | null;
  grade: string;
  contentStandardCode?: string | null;
  contentStandardText?: string | null;
  exemplars: IndicatorExemplar[];
}

interface SubStrand {
  name: string;
  indicators: Indicator[];
}

interface Strand {
  name: string;
  subStrands: SubStrand[];
}

const BLOOMS_COLORS: Record<string, string> = {
  Remember: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
  Understand: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50",
  Apply: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/50",
  Analyse: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50",
  Evaluate: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50",
  Create: "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700/50",
};

function IndicatorRow({
  indicator,
  onBuild,
  subject,
  strand,
  subStrand,
}: {
  indicator: Indicator;
  onBuild: (ind: Indicator, subject: string, strand: string, subStrand: string) => void;
  subject: string;
  strand: string;
  subStrand: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-green-200 dark:hover:border-green-700 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-all group">
      {/* Top row — code badge + blooms + grade */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-green-700 group-hover:text-white transition-colors flex-shrink-0">
          {indicator.code}
        </span>
        {indicator.bloomsLevel && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
            BLOOMS_COLORS[indicator.bloomsLevel] || "bg-gray-100 text-gray-600 border-gray-200"
          }`}>
            {indicator.bloomsLevel}
          </span>
        )}
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
          {indicator.grade}
        </span>
      </div>
      {/* Indicator text */}
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
        {indicator.text}
      </p>
      {indicator.contentStandardText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
          {indicator.contentStandardCode && `${indicator.contentStandardCode}: `}
          {indicator.contentStandardText}
        </p>
      )}
      {/* Build lesson button — full width on mobile */}
      <button
        onClick={() => onBuild(indicator, subject, strand, subStrand)}
        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-700 text-white text-xs font-medium hover:bg-green-800 transition-all"
      >
        <BookOpen size={11} />
        Build Lesson
      </button>
    </div>
  );
}

function SubStrandSection({
  subStrand,
  subject,
  strand,
  onBuild,
}: {
  subStrand: SubStrand;
  subject: string;
  strand: string;
  onBuild: (ind: Indicator, subject: string, strand: string, subStrand: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="ml-4 border-l-2 border-gray-100 dark:border-gray-700 pl-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-800 dark:hover:text-green-400 transition-colors w-full text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {subStrand.name}
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 font-normal">
          {subStrand.indicators.length} indicator{subStrand.indicators.length !== 1 ? "s" : ""}
        </span>
      </button>
      {open && (
        <div className="space-y-2 pb-2">
          {subStrand.indicators.map((ind) => (
            <IndicatorRow
              key={ind.code}
              indicator={ind}
              subject={subject}
              strand={strand}
              subStrand={subStrand.name}
              onBuild={onBuild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StrandSection({
  strand,
  subject,
  onBuild,
}: {
  strand: Strand;
  subject: string;
  onBuild: (ind: Indicator, subject: string, strand: string, subStrand: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const totalIndicators = strand.subStrands.reduce(
    (sum, ss) => sum + ss.indicators.length,
    0
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex-shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{strand.name}</span>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {totalIndicators} indicator{totalIndicators !== 1 ? "s" : ""}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
          {strand.subStrands.map((ss) => (
            <SubStrandSection
              key={ss.name}
              subStrand={ss}
              subject={subject}
              strand={strand.name}
              onBuild={onBuild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { catalog, error: catalogError } = useCurriculumCatalog();
  const [levelCode, setLevelCode] = useState("JHS");
  const [subject, setSubject] = useState("mathematics");
  const [grade, setGrade] = useState("B7");
  const [strands, setStrands] = useState<Strand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const currentLevel = catalog?.levels.find((level) => level.code === levelCode);
  const subjectsForLevel = subjectsTaughtAt(catalog, levelCode);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setStrands([]);
      try {
        const res = await fetch(
          `/api/curriculum?subject=${subject}&level=${levelCode}&grade=${grade}`
        );
        const data = await res.json();
        if (!cancelled && data.success) setStrands(data.data.strands);
      } catch (err) {
        console.error("Failed to fetch curriculum:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => { cancelled = true; };
  }, [subject, levelCode, grade]);

  const handleBuildLesson = (
    ind: Indicator,
    subjectSlug: string,
    strand: string,
    subStrand: string
  ) => {
    const subjectLabel =
      catalog?.subjects.find((item) => item.slug === subjectSlug)?.name || subjectSlug;
    const gradeMetadata = currentLevel?.grades.find((item) => item.code === ind.grade);
    const params = new URLSearchParams({
      code: ind.code,
      text: ind.text,
      subject: subjectLabel,
      subjectSlug,
      grade: ind.grade,
      curriculumSlug: catalog?.curriculum.slug ?? "ghana-nacca-sbc",
      levelCode,
      levelName: currentLevel?.name ?? levelCode,
      gradeName: gradeMetadata?.name ?? ind.grade,
      exemplarRevision: ind.exemplars[0]?.revision ?? "",
      strand,
      subStrand,
    });
    if (ind.bloomsLevel) params.set("bloomsLevel", ind.bloomsLevel);
    router.push(`/lesson-builder?${params.toString()}`);
  };

  const filteredStrands = search.trim()
    ? strands
        .map((strand) => ({
          ...strand,
          subStrands: strand.subStrands
            .map((ss) => ({
              ...ss,
              indicators: ss.indicators.filter(
                (ind) =>
                  ind.text.toLowerCase().includes(search.toLowerCase()) ||
                  ind.code.toLowerCase().includes(search.toLowerCase())
              ),
            }))
            .filter((ss) => ss.indicators.length > 0),
        }))
        .filter((strand) => strand.subStrands.length > 0)
    : strands;

  const totalIndicators = strands.reduce(
    (sum, s) => sum + s.subStrands.reduce((ss, sub) => ss + sub.indicators.length, 0),
    0
  );

  const subjectLabel =
    catalog?.subjects.find((item) => item.slug === subject)?.name || subject;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 via-green-700 to-green-600 dark:from-green-900 dark:via-green-800 dark:to-green-700 px-6 py-8 shadow-md">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm">
              NaCCA SBC
            </span>
            <span className="text-xs text-white/70">
              Ghana {currentLevel?.name ?? "JHS"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Standard Map</h1>
          <p className="text-green-100 text-sm mt-1">
            Browse the full NaCCA curriculum tree and build lessons from any indicator
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Level
              </label>
              <select
                value={levelCode}
                title="Education level"
                onChange={(event) => {
                  const nextLevel = catalog?.levels.find(
                    (level) => level.code === event.target.value
                  );
                  setLevelCode(event.target.value);
                  setGrade(nextLevel?.grades[0]?.code ?? "");
                  // A subject not taught at the new level gives way to one that is.
                  const taught = subjectsTaughtAt(catalog, event.target.value);
                  if (taught.length > 0 && !taught.some((item) => item.slug === subject)) setSubject(taught[0].slug);
                }}
                disabled={!catalog}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-60"
              >
                {catalog?.levels.map((level) => (
                  <option key={level.code} value={level.code}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Subject
              </label>
              <select
                value={subject}
                title="Subject"
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {subjectsForLevel.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Grade
              </label>
              <select
                value={grade}
                title="Grade"
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {currentLevel?.grades.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {catalogError && (
            <p className="mb-4 text-sm text-red-600">{catalogError}</p>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search indicators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-300">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{subjectLabel}</span> · Grade {grade}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-300">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{strands.length}</span> strands
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-300">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{totalIndicators}</span> indicators
              </span>
            </div>
          )}

          {/* Bloom's legend */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Bloom&apos;s Taxonomy levels</p>
            <div className="flex flex-wrap gap-2">
              {[
                { level: "Remember", color: "bg-gray-100 text-gray-600 border-gray-200" },
                { level: "Understand", color: "bg-blue-50 text-blue-700 border-blue-200" },
                { level: "Apply", color: "bg-green-50 text-green-700 border-green-200" },
                { level: "Analyse", color: "bg-amber-50 text-amber-700 border-amber-200" },
                { level: "Evaluate", color: "bg-purple-50 text-purple-700 border-purple-200" },
                { level: "Create", color: "bg-pink-50 text-pink-700 border-pink-200" },
              ].map(({ level, color }) => (
                <span
                  key={level}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${color}`}
                >
                  {level}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tree */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading curriculum...</span>
          </div>
        ) : filteredStrands.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {search
              ? "No indicators found matching your search."
              : `No ${currentLevel?.name ?? levelCode} curriculum indicators have been imported for ${grade} yet.`}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStrands.map((strand) => (
              <StrandSection
                key={strand.name}
                strand={strand}
                subject={subject}
                onBuild={handleBuildLesson}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}