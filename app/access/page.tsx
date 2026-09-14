"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

/**
 * The private-beta gate.
 *
 * The code is remembered in localStorage and re-submitted automatically, so a
 * teacher types it once on a device rather than every time the pass expires.
 * That is deliberate: this is one code shared by every beta tester, closer to
 * a door code than a password, and the server is what actually enforces it -
 * the browser copy only saves the retyping. A code that has since been rotated
 * simply fails on the server and is cleared here.
 *
 * Rendered as a full-screen cover so the app's navbar and footer - whose links
 * all lead back here anyway - stay out of the way.
 */

const STORAGE_KEY = "curriculumcraft.beta-access-code";

/** localStorage throws in private windows and with site data blocked, so every use is guarded. */
function readStoredCode(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCode(code: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // A browser that refuses storage just means the code is typed again next time.
  }
}

function clearStoredCode() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage was never available.
  }
}

function AccessGate() {
  const searchParams = useSearchParams();
  const destination = searchParams.get("next") || "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Held until the remembered code has had its chance, so the form doesn't
  // flash up in front of someone who already has access.
  const [restoring, setRestoring] = useState(true);
  const autoSubmitted = useRef(false);

  const submitCode = useCallback(
    async (candidate: string, { remember }: { remember: boolean }) => {
      const res = await fetch("/api/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: candidate }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        if (remember) storeCode(candidate);
        // A full navigation, so the proxy sees the newly set cookie.
        window.location.replace(destination);
        return true;
      }

      clearStoredCode();
      throw new Error(json?.error || "That access code isn't right.");
    },
    [destination]
  );

  // Try the remembered code once on mount.
  useEffect(() => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;

    const stored = readStoredCode();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time bootstrap from browser storage on mount, not a render-triggered cascade
      setRestoring(false);
      return;
    }

    submitCode(stored, { remember: false })
      .catch(() => {
        // The code was rotated or revoked - fall back to asking for it.
        setCode("");
        setError(null);
      })
      .finally(() => setRestoring(false));
  }, [submitCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await submitCode(code, { remember: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check that access code.");
      setSubmitting(false);
    }
  };

  if (restoring) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 size={26} className="animate-spin text-green-700 dark:text-green-400" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="flex min-h-full items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3.5 py-1.5 text-sm font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Private beta
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">CurriculumCraft AI</h1>
            <p className="mt-2.5 text-base leading-relaxed text-gray-500 dark:text-gray-400">
              Enter your access code to continue. You&apos;ll only need to do this once on this device.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7 dark:border-gray-700 dark:bg-gray-900"
          >
            <label htmlFor="access-code" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Access code
            </label>
            <div className="relative mt-2">
              <KeyRound
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="access-code"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                autoComplete="one-time-code"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "access-error" : undefined}
                placeholder="Enter code"
                className={`w-full rounded-xl border bg-gray-50 py-3.5 pl-11 pr-4 text-base tracking-wide text-gray-800 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-gray-100 ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-600"
                    : "border-gray-200 focus:border-green-500 focus:ring-green-500 dark:border-gray-600"
                }`}
              />
            </div>

            {error && (
              <p id="access-error" role="alert" className="mt-2.5 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Checking…
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-400 dark:text-gray-500">
            Don&apos;t have a code? Ask the CurriculumCraft team for access.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccessPage() {
  // useSearchParams needs a Suspense boundary to keep the route prerenderable.
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Loader2 size={26} className="animate-spin text-green-700 dark:text-green-400" />
        </div>
      }
    >
      <AccessGate />
    </Suspense>
  );
}
