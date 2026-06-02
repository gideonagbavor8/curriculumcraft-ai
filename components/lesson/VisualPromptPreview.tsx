"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface VisualPromptPreviewProps {
  content: string;
}

export default function VisualPromptPreview({
  content,
}: VisualPromptPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  const parsePrompts = (text: string): string[] => {
    return text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .filter((line) => !line.match(/^#{1,3}\s/)) // filter out headers
      .slice(0, 4); // limit to 4 prompts
  };

  const prompts = parsePrompts(content);

  if (!showPreview) {
    return (
      <button
        onClick={() => setShowPreview(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-sm font-medium transition-all"
      >
        <Eye size={14} />
        Preview on Board
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowPreview(false)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition-all"
      >
        <EyeOff size={12} />
        Hide Preview
      </button>

      {/* Whiteboard */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border-4 border-amber-800 dark:border-amber-600 overflow-hidden shadow-md">
        <div className="aspect-video flex flex-col items-center justify-center p-6 space-y-4">
          {/* Chalk markings */}
          <div className="space-y-3 text-center">
            {prompts.map((prompt, idx) => {
              const colors = [
                "text-yellow-600 dark:text-yellow-400",
                "text-green-600 dark:text-green-400",
                "text-blue-600 dark:text-blue-400",
                "text-red-600 dark:text-red-400",
              ];
              return (
                <div
                  key={idx}
                  className={`text-sm font-bold ${colors[idx % 4]} leading-relaxed animate-fadeIn prompt-item-${idx % 4}`}
                >
                  • {prompt.replace(/^[-•]\s+/, "").slice(0, 50)}
                  {prompt.length > 50 ? "..." : ""}
                </div>
              );
            })}
          </div>

          {/* Decorative chalk marks */}
          <div className="text-4xl opacity-10 dark:opacity-5">✏️ 📐 📏</div>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        💡 Tip: Use these visual prompts as a guide for board sketches. Adapt based on your students&apos; needs.
      </p>
    </div>
  );
}
