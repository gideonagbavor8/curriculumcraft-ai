"use client";

import { useState } from "react";
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import SubjectSelector from "@/components/curriculum/SubjectSelector";
import type { ActivityResponse, MCQuestion, WritingPrompt, RubricCriterion } from "@/types/curriculum";
import MarkdownRenderer, { parseInlineContent } from "@/components/lesson/MarkdownRenderer";

interface SelectedIndicator {
  code: string;
  text: string;
  bloomsLevel: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
}

function MCQCard({ question, index }: { question: MCQuestion; index: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (label: string) => {
    if (selected) return;
    setSelected(label);
    setShowExplanation(true);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-white text-xs font-bold">{index + 1}</span>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-relaxed flex-1">
            <MarkdownRenderer content={question.question} />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {question.options.map((option) => {
          const isSelected = selected === option.label;
          const isRevealed = selected !== null;
          const isCorrect = option.isCorrect;
          let style = "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/30";
          if (isRevealed && isCorrect) style = "border-green-400 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300";
          else if (isRevealed && isSelected && !isCorrect) style = "border-red-300 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300";
          else if (isRevealed) style = "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500";
          return (
            <button key={option.label} onClick={() => handleSelect(option.label)} disabled={!!selected}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${style} ${!selected ? "cursor-pointer" : "cursor-default"}`}>
              <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">{option.label}</span>
              <span className="flex-1">{parseInlineContent(option.text)}</span>
              {isRevealed && isCorrect && <CheckCircle size={16} className="flex-shrink-0 text-green-600 dark:text-green-400" />}
              {isRevealed && isSelected && !isCorrect && <XCircle size={16} className="flex-shrink-0 text-red-500 dark:text-red-400" />}
            </button>
          );
        })}
      </div>
      {showExplanation && (
        <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          <span className="font-semibold block mb-1">Explanation:</span>
          <MarkdownRenderer content={question.explanation} className="text-blue-800 dark:text-blue-300 text-xs" />
        </div>
      )}
    </div>
  );
}

function WritingPromptCard({ prompt, index }: { prompt: WritingPrompt; index: number }) {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">{index + 1}</span>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-relaxed flex-1">
            <MarkdownRenderer content={prompt.prompt} />
          </div>
        </div>
        <button onClick={() => setShowAnswer(!showAnswer)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors">
          {showAnswer ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showAnswer ? "Hide sample answer" : "Show sample answer"}
        </button>
      </div>
      {showAnswer && (
        <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/30 border-t border-amber-100 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-semibold block mb-1">Sample Answer:</span>
          <MarkdownRenderer content={prompt.sampleAnswer} className="text-amber-900 dark:text-amber-200 text-xs" />
        </div>
      )}
    </div>
  );
}

function RubricTable({ criteria }: { criteria: RubricCriterion[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Assessment Rubric</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 w-1/4">Criterion</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-green-700 dark:text-green-400">Excellent</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-400">Satisfactory</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400">Needs Work</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/50"}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 text-xs align-top">{parseInlineContent(row.criterion)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs align-top leading-relaxed">{parseInlineContent(row.excellent)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs align-top leading-relaxed">{parseInlineContent(row.satisfactory)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs align-top leading-relaxed">{parseInlineContent(row.needsWork)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ActivitySuitePage() {
  const [selectedIndicator, setSelectedIndicator] = useState<SelectedIndicator | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedIndicator) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorCode: selectedIndicator.code,
          indicatorText: selectedIndicator.text,
          subject: selectedIndicator.subject,
          grade: selectedIndicator.grade,
          strand: selectedIndicator.strand,
          bloomsLevel: selectedIndicator.bloomsLevel,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate activities");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">NaCCA SBC</span>
            <span className="text-xs text-white/70">Ghana JHS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Interactive Activity Suite</h1>
          <p className="text-green-100 text-sm mt-1">Generate MCQs, writing prompts and assessment rubrics from any NaCCA indicator</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-4">Select Indicator</h2>
          <SubjectSelector onSelect={setSelectedIndicator} />
          {selectedIndicator && (
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleGenerate} disabled={loading}
                className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" />Generating activities...</> : "⚡ Generate Activities"}
              </button>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        {result && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3">
              <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Activities generated for {selectedIndicator?.code}</p>
                <p className="text-xs text-green-600 dark:text-green-400">{selectedIndicator?.subject} · {selectedIndicator?.grade} · {selectedIndicator?.strand}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-3">Multiple Choice Questions ({result.mcqs.length})</h2>
              <div className="space-y-3">{result.mcqs.map((mcq, i) => <MCQCard key={i} question={mcq} index={i} />)}</div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-3">Writing Prompts ({result.writingPrompts.length})</h2>
              <div className="space-y-3">{result.writingPrompts.map((wp, i) => <WritingPromptCard key={i} prompt={wp} index={i} />)}</div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-3">Assessment Rubric</h2>
              <RubricTable criteria={result.rubric} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
