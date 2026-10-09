"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { ArrowRight, X } from "lucide-react";
import { ANNOUNCEMENTS, ANNOUNCEMENT_SETTINGS } from "@/lib/announcements";

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function AnnouncementBanner() {
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const roadmapTriggerRef = useRef<HTMLButtonElement | null>(null);
  const ctaLabel = <span className="announcement-stack">
    {ANNOUNCEMENTS.map((item, index) => <span key={item.id} aria-hidden={active !== index} className="announcement-slide" data-active={active === index}>{item.cta}</span>)}
  </span>;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = window.requestAnimationFrame(() => {
      setReducedMotion(motion.matches);
      setPageVisible(!document.hidden);
    });
    const onMotion = () => setReducedMotion(motion.matches);
    const onVisibility = () => setPageVisible(!document.hidden);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (interacting || reducedMotion || !pageVisible || roadmapOpen) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % ANNOUNCEMENTS.length), ANNOUNCEMENT_SETTINGS.rotationMs);
    return () => window.clearInterval(timer);
  }, [interacting, reducedMotion, pageVisible, roadmapOpen, active]);

  useEffect(() => {
    const root = document.documentElement;
    if (!bannerRef.current) {
      root.style.setProperty("--announcement-height", "0px");
      return;
    }
    const banner = bannerRef.current;
    const measure = () => root.style.setProperty("--announcement-height", `${Math.ceil(banner.getBoundingClientRect().height)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.setProperty("--announcement-height", "0px");
    };
  }, []);

  function openRoadmap(event: React.MouseEvent<HTMLButtonElement>) {
    roadmapTriggerRef.current = event.currentTarget;
    setRoadmapOpen(true);
  }

  return <>
      <div aria-hidden="true" className="announcement-spacer" />
      <div ref={bannerRef} role="region" aria-label="Product announcements" aria-roledescription="carousel"
        onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
        className="announcement-bar no-print fixed inset-x-0 bottom-0 z-40 border-t border-green-200 bg-green-50/95 shadow-[0_-4px_20px_rgb(0_0_0/0.04)] backdrop-blur-xl dark:border-green-900 dark:bg-gray-900/95"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
          <div className="announcement-stack min-w-0 flex-1" aria-live="off">
            {ANNOUNCEMENTS.map((item, index) => <div key={item.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${ANNOUNCEMENTS.length}`} aria-hidden={active !== index} className="announcement-slide" data-active={active === index}>
              <p className="text-sm font-semibold leading-snug text-green-950 dark:text-green-100">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-700 sm:text-sm dark:text-gray-300">{item.message}</p>
              <p className="mt-1 hidden text-xs leading-relaxed text-gray-500 lg:block dark:text-gray-400">{item.description}</p>
            </div>)}
          </div>
          <button onClick={openRoadmap} className={`hidden shrink-0 items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-xs font-semibold text-green-800 hover:bg-green-100 sm:inline-flex dark:border-green-800 dark:bg-green-950 dark:text-green-200 ${focusRing}`}>{ctaLabel}<ArrowRight size={14} /></button>
        </div>
        <div className="mx-auto -mt-1 flex max-w-7xl items-center justify-between gap-2 px-4 pb-2 sm:justify-center sm:px-6 lg:px-8">
          <button onClick={openRoadmap} className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded text-xs font-semibold text-green-800 sm:hidden dark:text-green-300 ${focusRing}`}>{ctaLabel}<ArrowRight size={13} /></button>
          <div className="flex items-center">
          {ANNOUNCEMENTS.map((item, index) => <button key={item.id} onClick={() => setActive(index)} aria-label={`Show announcement ${index + 1}: ${item.title}`} aria-current={active === index ? "true" : undefined} className={`flex h-7 w-7 items-center justify-center rounded-full ${focusRing}`}><span className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${active === index ? "w-5 bg-green-700 dark:bg-green-400" : "w-1.5 bg-green-700/25 dark:bg-green-400/25"}`} /></button>)}
          </div>
        </div>
      </div>
    <Dialog.Root open={roadmapOpen} onOpenChange={setRoadmapOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="no-print fixed inset-0 z-[70] bg-gray-950/50 backdrop-blur-sm" />
        <Dialog.Content onCloseAutoFocus={(event) => { event.preventDefault(); roadmapTriggerRef.current?.focus(); }} className="no-print fixed left-1/2 top-1/2 z-[80] max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-gray-700 dark:bg-gray-900">
          <Dialog.Close aria-label="Close product roadmap" className={`absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${focusRing}`}><X size={19} /></Dialog.Close>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">What&apos;s coming</p>
          <Dialog.Title className="mt-3 pr-6 text-2xl font-bold text-green-950 dark:text-green-100">More support for every part of teaching.</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">Create. Discover. Stay updated. Grow. These are our upcoming product directions, not features available today. No payment is required here.</Dialog.Description>
          <div className="mt-6 space-y-5">
            {ANNOUNCEMENTS.map((item) => <section key={item.id} className="rounded-xl border border-green-100 bg-green-50/50 p-4 dark:border-green-900 dark:bg-green-950/20">
              <p className="text-[10px] font-semibold tracking-widest text-green-700 dark:text-green-400">{item.area}</p>
              <h2 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h2>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{item.message}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{item.description}</p>
            </section>)}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-gray-500">Planned capabilities and pricing may evolve. Existing activities and assessments remain available to signed-in teachers.</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
