"use client";

import { useState } from "react";
import { Library, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SaveResourceButton({ title, resourceType, content }: { title: string; resourceType: string; content: string }) {
  const [saving, setSaving] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const saved = savedContent === content;
  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/resources", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, resourceType, content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save resource.");
      setSavedContent(content);
      window.dispatchEvent(new Event("lesson-saved"));
      toast.success("Resource saved to your private library.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save resource.");
    } finally { setSaving(false); }
  }
  return <button onClick={save} disabled={saving || saved} className="inline-flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100 disabled:opacity-60 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200">
    {saving ? <Loader2 size={15} className="animate-spin" /> : <Library size={15} />}
    {saving ? "Saving..." : saved ? "Saved to library" : "Save to library"}
  </button>;
}
