"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCurriculumCatalog } from "./useCurriculumCatalog";
import { stripInlineMarkdown } from "@/lib/markdownBlocks";
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
  exemplars?: IndicatorExemplar[];
  exemplarRevision?: string;
  contentStandardCode?: string;
  contentStandardText?: string;
  subject: string;
  subjectSlug?: string;
  strand: string;
  subStrand: string;
}

interface SubjectSelectorProps {
  onSelect: (indicator: SelectedIndicator) => void;
  initialSelection?: SelectedIndicator | null;
}

const BLOOMS_COLORS: Record<string, string> = {
  Remember: "bg-gray-100 text-gray-700",
  Understand: "bg-blue-100 text-blue-700",
  Apply: "bg-green-100 text-green-700",
  Analyse: "bg-amber-100 text-amber-700",
  Evaluate: "bg-purple-100 text-purple-700",
  Create: "bg-pink-100 text-pink-700",
};

export default function SubjectSelector({
  onSelect,
  initialSelection,
}: SubjectSelectorProps) {
  const { catalog, error: catalogError } = useCurriculumCatalog();
  const [levelCode, setLevelCode] = useState(initialSelection?.levelCode ?? "JHS");
  const [subject, setSubject] = useState(
    initialSelection?.subjectSlug ?? "mathematics"
  );
  const [grade, setGrade] = useState(initialSelection?.grade ?? "B7");
  const [strands, setStrands] = useState<Strand[]>([]);
  const [selectedStrand, setSelectedStrand] = useState<string>(
    initialSelection?.strand ?? ""
  );
  const [selectedSubStrand, setSelectedSubStrand] = useState<string>(
    initialSelection?.subStrand ?? ""
  );
  const [indicatorQuery, setIndicatorQuery] = useState("");
  const [isIndicatorListOpen, setIsIndicatorListOpen] = useState(false);
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState<string>(
    initialSelection?.code ?? ""
  );
  const [loading, setLoading] = useState(true);
  const currentLevel = catalog?.levels.find((level) => level.code === levelCode);
  const currentGrade = currentLevel?.grades.find((item) => item.code === grade);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setStrands([]);
      setSelectedStrand(initialSelection?.strand ?? "");
      setSelectedIndicatorCode(initialSelection?.code ?? "");
      try {
        const res = await fetch(
          `/api/curriculum?subject=${subject}&level=${levelCode}&grade=${grade}`
        );
        const data = await res.json();
        if (!cancelled && data.success && data.data.strands) {
          setStrands(data.data.strands);
        }
      } catch (err) {
        console.error("Failed to fetch curriculum:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [subject, levelCode, grade, initialSelection]);

  const currentStrand = strands.find((s) => s.name === selectedStrand);
  // Auto-pick the only sub-strand so a strand with just one doesn't force an
  // extra click before the indicator search appears (derived, not stateful,
  // so it never fights with an explicit pill click).
  const autoSubStrandName = currentStrand?.subStrands.length === 1 ? currentStrand.subStrands[0].name : "";
  const currentSubStrand = currentStrand?.subStrands.find(
    (ss) => ss.name === (selectedSubStrand || autoSubStrandName)
  );
  const subStrandIndicators: (Indicator & { subStrand: string })[] =
    currentSubStrand?.indicators.map((ind) => ({ ...ind, subStrand: currentSubStrand.name })) ?? [];
  const selectedIndicator = subStrandIndicators.find((ind) => ind.code === selectedIndicatorCode);
  const filteredIndicators = indicatorQuery.trim()
    ? subStrandIndicators.filter((ind) => {
        const q = indicatorQuery.trim().toLowerCase();
        return ind.code.toLowerCase().includes(q) || stripInlineMarkdown(ind.text).toLowerCase().includes(q);
      })
    : subStrandIndicators;

  const handleIndicatorSelect = (ind: Indicator & { subStrand: string }) => {
    setSelectedIndicatorCode(ind.code);
    const subjectLabel =
      catalog?.subjects.find((item) => item.slug === subject)?.name || subject;
    onSelect({
      code: ind.code,
      text: ind.text,
      bloomsLevel: ind.bloomsLevel,
      grade: ind.grade,
      curriculumSlug: catalog?.curriculum.slug ?? "ghana-nacca-sbc",
      levelCode,
      levelName: currentLevel?.name ?? levelCode,
      gradeName: currentGrade?.name ?? ind.grade,
      typicalAgeMin: currentGrade?.typicalAgeMin ?? undefined,
      typicalAgeMax: currentGrade?.typicalAgeMax ?? undefined,
      exemplars: ind.exemplars,
      exemplarRevision: ind.exemplars[0]?.revision,
      contentStandardCode: ind.contentStandardCode ?? undefined,
      contentStandardText: ind.contentStandardText ?? undefined,
      subject: subjectLabel,
      subjectSlug: subject,
      strand: selectedStrand,
      subStrand: ind.subStrand,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
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
            }}
            disabled={!catalog}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-60"
          >
            {catalog?.levels.map((level) => (
              <option key={level.code} value={level.code}>
                {level.name}
              </option>
            ))}
          </select>
        </div>
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
            {catalog?.subjects.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
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
            {currentLevel?.grades.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {catalogError && (
        <p className="text-sm text-red-600">{catalogError}</p>
      )}

      {/* Strand pills */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Strand
        </label>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 size={14} className="animate-spin" />
            Loading strands...
          </div>
        ) : strands.length === 0 ? (
          <span className="text-sm text-gray-400">No strands available</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {strands.map((s) => (
              <button
                key={s.name}
                onClick={() => {
                  setSelectedStrand(s.name);
                  setSelectedSubStrand("");
                  setSelectedIndicatorCode("");
                  setIndicatorQuery("");
                  setIsIndicatorListOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  selectedStrand === s.name
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-800 hover:border-green-300"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-strand pills - only shown when a strand has more than one, since a
          single sub-strand is auto-selected above without an extra click. */}
      {!loading && currentStrand && currentStrand.subStrands.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Sub-strand
          </label>
          <div className="flex flex-wrap gap-2">
            {currentStrand.subStrands.map((ss) => (
              <button
                key={ss.name}
                onClick={() => {
                  setSelectedSubStrand(ss.name);
                  setSelectedIndicatorCode("");
                  setIndicatorQuery("");
                  setIsIndicatorListOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  selectedSubStrand === ss.name
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-800 hover:border-green-300"
                }`}
              >
                {ss.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Indicator - a compact searchable combobox instead of dozens of full
          cards, so pages with hundreds of Primary indicators stay short.
          Once one is picked, only its details show (with a Change button). */}
      {!loading && currentSubStrand && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Indicator
          </label>

          {selectedIndicator ? (
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 border-green-400">
              <span className="text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5 bg-green-700 text-white">
                {selectedIndicator.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-relaxed">{stripInlineMarkdown(selectedIndicator.text)}</p>
                {selectedIndicator.contentStandardText && (
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedIndicator.contentStandardCode && `${selectedIndicator.contentStandardCode}: `}
                    {stripInlineMarkdown(selectedIndicator.contentStandardText)}
                  </p>
                )}
                {selectedIndicator.bloomsLevel && (
                  <span
                    className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      BLOOMS_COLORS[selectedIndicator.bloomsLevel] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedIndicator.bloomsLevel}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedIndicatorCode("");
                  setIndicatorQuery("");
                  setIsIndicatorListOpen(true);
                }}
                className="flex-shrink-0 text-xs font-medium text-green-700 hover:text-green-900 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
          ) : subStrandIndicators.length === 0 ? (
            <span className="text-sm text-gray-400">No indicators available</span>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={indicatorQuery}
                onChange={(e) => setIndicatorQuery(e.target.value)}
                onFocus={() => setIsIndicatorListOpen(true)}
                onBlur={() => window.setTimeout(() => setIsIndicatorListOpen(false), 150)}
                placeholder={`Search ${subStrandIndicators.length} indicator${subStrandIndicators.length === 1 ? "" : "s"} by code or text…`}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {isIndicatorListOpen && (
                <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredIndicators.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-400">No matching indicators</li>
                  ) : (
                    filteredIndicators.map((ind) => (
                      <li key={ind.code}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleIndicatorSelect(ind);
                            setIsIndicatorListOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-green-50 cursor-pointer"
                        >
                          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                            {ind.code}
                          </span>
                          <span className="truncate text-gray-700">{stripInlineMarkdown(ind.text)}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}