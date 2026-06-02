"use client";

import { useState } from "react";

interface CitationTooltipProps {
  text: string;
  source: string;
  children: React.ReactNode;
}

export default function CitationTooltip({
  text,
  source,
  children,
}: CitationTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block group">
      <span
        className="cursor-help border-b-2 border-dashed border-amber-400 bg-amber-50/40 hover:bg-amber-100/60 transition-colors px-0.5"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {children}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md shadow-lg p-2 w-max max-w-xs pointer-events-none animate-fadeIn border border-gray-700">
          <p className="font-semibold text-amber-300">{text}</p>
          <p className="text-gray-300 text-[10px] mt-1">📚 {source}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 border-r border-b border-gray-700" />
        </div>
      )}
    </div>
  );
}
