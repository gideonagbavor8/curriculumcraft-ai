"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, WifiOff, Clock, KeyRound, ServerCrash } from "lucide-react";

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

function mapError(raw: string): {
  icon: React.ReactNode;
  title: string;
  detail: string;
} {
  const lower = raw.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("quota")) {
    return {
      icon: <Clock size={20} className="text-amber-500" />,
      title: "API quota reached",
      detail: "The AI service is busy. Wait a moment and retry — it usually resolves quickly.",
    };
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
    return {
      icon: <WifiOff size={20} className="text-blue-500" />,
      title: "Network issue",
      detail: "Check your internet connection and retry.",
    };
  }
  if (lower.includes("timeout") || lower.includes("504") || lower.includes("timed out")) {
    return {
      icon: <Clock size={20} className="text-orange-500" />,
      title: "Generation timed out",
      detail: "The AI took too long to respond. Retrying almost always fixes this.",
    };
  }
  if (
    lower.includes("invalid") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("api key") ||
    lower.includes("unauthorized")
  ) {
    return {
      icon: <KeyRound size={20} className="text-red-500" />,
      title: "API key issue",
      detail: "There's a problem with the API credentials. Please contact support.",
    };
  }

  return {
    icon: <ServerCrash size={20} className="text-red-500" />,
    title: "Generation failed",
    detail: "Something went wrong on our end. Please try again.",
  };
}

export default function ErrorCard({ message, onRetry }: ErrorCardProps) {
  const [showRaw, setShowRaw] = useState(false);
  const { icon, title, detail } = mapError(message);

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 overflow-hidden shadow-sm animate-fadeUp">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                <AlertTriangle size={13} className="flex-shrink-0" />
                {title}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">
                {detail}
              </p>
            </div>
            <button
              id="error-retry-btn"
              onClick={onRetry}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold transition-all shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 duration-150"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>

          {/* Collapsible raw error */}
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[10px] text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            {showRaw ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {showRaw ? "Hide" : "Show"} technical details
          </button>
          {showRaw && (
            <pre className="mt-1.5 text-[10px] text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/40 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all border border-red-200 dark:border-red-800/40">
              {message}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
