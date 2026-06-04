"use client";

import { X, ShieldCheck, Database, Cpu, Sparkles, Copy, Check } from "lucide-react";
import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface ReferenceInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorCode: string;
  indicatorText: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand?: string;
  bloomsLevel?: string;
  foundryContext?: string;
}

export default function ReferenceInspector({
  isOpen,
  onClose,
  indicatorCode,
  indicatorText,
  subject,
  grade,
  strand,
  subStrand,
  bloomsLevel = "Understand",
  foundryContext,
}: ReferenceInspectorProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!foundryContext) return;
    await navigator.clipboard.writeText(foundryContext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBloomsExpectation = (level: string) => {
    switch (level.toLowerCase()) {
      case "remember":
        return "Recall, list, define, or identify terms, facts, and basic concepts.";
      case "understand":
        return "Explain ideas or concepts, interpret details, and summarise reading passages.";
      case "apply":
        return "Use information or concepts in new situations, solve problems, and apply worked examples.";
      case "analyse":
        return "Draw connections among ideas, examine mathematical structures, and break down components.";
      case "evaluate":
        return "Justify a stand or decision, critique methods, and check solutions.";
      case "create":
        return "Produce new or original work, design posters, construct diagrams, and assemble materials.";
      default:
        return "Instructional standard expectation aligned with Bloom's taxonomy.";
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm no-print cursor-pointer animate-fadeIn"
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700 animate-fadeUp no-print h-full">

        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 dark:bg-amber-900/40 p-1.5 rounded-lg text-amber-700 dark:text-amber-400 animate-pulse">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Grounded Reference Inspector
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Verify curriculum standards via Azure Foundry IQ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50 dark:bg-gray-950">

          {/* Grounding pipeline diagram */}
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-xl p-4 space-y-3">
            <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider block">
              🛡️ Grounding Pipeline
            </span>

            <div className="flex items-center justify-between gap-1 py-1.5 text-center text-[10px] font-medium">
              <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex-1">
                <Database size={15} className="text-blue-500 mb-1" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">Foundry IQ</span>
                <span className="text-[8px] text-gray-500 dark:text-gray-400">Curriculum DB</span>
              </div>
              <span className="text-gray-400 dark:text-gray-500 animate-pulse">➔</span>
              <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex-1">
                <Cpu size={15} className="text-green-600 dark:text-green-400 mb-1" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">Claude 3.5</span>
                <span className="text-[8px] text-gray-500 dark:text-gray-400">Context Anchor</span>
              </div>
              <span className="text-gray-400 dark:text-gray-500">➔</span>
              <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex-1">
                <Sparkles size={15} className="text-amber-500 mb-1" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">Lesson Plan</span>
                <span className="text-[8px] text-gray-500 dark:text-gray-400">100% Grounded</span>
              </div>
            </div>

            <p className="text-[10px] text-green-700 dark:text-green-400 leading-relaxed">
              This lesson was anchored by querying the official NaCCA document set index prior to generation, removing hallucinations.
            </p>
          </div>

          {/* Curriculum standard metadata */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Standard Details
            </h4>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3.5 text-xs text-gray-700 dark:text-gray-300">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-0.5">INDICATOR CODE</span>
                <span className="font-mono font-bold text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded border border-green-200 dark:border-green-800/60">
                  {indicatorCode}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-0.5">INDICATOR DESCRIPTION</span>
                <p className="font-medium text-gray-900 dark:text-gray-100 leading-relaxed">{indicatorText}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-0.5">SUBJECT</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{subject}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-0.5">GRADE</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Junior High ({grade})</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-0.5">STRAND</span>
                <span className="font-semibold text-gray-900 dark:text-white">{strand}</span>
              </div>
              {subStrand && (
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-0.5">SUB-STRAND</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{subStrand}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bloom's taxonomy */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Cognitive Level Expectation
            </h4>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900 dark:text-white">Bloom&apos;s Level:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {bloomsLevel}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {getBloomsExpectation(bloomsLevel)}
              </p>
            </div>
          </div>

          {/* Raw Foundry Context */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Azure Foundry IQ Retrieval Snippet
              </h4>
              {foundryContext && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy Context</>}
                </button>
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-xs text-gray-700 dark:text-gray-300 leading-relaxed shadow-inner max-h-60 overflow-y-auto">
              {foundryContext ? (
                <MarkdownRenderer content={foundryContext} className="space-y-2 text-xs" />
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic text-center py-4">
                  No custom grounding snippet retrieved for this cached standard. The generated lesson remains grounded in the standard code.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
