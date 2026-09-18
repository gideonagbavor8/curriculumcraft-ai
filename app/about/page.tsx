import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CloudUpload, GraduationCap, MapPin, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About · CurriculumCraft AI",
  description:
    "What CurriculumCraft AI is, who it is built for, and how it helps Ghanaian teachers prepare lessons aligned to the NaCCA curriculum.",
};

/**
 * The About page: a plain account of what the product is and is not. It
 * makes no claim the app cannot back - the curriculum coverage is what the
 * imports hold, the beta is called a beta, and AI-written material is
 * described as a draft for the teacher's judgement, which is what it is.
 */

const WHAT_IT_DOES = [
  {
    icon: CloudUpload,
    title: "Scheme of Learning",
    text: "Upload your school's termly scheme once and generate GES-format lesson plans for a full week, or just the days you teach.",
  },
  {
    icon: BookOpen,
    title: "Lesson Builder",
    text: "Pick any NaCCA indicator, Basic 1 to JHS 3, and generate a lesson plan, a lesson note, and student reading material for it.",
  },
  {
    icon: MapPin,
    title: "Local examples",
    text: "Tell it your region, district and community and the examples in your lessons come from the places, markets and crops your learners know.",
  },
  {
    icon: GraduationCap,
    title: "Activities and assessment",
    text: "Exercises, writing prompts and assessment rubrics aligned to the same indicator, so practice and assessment match what was taught.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">About</span>
          <h1 className="mt-3 text-3xl font-bold text-white">CurriculumCraft AI</h1>
          <p className="mt-2 max-w-2xl text-base text-green-100">
            AI-powered teaching tools that help Ghanaian teachers prepare curriculum-aligned lessons in less
            time.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        <section className="space-y-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">The problem</h2>
          <p>
            Every week, a teacher in Ghana turns the scheme of learning into lesson plans and lesson notes: the
            right indicator, the content standard, core competencies, a starter, activities, assessment, all in
            the format the school expects. Done by hand for every subject and every day, it takes hours that
            could go into teaching, and in schools without a curriculum library it means working from memory.
          </p>
          <p>
            CurriculumCraft AI takes that preparation work and does the first draft. The teacher chooses the
            indicator or uploads the scheme; the app produces the plan, the note, the student material and the
            activities, grounded in the official curriculum, ready to review and adjust.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">What it does</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHAT_IT_DOES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Built on the curriculum, for Ghana</h2>
          <p>
            The app is built around Ghana&apos;s NaCCA Standards-Based Curriculum. Its curriculum data comes
            from the official NaCCA documents - the Primary curriculum books (Basic 1-6) and the JHS Common
            Core Programme books (Basic 7-9) - imported strand by strand, with each indicator&apos;s content
            standard, exemplars and core competencies, and a reference back to the page it came from.
          </p>
          <p>
            When the AI writes a lesson, it is given that official material for the indicator in question, so
            what it produces follows the curriculum&apos;s own wording and expectations rather than a general
            idea of the topic. Examples use Ghanaian names, places, currency and everyday life, and where a
            teacher has set their location, the examples come from their own district and community.
          </p>
          <p>
            It is built for teachers first - Primary and JHS teachers in Ghana - and for the schools and
            heads of department who support them.
          </p>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
              <p className="font-semibold">The teacher is the author</p>
              <p className="mt-1">
                Everything the app generates is a draft. AI can make mistakes, and a lesson has to fit a
                particular class on a particular day. Read what it produces, change what does not fit, and
                treat it as a starting point that saves time - not as a finished lesson.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Where we are</h2>
          <p>
            CurriculumCraft AI is in a private beta. A small group of teachers is using the Scheme of Learning
            and the Lesson Builder and telling us what works and what does not; the other tools are being
            finished with that feedback. Things will change, and some rough edges are expected - the feedback
            button on every page goes straight to us.
          </p>
          <p>
            The goal is simple: make lesson preparation easier and faster, so that the hours a teacher has go
            into teaching.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Sparkles size={16} className="text-green-700 dark:text-green-300" />
              Try it with your own scheme
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Or ask us anything on the <Link href="/contact" className="font-medium text-green-700 hover:underline dark:text-green-300">contact page</Link>.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/scheme-of-learning"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
            >
              Scheme of Learning <ArrowRight size={15} />
            </Link>
            <Link
              href="/lesson-builder"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
            >
              Lesson Builder <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
