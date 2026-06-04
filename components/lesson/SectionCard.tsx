"use client";

import { useState } from "react";
import { CheckCheck, Copy } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Citation } from "@/types/curriculum";

interface SectionCardProps {
  icon: string;
  label: string;
  content: string;
  accentColor: "green" | "amber" | "blue";
  citations?: Citation[];
  onInspect?: () => void;
}

const ACCENT_STYLES = {
  green: {
    header: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50",
    label: "text-green-800 dark:text-green-300",
    border: "border-green-200 dark:border-green-800/50",
    copy: "border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40",
  },
  amber: {
    header: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
    label: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/50",
    copy: "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40",
  },
  blue: {
    header: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
    label: "text-blue-800 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/50",
    copy: "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40",
  },
};

export default function SectionCard({
  icon,
  label,
  content,
  accentColor,
  citations,
  onInspect,
}: SectionCardProps) {
  const [copied, setCopied] = useState(false);
  const styles = ACCENT_STYLES[accentColor];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-xl border ${styles.border} bg-white dark:bg-gray-900 overflow-hidden shadow-sm animate-fadeUp`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${styles.header} border-b ${styles.border}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${styles.label}`}
          >
            {label}
          </span>
          {citations && citations.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 ml-1">
              📚 Grounded
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-medium transition-all ${styles.copy}`}
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
      <div className="px-5 py-4">
        <MarkdownRenderer content={content} citations={citations} onInspect={onInspect} />
      </div>
    </div>
  );
}