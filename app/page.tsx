import Link from "next/link";
import { BookOpen, LayoutDashboard, Zap, ArrowRight, CloudUpload } from "lucide-react";
import { getCurriculumStats, formatStat } from "@/lib/curriculum/stats";

// The counts come from the database, so they stay true as the import grows.
// Re-read hourly rather than per request: the curriculum changes on the scale
// of school terms, not page views.
export const revalidate = 3600;

const FEATURES = [
  {
    icon: CloudUpload,
    title: "Scheme of Learning",
    description:
      "Upload your school's termly scheme once, then generate lesson plans for a full week or just the days you teach - in the GES table format, ready to submit.",
    href: "/scheme-of-learning",
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-900/40",
    border: "border-green-100 dark:border-green-700",
    featured: true,
  },
  {
    icon: BookOpen,
    title: "Lesson Builder",
    description:
      "Pick any single NaCCA indicator, Basic 1 to JHS 3, and generate one lesson from it, with teacher notes and student reading material.",
    href: "/lesson-builder",
    color: "text-blue-600 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900/40",
    border: "border-blue-100 dark:border-blue-700",
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
    comingSoon: true,
  },
  {
    icon: LayoutDashboard,
    title: "Standard Map",
    description:
      "Browse the whole curriculum tree - every strand, sub-strand, content standard and indicator, Basic 1 to JHS 3.",
    href: "/dashboard",
    color: "text-violet-600 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-900/40",
    border: "border-violet-100 dark:border-violet-700",
    comingSoon: true,
  },
];

export default async function HomePage() {
  const stats = await getCurriculumStats();
  const statCards = [
    { value: formatStat(stats.subjects), label: "Subjects" },
    { value: formatStat(stats.gradeLevels), label: "Class levels" },
    { value: formatStat(stats.contentStandards), label: "Content standards" },
    { value: formatStat(stats.indicators), label: "Indicators" },
  ];

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
            Upload your school&apos;s Scheme of Learning and get GES-format lesson plans back
            for a full week, or for whichever days you teach - each one grounded in the NaCCA
            curriculum, written around your own community, and ready to print or submit.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/scheme-of-learning"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-green-800 font-semibold text-sm hover:bg-green-50 transition-all shadow-lg hover:shadow-xl"
            >
              <CloudUpload size={16} />
              Start With Your Scheme
              <ArrowRight size={14} />
            </Link>
          </div>
          <p className="mt-4 text-sm text-green-200/90">
            Upload once, then generate a full week &mdash; or just the days you teach &mdash; from it.
          </p>
        </div>
      </div>

      {/* What's actually loaded - counted from the database, not claimed */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            The full NaCCA curriculum, already imported
          </p>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight text-green-800 dark:text-green-400 sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
            Basic 1 to JHS 3, with {formatStat(stats.strands)} strands and {formatStat(stats.subStrands)} sub-strands -
            searchable, and already linked to the indicators your scheme names.
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Everything you need to plan a term
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Start with the Scheme of Learning or the Lesson Builder - the rest is being finished during the beta.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                  {feature.comingSoon && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Later in beta
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <div className={`flex items-center gap-1 text-sm font-medium ${feature.color} group-hover:gap-2 transition-all`}>
                  {feature.comingSoon ? "Preview" : "Get started"} <ArrowRight size={13} />
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
            href="/scheme-of-learning"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-green-800 font-semibold text-sm hover:bg-green-50 transition-all"
          >
            Upload your scheme
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
