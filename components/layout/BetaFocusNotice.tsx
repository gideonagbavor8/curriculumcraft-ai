"use client";

import { usePathname, useRouter } from "next/navigation";
import { CloudUpload, ArrowRight } from "lucide-react";
import {
  BETA_FOCUS_ON_SCHEME,
  BETA_FOCUS_DESTINATION,
  BETA_FOCUS_ALLOWED_PATHS,
} from "@/lib/featureFlags";

/**
 * Steers beta testers to the Scheme of Learning.
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
 */

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
  const pathname = usePathname();
  const router = useRouter();

  if (!BETA_FOCUS_ON_SCHEME || !pathname || isAllowed(pathname)) return null;

  const label = pageLabel(pathname);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-focus-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm"
    >
      <div className="flex min-h-full items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-7 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
            <CloudUpload size={22} className="text-green-700 dark:text-green-300" />
          </div>

          <h2 id="beta-focus-title" className="mt-5 text-xl font-bold text-gray-900 dark:text-gray-100">
            {label} is still being finished
          </h2>
          <p className="mt-2.5 text-base leading-relaxed text-gray-600 dark:text-gray-300">
            Thanks for exploring — you found a part of CurriculumCraft we haven&apos;t opened up yet.
            While the beta runs, everything is going into the <strong className="font-semibold">Scheme
            of Learning</strong>: upload your school&apos;s scheme once and generate GES-format
            lesson plans for a full week, or just the days you teach.
          </p>
          <p className="mt-2.5 text-base leading-relaxed text-gray-600 dark:text-gray-300">
            {label} will open up soon, and what you build now will still be here when it does.
          </p>

          <button
            onClick={() => router.replace(BETA_FOCUS_DESTINATION)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-800"
          >
            Go to Scheme of Learning
            <ArrowRight size={17} />
          </button>

          <p className="mt-4 text-center text-sm text-gray-400 dark:text-gray-500">
            Got feedback on what you&apos;d like next? We&apos;d love to hear it.
          </p>
        </div>
      </div>
    </div>
  );
}
