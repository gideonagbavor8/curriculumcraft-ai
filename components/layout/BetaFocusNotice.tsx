"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CloudUpload, ArrowRight, BookOpen } from "lucide-react";
import {
  BETA_FOCUS_ON_SCHEME,
  BETA_FOCUS_DESTINATION,
  BETA_FOCUS_ALLOWED_PATHS,
} from "@/lib/featureFlags";

/**
 * Steers beta testers to the pages the beta has opened - the Scheme of
 * Learning and the Lesson Builder.
 *
 * The other pages stay in the navigation and stay reachable on purpose - a
 * teacher can see what is coming and is trusted to look. What they get instead
 * of the page is a short note saying which part is finished and offering to
 * take them there. The tone matters: nobody is being locked out or told off,
 * they have simply arrived somewhere that isn't ready for them yet, and the
 * note says so in those terms.
 *
 * Derived from the pathname rather than hooked into every link, so typing a
 * URL is handled the same way as clicking one.
 *
 * Decided in the browser only, never during server rendering. The home page
 * is statically prerendered and cached, and on Vercel a regeneration of the
 * root route reports its pathname as "/index" rather than "/" - so the notice
 * was being baked into the cached HTML for every visitor, covering the home
 * page with a modal that swallowed every click. A decision that depends on
 * the visitor's URL has no business in a cached page.
 */

/** "/index" is how Next names the root route internally; a visitor only ever sees "/". */
function normalisePathname(pathname: string): string {
  if (pathname === "/index" || pathname === "/index/") return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

const subscribeToNothing = () => () => {};

/** The page named in the notice, by the route it lives at. */
const PAGE_LABELS: Record<string, string> = {
  "/lesson-builder": "Lesson Builder",
  "/activity-suite": "Activity Suite",
  "/dashboard": "Standard Map",
  "/saved": "Saved Lessons",
  "/settings": "Settings",
};

function pageLabel(pathname: string): string {
  const match = Object.keys(PAGE_LABELS).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  return match ? PAGE_LABELS[match] : "This page";
}

function isAllowed(pathname: string): boolean {
  return BETA_FOCUS_ALLOWED_PATHS.some(
    (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`))
  );
}

export default function BetaFocusNotice() {
  const rawPathname = usePathname();
  const router = useRouter();
  // false during server rendering and hydration, true once running in the
  // browser - the one place the visitor's URL can be trusted.
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );

  if (!BETA_FOCUS_ON_SCHEME || !isClient || !rawPathname) return null;

  const pathname = normalisePathname(rawPathname);
  if (isAllowed(pathname)) return null;

  // A click anywhere outside the card is a "no thanks" - the card goes, and
  // so does the visitor, back to the Scheme of Learning. Simply hiding the
  // card would open the page behind it, which is the one thing the beta
  // does not do.
  const leave = () => router.replace(BETA_FOCUS_DESTINATION);

  const label = pageLabel(pathname);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-focus-title"
      className="animate-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) leave();
      }}
    >
      <div
        className="flex min-h-full items-center justify-center px-5 py-12"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) leave();
        }}
      >
        <div className="animate-modal-card w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-7 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
            <CloudUpload size={22} className="text-green-700 dark:text-green-300" />
          </div>

          <h2 id="beta-focus-title" className="mt-5 text-xl font-bold text-gray-900 dark:text-gray-100">
            {label} is coming soon
          </h2>
          <p className="mt-2.5 text-base leading-relaxed text-gray-600 dark:text-gray-300">
            Two tools are open during the beta: the{" "}
            <strong className="font-semibold">Scheme of Learning</strong> — upload your scheme and
            generate a week of GES lesson plans — and the{" "}
            <strong className="font-semibold">Lesson Builder</strong> — build a lesson from any NaCCA
            indicator, Basic 1 to JHS 3.
          </p>

          <button
            onClick={() => router.replace(BETA_FOCUS_DESTINATION)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-800"
          >
            <CloudUpload size={17} />
            Go to Scheme of Learning
            <ArrowRight size={17} />
          </button>
          <button
            onClick={() => router.replace("/lesson-builder")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-50 py-3 text-base font-semibold text-green-800 transition-colors hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
          >
            <BookOpen size={17} />
            Go to Lesson Builder
            <ArrowRight size={17} />
          </button>

          <p className="mt-4 text-center text-sm text-gray-400 dark:text-gray-500">
            Tap anywhere outside to go back to the Scheme of Learning.
          </p>
        </div>
      </div>
    </div>
  );
}
