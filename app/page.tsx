import Link from "next/link";
import { BookOpen, LayoutDashboard, Zap, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Standard Map",
    description:
      "Browse the full NaCCA curriculum tree. Explore every strand, sub-strand and indicator across B7–B9 for all subjects.",
    href: "/dashboard",
    color: "text-blue-600 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900/40",
    border: "border-blue-100 dark:border-blue-700",
  },
  {
    icon: BookOpen,
    title: "Lesson Builder",
    description:
      "Select any NaCCA indicator and instantly generate teacher notes, visual content prompts and student reading materials.",
    href: "/lesson-builder",
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-900/40",
    border: "border-green-100 dark:border-green-700",
    featured: true,
  },
  {
    icon: Zap,
    title: "Activity Suite",
    description:
      "Generate interactive MCQs, writing prompts and assessment rubrics aligned to any NaCCA indicator.",
    href: "/activity-suite",
    color: "text-amber-600 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/40",
    border: "border-amber-100 dark:border-amber-700",
  },
];

const STATS = [
  { value: "7", label: "Subjects" },
  { value: "3", label: "Grade levels" },
  { value: "80+", label: "Indicators" },
  { value: "3", label: "AI-powered views" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-600 px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6">
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full border border-white/20 text-center">
              🇬🇭 Built for Ghana
            </span>
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full border border-white/20 text-center">
              NaCCA Standards-Based Curriculum
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Turn NaCCA Standards Into
            <br />
            <span className="text-green-300">Complete Lesson Materials</span>
          </h1>
          <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            AI-powered instructional design for Ghanaian JHS teachers. Generate
            teacher notes, visual prompts and student activities from any NaCCA
            indicator in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/lesson-builder"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-green-800 font-semibold text-sm hover:bg-green-50 transition-all shadow-lg hover:shadow-xl"
            >
              <BookOpen size={16} />
              Start Building Lessons
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-all border border-white/20"
            >
              <LayoutDashboard size={16} />
              Browse Curriculum
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="grid grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-green-800 dark:text-green-400">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Three powerful tools for teachers
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Everything you need to plan, teach and assess using the NaCCA curriculum
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className={`group rounded-xl border p-6 transition-all hover:shadow-md ${
                  feature.featured
                    ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20 hover:border-green-400"
                    : `${feature.border} bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-500`
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.bg} mb-4`}>
                  <Icon size={20} className={feature.color} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <div className={`flex items-center gap-1 text-xs font-medium ${feature.color} group-hover:gap-2 transition-all`}>
                  Get started <ArrowRight size={12} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Problem statement */}
      <div className="bg-green-900 dark:bg-green-950 px-6 py-12 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-3">
            Built for Ghana&apos;s teachers
          </h2>
          <p className="text-green-200 text-sm leading-relaxed mb-6">
            Ghanaian JHS teachers spend hours manually converting dense NaCCA
            curriculum documents into lesson plans. CurriculumCraft AI eliminates
            that burden — generating culturally relevant, standards-aligned
            materials in seconds, so teachers can focus on what matters most:
            their students.
          </p>
          <Link
            href="/lesson-builder"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-green-800 font-semibold text-sm hover:bg-green-50 transition-all"
          >
            Try it now — it&apos;s free
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
