import Link from "next/link";
import { BookOpen, LayoutDashboard, Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-700 text-white text-sm font-bold">
                CC
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                CurriculumCraft AI
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
              AI-powered instructional design for Ghanaian JHS teachers. Built on the NaCCA Standards-Based Curriculum.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                🇬🇭 Ghana JHS
              </span>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                NaCCA SBC
              </span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Tools
            </h3>
            <div className="space-y-2">
              <Link href="/dashboard" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                <LayoutDashboard size={13} />
                Standard Map
              </Link>
              <Link href="/lesson-builder" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                <BookOpen size={13} />
                Lesson Builder
              </Link>
              <Link href="/activity-suite" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                <Zap size={13} />
                Activity Suite
              </Link>
              <Link href="/saved" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                📚 Saved Lessons
              </Link>
            </div>
          </div>

          {/* Built with */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Built with
            </h3>
            <div className="space-y-2">
              {[
                { label: "GitHub Copilot", icon: "🤖" },
                { label: "Microsoft Foundry IQ", icon: "⚡" },
                { label: "GitHub Models", icon: "🧠" },
                { label: "Next.js 15", icon: "▲" },
                { label: "Neon PostgreSQL", icon: "🗄️" },
                { label: "Vercel", icon: "🚀" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-left">
            © 2026 CurriculumCraft AI · Built for the{" "}
            <span className="text-green-600 dark:text-green-400 font-medium">
              Microsoft Agents League Hackathon
            </span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-right">
            Made with ❤️ for Ghana&apos;s teachers by{" "}
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              Gideon Komla Agbavor
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}