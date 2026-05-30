"use client";

import { useState } from "react";
import { CheckCheck, Copy } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface SectionCardProps {
  icon: string;
  label: string;
  content: string;
  accentColor: "green" | "amber" | "blue";
}

const ACCENT_STYLES = {
  green: {
    header: "bg-green-50 border-green-200",
    label: "text-green-800",
    border: "border-green-200",
    copy: "border-green-300 text-green-700 hover:bg-green-100",
  },
  amber: {
    header: "bg-amber-50 border-amber-200",
    label: "text-amber-800",
    border: "border-amber-200",
    copy: "border-amber-300 text-amber-700 hover:bg-amber-100",
  },
  blue: {
    header: "bg-blue-50 border-blue-200",
    label: "text-blue-800",
    border: "border-blue-200",
    copy: "border-blue-300 text-blue-700 hover:bg-blue-100",
  },
};

export default function SectionCard({
  icon,
  label,
  content,
  accentColor,
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
      className={`rounded-xl border ${styles.border} bg-white overflow-hidden shadow-sm animate-fadeUp`}
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
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}