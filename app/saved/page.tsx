"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Trash2, Loader2, Library, ArrowRight } from "lucide-react";

interface SavedLesson {
  id: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand: string;
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
  createdAt: string;
}

export default function SavedPage() {
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/lessons");
        const data = await res.json();
        if (!cancelled && data.success) setLessons(data.data);
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/lessons?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLessons((prev) => prev.filter((l) => l.id !== id));
        window.dispatchEvent(new Event("lesson-saved"));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
              NaCCA SBC
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Saved Lessons</h1>
          <p className="text-green-100 text-sm mt-1">
            Your library of generated lesson materials
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading saved lessons...</span>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40 mx-auto mb-4">
              <Library size={28} className="text-green-700 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              No saved lessons yet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">
              Generate a lesson and click &quot;Save to library&quot; to see it here.
            </p>
            <Link
              href="/lesson-builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-all"
            >
              <BookOpen size={15} />
              Build a lesson
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 dark:text-gray-300 mb-4">
              {lessons.length} saved lesson{lessons.length !== 1 ? "s" : ""}
            </p>
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:border-green-200 dark:hover:border-green-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-700 text-white">
                        {lesson.indicatorCode}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-300">
                        {lesson.subject} · {lesson.grade} · {lesson.strand}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-2">
                      {lesson.teacherNotes
                        .replace(/\*\*/g, "")
                        .replace(/\*/g, "")
                        .replace(/#{1,3}\s/g, "")
                        .replace(/^-\s/gm, "")
                        .slice(0, 120)}...
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-2">
                      Saved{" "}
                      {new Date(lesson.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/lesson-builder?code=${lesson.indicatorCode}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/60 transition-all"
                    >
                      <BookOpen size={12} />
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      disabled={deleting === lesson.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-all disabled:opacity-50"
                    >
                      {deleting === lesson.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
