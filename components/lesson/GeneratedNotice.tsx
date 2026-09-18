"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * The card that announces a finished generation. Generation takes long
 * enough that a teacher has often looked away, so the news arrives where the
 * eye lands - top centre, just under the navbar - as a card that drops in,
 * holds for a few seconds and lifts away. It is only ever a notice: nothing
 * to confirm, nothing it blocks, and a click on it dismisses it early.
 *
 * Mount it with a `key` that changes per generation so a second lesson gets
 * a fresh card. Keyframes live in app/globals.css (generated-notice-*).
 */
export default function GeneratedNotice({
  title,
  detail,
  duration = 4200,
  onDone,
}: {
  title: string;
  /** One line under the title - the indicator code, subject and class. */
  detail?: string;
  /** How long the card stays, in milliseconds. */
  duration?: number;
  onDone?: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const hold = window.setTimeout(() => setLeaving(true), duration);
    return () => window.clearTimeout(hold);
  }, [duration]);

  useEffect(() => {
    if (!leaving) return;
    const exit = window.setTimeout(() => {
      setGone(true);
      onDone?.();
    }, 320);
    return () => window.clearTimeout(exit);
  }, [leaving, onDone]);

  if (gone) return null;

  return (
    <div
      className="no-print pointer-events-none fixed inset-x-0 top-[4.5rem] z-[60] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setLeaving(true)}
        className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-green-200 bg-white px-4 py-3.5 text-left shadow-2xl shadow-green-900/20 dark:border-green-800 dark:bg-gray-900 ${
          leaving ? "animate-generated-notice-out" : "animate-generated-notice-in"
        }`}
      >
        <span className="animate-generated-notice-check flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
          <CheckCircle2 size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
          {detail && (
            <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{detail}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <X size={16} />
        </span>
      </button>
    </div>
  );
}
