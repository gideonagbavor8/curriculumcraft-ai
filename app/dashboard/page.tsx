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

interface Indicator {
  code: string;
  text: string;
  bloomsLevel: string;
  grade: string;
}

interface SubStrand {
  name: string;
  indicators: Indicator[];
}

interface Strand {
  name: string;
  subStrands: SubStrand[];
}

const SUBJECTS = [
  { label: "Mathematics", slug: "mathematics" },
  { label: "Science", slug: "science" },
  { label: "English Language", slug: "english-language" },
  { label: "Computing", slug: "computing" },
  { label: "Social Studies", slug: "social-studies" },
  { label: "RME", slug: "rme" },
  { label: "Career Technology", slug: "career-technology" },
];

const GRADES = ["B7", "B8", "B9"];

const BLOOMS_COLORS: Record<string, string> = {
  Remember: "bg-gray-100 text-gray-600 border-gray-200",
  Understand: "bg-blue-50 text-blue-700 border-blue-200",
  Apply: "bg-green-50 text-green-700 border-green-200",
  Analyse: "bg-amber-50 text-amber-700 border-amber-200",
  Evaluate: "bg-purple-50 text-purple-700 border-purple-200",
  Create: "bg-pink-50 text-pink-700 border-pink-200",
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
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:border-green-200 hover:bg-green-50/30 transition-all group">
      <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600 flex-shrink-0 mt-0.5 group-hover:bg-green-700 group-hover:text-white transition-colors">
        {indicator.code}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-relaxed">{indicator.text}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              BLOOMS_COLORS[indicator.bloomsLevel] || "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {indicator.bloomsLevel}
          </span>
          <span className="text-[10px] text-gray-400">{indicator.grade}</span>
        </div>
      </div>
      <button
        onClick={() => onBuild(indicator, subject, strand, subStrand)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all hover:bg-green-800"
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
    <div className="ml-4 border-l-2 border-gray-100 pl-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 py-2 text-sm font-medium text-gray-600 hover:text-green-800 transition-colors w-full text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {subStrand.name}
        <span className="ml-auto text-[10px] text-gray-400 font-normal">
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-green-700 flex-shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <span className="font-semibold text-gray-800 text-sm">{strand.name}</span>
        <span className="ml-auto text-xs text-gray-400">
          {totalIndicators} indicator{totalIndicators !== 1 ? "s" : ""}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1 border-t border-gray-100 pt-3">
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
  const [subject, setSubject] = useState("mathematics");
  const [grade, setGrade] = useState("B7");
  const [strands, setStrands] = useState<Strand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setStrands([]);
      try {
        const res = await fetch(`/api/curriculum?subject=${subject}&grade=${grade}`);
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
  }, [subject, grade]);

  const handleBuildLesson = (
    ind: Indicator,
    subjectSlug: string,
    strand: string,
    subStrand: string
  ) => {
    const subjectLabel = SUBJECTS.find((s) => s.slug === subjectSlug)?.label || subjectSlug;
    const params = new URLSearchParams({
      code: ind.code,
      text: ind.text,
      subject: subjectLabel,
      grade: ind.grade,
      strand,
      subStrand,
      bloomsLevel: ind.bloomsLevel,
    });
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

  const subjectLabel = SUBJECTS.find((s) => s.slug === subject)?.label || subject;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
              NaCCA SBC
            </span>
            <span className="text-xs text-white/70">Ghana JHS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Standard Map</h1>
          <p className="text-green-100 text-sm mt-1">
            Browse the full NaCCA curriculum tree and build lessons from any indicator
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Subject
              </label>
              <select
                value={subject}
                title="Subject"
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Grade
              </label>
              <select
                value={grade}
                title="Grade"
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search indicators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-800">{subjectLabel}</span> · Grade {grade}
              </span>
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-800">{strands.length}</span> strands
              </span>
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-800">{totalIndicators}</span> indicators
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
            No indicators found matching your search.
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