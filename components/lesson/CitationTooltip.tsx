"use client";

import { useState } from "react";

interface CitationTooltipProps {
  text: string;
  source: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function CitationTooltip({
  text,
  source,
  children,
  onClick,
}: CitationTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block group">
      <span
        className="cursor-pointer border-b-2 border-dashed border-amber-450 bg-amber-50/40 hover:bg-amber-100/60 transition-colors px-0.5"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          if (onClick) {
            onClick();
          } else {
            setShowTooltip(!showTooltip);
          }
        }}
      >
        {children}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md shadow-lg p-2.5 w-max max-w-[240px] pointer-events-none animate-fadeIn border border-gray-700 text-left">
          <p className="font-semibold text-amber-305 leading-normal">{text}</p>
          <p className="text-gray-300 text-[10px] mt-1.5 flex items-center gap-1">📚 {source}</p>
          <p className="text-[9px] text-amber-200 mt-1.5 border-t border-gray-800 pt-1.5 font-medium">
            🔍 Click standard code to inspect
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 border-r border-b border-gray-700" />
        </div>
      )}
    </div>
  );
}
