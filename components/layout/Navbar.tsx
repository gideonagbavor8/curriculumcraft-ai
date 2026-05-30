"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, LayoutDashboard, Zap, Library } from "lucide-react";

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Standard Map",
    icon: LayoutDashboard,
  },
  {
    href: "/lesson-builder",
    label: "Lesson Builder",
    icon: BookOpen,
  },
  {
    href: "/activity-suite",
    label: "Activity Suite",
    icon: Zap,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [savedCount, setSavedCount] = useState<number>(0);

  useEffect(() => {
    async function fetchSavedCount() {
      try {
        const res = await fetch("/api/lessons");
        const data = await res.json();
        if (data.success) setSavedCount(data.count);
      } catch {
        // silently fail
      }
    }
    fetchSavedCount();
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-green-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-700 text-white text-sm font-bold group-hover:bg-green-800 transition-colors">
              CC
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-700 text-green-900 font-semibold">
                CurriculumCraft AI
              </span>
              <span className="text-[10px] text-green-600 font-medium tracking-wide">
                🇬🇭 NaCCA SBC · Ghana JHS
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-green-700 text-white shadow-sm"
                      : "text-gray-600 hover:bg-green-50 hover:text-green-800"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Saved lessons badge */}
          <div className="flex items-center gap-3">
            <Link
              href="/saved"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm font-medium hover:bg-green-100 transition-colors"
            >
              <Library size={14} />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-700 text-white text-[10px] font-bold">
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              )}
            </Link>
          </div>

        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden gap-1 pb-3 overflow-x-auto">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-green-700 text-white"
                    : "text-gray-600 bg-gray-100 hover:bg-green-50 hover:text-green-800"
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}