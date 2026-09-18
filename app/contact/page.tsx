import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, Handshake, Mail, MessageCircle, MessageSquare } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact · CurriculumCraft AI",
  description: "Reach the CurriculumCraft AI team on WhatsApp or by email - teachers, schools, partnerships and feedback.",
};

const AUDIENCES = [
  { icon: GraduationCap, title: "Teachers", text: "Questions about using the app, your subjects or your school's scheme." },
  { icon: Building2, title: "Schools", text: "Bringing CurriculumCraft AI to your staff, or setting it up for a department." },
  { icon: Handshake, title: "Partnerships", text: "Working with us - education organisations, districts, training providers." },
  { icon: MessageSquare, title: "Feedback and enquiries", text: "What is working, what is not, and anything else about the product." },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">Contact</span>
          <h1 className="mt-3 text-3xl font-bold text-white">Talk to us</h1>
          <p className="mt-2 max-w-2xl text-base text-green-100">
            We are a small team building this with teachers. A message on WhatsApp or by email reaches us
            directly.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* The two direct channels first - on a phone these are what people
            are here for, and they sit above the form without scrolling. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-green-200 bg-white p-5 shadow-sm transition-colors hover:border-green-400 hover:bg-green-50 dark:border-green-800 dark:bg-gray-900 dark:hover:bg-green-900/20"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white">
              <MessageCircle size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">WhatsApp</span>
              <span className="block text-lg font-bold text-gray-900 dark:text-white">{WHATSAPP_DISPLAY}</span>
              <span className="block text-xs text-green-700 group-hover:underline dark:text-green-300">Open a chat</span>
            </span>
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-green-400 hover:bg-green-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-green-900/20"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-gray-700">
              <Mail size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</span>
              <span className="block truncate text-lg font-bold text-gray-900 dark:text-white">{CONTACT_EMAIL}</span>
              <span className="block text-xs text-green-700 group-hover:underline dark:text-green-300">Write to us</span>
            </span>
          </a>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Who this is for</h2>
            <ul className="mt-4 space-y-4">
              {AUDIENCES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    <Icon size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
                    <span className="block text-sm text-gray-600 dark:text-gray-300">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Found a bug or want to send feedback quickly? The <strong className="font-semibold">Help Improve CurriculumCraft</strong>{" "}
              button on every page takes you straight to the feedback form.
            </p>
          </div>

          <div className="lg:col-span-3">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Send a message</h2>
            <ContactForm />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Back to the app</p>
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
        </div>
      </div>
    </div>
  );
}
