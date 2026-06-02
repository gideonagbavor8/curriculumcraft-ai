"use client";

import { useState } from "react";
import { CheckCheck, Copy } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import VisualPromptPreview from "./VisualPromptPreview";
import type { Citation } from "@/types/curriculum";

interface VisualPromptCardProps {
  content: string;
  citations?: Citation[];
}

export default function VisualPromptCard({
  content,
  citations,
}: VisualPromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-white dark:bg-gray-900 overflow-hidden shadow-sm animate-fadeUp">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/50">
        <div className="flex items-center gap-2">
          <span className="text-base">🎨</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            Visual Content Prompts
          </span>
          {citations && citations.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-600 ml-1">
              📚 Grounded
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-medium transition-all"
        >
          {copied ? (
            <>
              <CheckCheck size={12} />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        <VisualPromptPreview content={content} />

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Full Text
          </h3>
          <MarkdownRenderer content={content} citations={citations} />
        </div>
      </div>
    </div>
  );
}
