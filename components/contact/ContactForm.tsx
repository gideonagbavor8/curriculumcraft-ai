"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/contact";

/**
 * The contact form. There is no mail server behind the app, so the form does
 * not pretend to have one: it composes the message and hands it to the
 * channel the sender picks - a WhatsApp chat or their own email client -
 * with the message already filled in. Nothing typed here is stored.
 */

const ENQUIRY_TYPES = [
  "I'm a teacher",
  "I'm writing for a school",
  "Partnership enquiry",
  "General product enquiry",
  "Feedback",
] as const;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [type, setType] = useState<(typeof ENQUIRY_TYPES)[number]>(ENQUIRY_TYPES[0]);
  const [message, setMessage] = useState("");

  const ready = name.trim().length > 0 && message.trim().length > 0;
  const subject = `CurriculumCraft AI - ${type}`;
  const body = [
    `Hello CurriculumCraft team,`,
    ``,
    message.trim(),
    ``,
    `- ${name.trim()}${school.trim() ? `, ${school.trim()}` : ""}`,
    `(${type})`,
  ].join("\n");

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(body)}`;
  const emailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const field =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-300">
            Your name
          </label>
          <input id="contact-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="contact-school" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-300">
            School or organisation <span className="text-gray-400">(optional)</span>
          </label>
          <input id="contact-school" type="text" value={school} onChange={(e) => setSchool(e.target.value)} className={field} autoComplete="organization" />
        </div>
      </div>

      <div>
        <label htmlFor="contact-type" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-300">
          What is this about?
        </label>
        <select id="contact-type" value={type} onChange={(e) => setType(e.target.value as (typeof ENQUIRY_TYPES)[number])} className={field}>
          {ENQUIRY_TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-300">
          Message
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Tell us what you need, or what you think."
          className={`${field} resize-y`}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={ready ? whatsappHref : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!ready}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors ${
            ready ? "bg-green-700 hover:bg-green-800" : "pointer-events-none bg-green-300 dark:bg-green-900/50"
          }`}
        >
          <MessageCircle size={16} />
          Send on WhatsApp
        </a>
        <a
          href={ready ? emailHref : undefined}
          aria-disabled={!ready}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
            ready
              ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
              : "pointer-events-none border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
          }`}
        >
          <Mail size={16} />
          Send by email
        </a>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Your message opens in WhatsApp or your email app with the text filled in - nothing is stored here.
      </p>
    </form>
  );
}
