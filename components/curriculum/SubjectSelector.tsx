"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

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

interface SelectedIndicator {
  code: string;
  text: string;
  bloomsLevel: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
}

interface SubjectSelectorProps {
  onSelect: (indicator: SelectedIndicator) => void;
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
  Remember: "bg-gray-100 text-gray-700",
  Understand: "bg-blue-100 text-blue-700",
  Apply: "bg-green-100 text-green-700",
  Analyse: "bg-amber-100 text-amber-700",
  Evaluate: "bg-purple-100 text-purple-700",
  Create: "bg-pink-100 text-pink-700",
};

export default function SubjectSelector({ onSelect }: SubjectSelectorProps) {
  const [subject, setSubject] = useState("mathematics");
  const [grade, setGrade] = useState("B7");
  const [strands, setStrands] = useState<Strand[]>([]);
  const [selectedStrand, setSelectedStrand] = useState<string>("");
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setStrands([]);
      setSelectedStrand("");
      setSelectedIndicatorCode("");
      try {
        const res = await fetch(
          `/api/curriculum?subject=${subject}&grade=${grade}`
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
  }, [subject, grade]);

  const currentStrand = strands.find((s) => s.name === selectedStrand);
  const allIndicators = currentStrand
    ? currentStrand.subStrands.flatMap((ss) =>
        ss.indicators.map((ind) => ({ ...ind, subStrand: ss.name }))
      )
    : [];

  const handleIndicatorSelect = (ind: Indicator & { subStrand: string }) => {
    setSelectedIndicatorCode(ind.code);
    const subjectLabel =
      SUBJECTS.find((s) => s.slug === subject)?.label || subject;
    onSelect({
      code: ind.code,
      text: ind.text,
      bloomsLevel: ind.bloomsLevel,
      grade: ind.grade,
      subject: subjectLabel,
      strand: selectedStrand,
      subStrand: ind.subStrand,
    });
  };

  return (
    <div className="space-y-4">
      {/* Subject + Grade */}
      <div className="grid grid-cols-2 gap-3">
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
                  setSelectedIndicatorCode("");
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

      {/* Indicators */}
      {!loading && selectedStrand && allIndicators.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Indicator
          </label>
          <div className="space-y-2">
            {allIndicators.map((ind) => (
              <div
                key={ind.code}
                onClick={() => handleIndicatorSelect(ind)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedIndicatorCode === ind.code
                    ? "bg-green-50 border-green-400"
                    : "bg-gray-50 border-gray-200 hover:bg-green-50/50 hover:border-green-200"
                }`}
              >
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5 ${
                    selectedIndicatorCode === ind.code
                      ? "bg-green-700 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {ind.code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {ind.text}
                  </p>
                  <span
                    className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      BLOOMS_COLORS[ind.bloomsLevel] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ind.bloomsLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}