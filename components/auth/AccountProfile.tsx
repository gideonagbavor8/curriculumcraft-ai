"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AccountProfile() {
  const user = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!user) return null;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your profile.");
      toast.success("Profile updated.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your profile.");
    } finally { setSaving(false); }
  }
  return (
    <div className="min-h-[75vh] bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-green-900 dark:text-green-100">Your teaching account</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">One private home for your classroom resources.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[["/saved", "Saved resources"], ["/dashboard", "Standard Map"], ["/scheme-of-learning", "Scheme of Learning"]].map(([href, label]) =>
            <Link key={href} href={href} className="rounded-xl border border-green-200 bg-green-50 p-5 font-semibold text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-200">{label}</Link>)}
        </div>
        <form onSubmit={save} className="mt-8 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold">Profile details</h2>
          <label className="block text-sm font-medium">Name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} autoComplete="name" className="mt-2 block w-full rounded-lg border border-gray-300 bg-transparent p-3 dark:border-gray-600" /></label>
          <p className="text-sm"><span className="font-medium">Email: </span>{user.email}</p>
          <p className="text-sm"><span className="font-medium">Member since: </span>{new Date(user.createdAt).toLocaleDateString("en-GB")}</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">{saving ? "Saving..." : "Save profile"}</button>
          <p className="text-sm text-gray-500">Manage your classroom location in <Link href="/settings" className="text-green-700 underline">Settings</Link>.</p>
        </form>
      </div>
    </div>
  );
}
