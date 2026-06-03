"use client";

import type { Citation } from "@/types/curriculum";

interface CitationBannerProps {
  citations?: Citation[];
  indicatorCode: string;
  onInspect?: () => void;
}

export default function CitationBanner({
  citations,
  indicatorCode,
  onInspect,
}: CitationBannerProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg px-4 py-3 no-print flex items-start gap-3">
      <div className="text-2xl flex-shrink-0">📚</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
          Grounded with Microsoft Foundry IQ
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
          This lesson is grounded in the official NaCCA curriculum standard{" "}
          <span className="font-mono font-semibold">{indicatorCode}</span> via Azure Foundry IQ. Hover over highlighted NaCCA codes for context or{" "}
          <button 
            onClick={onInspect} 
            className="font-bold underline text-amber-800 dark:text-amber-200 hover:text-amber-955 dark:hover:text-amber-100 cursor-pointer focus:outline-none"
          >
            open the Reference Inspector
          </button>.
        </p>
      </div>
    </div>
  );
}
