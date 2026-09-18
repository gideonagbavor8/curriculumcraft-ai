import Link from "next/link";
import { BUG_REPORT_FORM_URL, FEEDBACK_FORM_URL } from "@/lib/featureFlags";

/**
 * The site footer: the product's own map of itself, in three short columns.
 *
 * Every entry is a real destination. Feedback and bug reports go to the same
 * forms the floating feedback widget uses, and open in a new tab so a
 * half-built lesson is never lost to the click.
 */

interface FooterItem {
  label: string;
  href: string;
  external?: boolean;
}

const PRODUCT: FooterItem[] = [
  { label: "Lesson Builder", href: "/lesson-builder" },
  { label: "Scheme of Learning", href: "/scheme-of-learning" },
  { label: "Activities & Exercises", href: "/activity-suite" },
  // Student reading passages and worksheets are produced by the Lesson
  // Builder; assessment tasks and rubrics by the Activity Suite.
  { label: "Student Materials", href: "/lesson-builder" },
  { label: "Assessments", href: "/activity-suite" },
];

const RESOURCES: FooterItem[] = [
  { label: "Curriculum", href: "/dashboard" },
  ...(FEEDBACK_FORM_URL ? [{ label: "Feedback", href: FEEDBACK_FORM_URL, external: true }] : []),
  ...(BUG_REPORT_FORM_URL ? [{ label: "Report a Bug", href: BUG_REPORT_FORM_URL, external: true }] : []),
];

const COMPANY: FooterItem[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function FooterColumn({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 transition-colors hover:text-green-700 dark:text-gray-300 dark:hover:text-green-400"
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className="text-xs text-gray-500 transition-colors hover:text-green-700 dark:text-gray-300 dark:hover:text-green-400"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          {/* Brand - full width on phones, two columns on wide screens */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-700 text-sm font-bold text-white">
                CC
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">CurriculumCraft AI</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-gray-500 dark:text-gray-300">
              AI-powered teaching tools built for educators.
            </p>
          </div>

          <FooterColumn title="Product" items={PRODUCT} />
          <FooterColumn title="Resources" items={RESOURCES} />
          <FooterColumn title="Company" items={COMPANY} />
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 sm:text-left">
            © 2026 CurriculumCraft AI. Built for teachers. 🇬🇭
          </p>
        </div>
      </div>
    </footer>
  );
}
