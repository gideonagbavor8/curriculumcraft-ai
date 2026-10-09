"use client";

import { useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { ExternalLink, MessageCircle, X } from "lucide-react";
import { FEEDBACK_FORM_URL, SHOW_BETA_FEEDBACK_WIDGET } from "@/lib/featureFlags";
import { FEEDBACK_TYPES, getFeedbackFields, type FeedbackType } from "@/lib/feedback";

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function BetaFeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [continued, setContinued] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeId = useId();
  const messageId = useId();
  const privacyId = useId();
  const category = FEEDBACK_TYPES.find((item) => item.id === type);
  if (!category) throw new Error("Unknown feedback type");

  if (!SHOW_BETA_FEEDBACK_WIDGET || !FEEDBACK_FORM_URL) return null;
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div style={{ bottom: "calc(var(--announcement-height, 0px) + max(1rem, env(safe-area-inset-bottom)))" }} className="no-print fixed right-[max(1rem,env(safe-area-inset-right))] z-[45]">
        <Dialog.Trigger asChild>
          <button ref={triggerRef} type="button" className={`inline-flex items-center gap-2 rounded-full border border-green-800/20 bg-green-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-green-800 ${focusRing}`}>
            <MessageCircle size={16} aria-hidden="true" />
            Feedback
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="no-print fixed inset-0 z-[90] bg-gray-950/50 backdrop-blur-sm" />
        <Dialog.Content onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }} className="no-print fixed bottom-4 left-1/2 z-[100] max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:p-7 dark:border-gray-700 dark:bg-gray-900">
          <Dialog.Close aria-label="Close feedback" className={`absolute right-3 top-3 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${focusRing}`}><X size={18} /></Dialog.Close>
          <Dialog.Title className="pr-8 text-xl font-bold text-green-950 dark:text-green-100">Feedback</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">Help us make CurriculumCraft AI more useful for teachers. Share an idea, report a problem, or tell us about your experience.</Dialog.Description>
          <form action={FEEDBACK_FORM_URL} method="get" target="_blank" rel="noopener noreferrer" className="mt-5 space-y-4" onSubmit={(event) => {
            if (!message.trim()) {
              event.preventDefault();
              const textarea = event.currentTarget.querySelector("textarea");
              textarea?.setCustomValidity("Please describe your feedback.");
              textarea?.reportValidity();
              return;
            }
            setContinued(true);
          }}>
            <input type="hidden" name="usp" value="pp_url" />
            <input type="hidden" name={category.entry} value={message.trim() ? getFeedbackFields(type, message).value : ""} />
            <div>
              <label htmlFor={typeId} className="text-sm font-semibold text-gray-800 dark:text-gray-200">Feedback type</label>
              <select id={typeId} value={type} onChange={(event) => {
                const selected = FEEDBACK_TYPES.find((item) => item.id === event.target.value);
                if (selected) setType(selected.id);
                setContinued(false);
              }} className={`mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white ${focusRing}`}>
                {FEEDBACK_TYPES.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={messageId} className="text-sm font-semibold text-gray-800 dark:text-gray-200">Your feedback</label>
              <textarea id={messageId} required maxLength={2000} rows={5} value={message} aria-describedby={privacyId} onChange={(event) => {
                event.currentTarget.setCustomValidity("");
                setMessage(event.target.value);
                setContinued(false);
              }} placeholder="Tell us what happened or what would help you teach better..." className={`mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white ${focusRing}`} />
              <p className="mt-1 text-right text-xs text-gray-500">{message.length}/2,000</p>
            </div>
            <p id={privacyId} className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">Opens our existing Google Form with your message filled in. Complete any required questions and submit there. We do not send your account details automatically. Please avoid student names or sensitive information.</p>
            {continued && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">Continue in the Google Forms tab to submit your feedback. Your draft stays here until you reload or leave the application.</p>}
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild><button type="button" className={`rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${focusRing}`}>Cancel</button></Dialog.Close>
              <button type="submit" className={`inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 ${focusRing}`}>Send Feedback<ExternalLink size={14} aria-hidden="true" /></button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
