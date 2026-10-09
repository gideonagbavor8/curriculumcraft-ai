"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, ShieldCheck } from "lucide-react";

export default function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const signup = mode === "sign-up";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fields.get("name"), email: fields.get("email"), password: fields.get("password") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect. Please try again.");
      setBusy(false);
    }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white";
  return (
    <div className="min-h-[75vh] bg-gradient-to-br from-green-50 via-white to-gray-50 px-4 py-12 dark:from-gray-950 dark:via-gray-900 dark:to-green-950">
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
        <section>
          <BookOpen className="mb-5 text-green-700 dark:text-green-400" size={36} />
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">YOUR TEACHING, BEAUTIFULLY PREPARED</p>
          <h1 className="mt-3 text-3xl font-bold text-green-950 dark:text-green-100">{signup ? "More time to teach. A place for every lesson." : "Welcome back to your teaching workspace."}</h1>
          <p className="mt-4 leading-relaxed text-gray-600 dark:text-gray-300">Create NaCCA-aligned lessons, turn your Scheme of Learning into classroom-ready plans, and keep your favourite resources together.</p>
          <p className="mt-6 flex items-center gap-2 text-sm text-green-800 dark:text-green-300"><ShieldCheck size={18} /> Your saved resources are private to your account.</p>
        </section>
        <form onSubmit={submit} className="rounded-2xl border border-green-100 bg-white p-7 shadow-lg dark:border-green-900 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{signup ? "Create your teacher account" : "Sign in"}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{signup ? "Start preparing lessons with confidence." : "Pick up where your last lesson left off."}</p>
          {signup && <label className="mt-5 block text-sm font-medium">Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} className={inputClass} /></label>}
          <label className="mt-5 block text-sm font-medium">Email address<input name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} /></label>
          <label className="mt-5 block text-sm font-medium">Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={12} maxLength={128} className={inputClass} /></label>
          {signup && <p className="mt-2 text-xs text-gray-500">Use at least 12 characters. A memorable passphrase works well.</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
          <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-60">
            {busy && <Loader2 size={18} className="animate-spin" />}{busy ? "Please wait..." : signup ? "Create account" : "Sign in to your workspace"}
          </button>
          <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-300">{signup ? "Already have an account? " : "New to CurriculumCraft? "}
            <Link className="font-semibold text-green-700 dark:text-green-400 hover:underline" href={`/${signup ? "sign-in" : "sign-up"}?next=${encodeURIComponent(next)}`}>{signup ? "Sign in" : "Create an account"}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
