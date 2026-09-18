"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, ExternalLink, MessageCircle, X } from "lucide-react";
import { BUG_REPORT_FORM_URL, FEEDBACK_FORM_URL, SHOW_BETA_FEEDBACK_WIDGET } from "@/lib/featureFlags";

/**
 * The floating "Help Improve CurriculumCraft" button, present on every page
 * of the beta.
 *
 * It only ever opens when a teacher clicks it - never on a timer, never on
 * scroll, never on exit - because a teacher mid-way through a lesson plan
 * does not want to be interrupted, and feedback offered from goodwill is
 * worth more than feedback prompted by a pop-up. The forms themselves live in
 * Google Forms and open in a new tab, so nothing typed here can be lost to a
 * navigation.
 *
 * Layering: the navbar is a sticky z-50, so the dialog's backdrop must also be
 * z-50 or the navbar stays clickable above it. At equal z-index DOM order
 * decides, and app/layout.tsx mounts this after the navbar and before the
 * focus notice - so the backdrop covers the navbar, and the notice still
 * covers this. Not rendered on the access page at all: there is nothing to
 * give feedback on until the code has been entered.
 */

const FEEDBACK_LABEL = "💬 Help Improve CurriculumCraft";

export default function BetaFeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => {
    setOpen(false);
    // Hand focus back to the button that opened the dialog, as a dialog should.
    triggerRef.current?.focus();
  }, []);

  // Escape closes; Tab stays inside the dialog while it is open.
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    // Move focus into the dialog once it is on screen.
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    });
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.cancelAnimationFrame(frame);
    };
  }, [open, close]);

  if (!SHOW_BETA_FEEDBACK_WIDGET || !FEEDBACK_FORM_URL) return null;
  if (pathname?.startsWith("/access")) return null;

  return (
    <>
      {/* The floating trigger. Bottom-right, clear of the phone's home
          indicator, and kept small enough not to cover page content. It
          slides into place, then keeps a slow ring-and-breathe rhythm for as
          long as it is on screen - see the keyframes in app/globals.css. */}
      <div className="no-print animate-feedback-arrive fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50">
        <span
          aria-hidden="true"
          className="animate-feedback-pulse pointer-events-none absolute inset-0 rounded-full bg-green-500/60"
        />
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="animate-feedback-breathe relative inline-flex items-center gap-2 rounded-full border border-green-800/20 bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-900/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-800 hover:shadow-xl hover:shadow-green-900/30 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 sm:px-5 sm:py-3"
        >
          {FEEDBACK_LABEL}
        </button>
      </div>

      {open && (
        <div
          className="no-print animate-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            // A click on the backdrop closes; a click inside the panel does not.
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="animate-modal-card w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
                <MessageCircle size={22} className="text-green-700 dark:text-green-300" />
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-2 -mt-2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <h2 id={titleId} className="mt-5 text-xl font-bold text-gray-900 dark:text-gray-100">
              Your Feedback Matters
            </h2>
            <p id={descriptionId} className="mt-2.5 text-base leading-relaxed text-gray-600 dark:text-gray-300">
              CurriculumCraft AI is currently in beta. Your suggestions, bug reports, and teaching insights
              help us build better tools for teachers. We appreciate every piece of feedback.
            </p>

            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              Send Feedback
              <ExternalLink size={16} />
            </a>

            <a
              href={BUG_REPORT_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Bug size={16} />
              Report a Bug
            </a>

            <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
              Opens in a new tab. Takes about two minutes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
