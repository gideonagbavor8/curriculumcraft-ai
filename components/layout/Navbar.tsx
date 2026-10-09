"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, LayoutDashboard, Zap, Library, Sun, Moon, MapPin, UploadCloud, Menu, X, LockKeyhole, ChevronDown, UserRound, LogOut } from "lucide-react";
import { Dialog, DropdownMenu } from "radix-ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

const TEACHING_TOOLS = [
  { href: "/scheme-of-learning", label: "Scheme of Learning", description: "Turn your scheme into weekly lesson plans", icon: UploadCloud },
  { href: "/lesson-builder", label: "Lesson Builder", description: "Prepare a lesson from any NaCCA indicator", icon: BookOpen },
  { href: "/activity-suite", label: "Activity Suite", description: "Create exercises, questions and assessments", icon: Zap },
  { href: "/dashboard", label: "Standard Map", description: "Explore the Primary and JHS curriculum", icon: LayoutDashboard },
];

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";
const dropdownClass = "z-[60] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-gray-900/10 dark:border-gray-700 dark:bg-gray-900";
const accountItemClass = "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 outline-none data-[highlighted]:bg-gray-50 data-[highlighted]:text-green-800 dark:text-gray-300 dark:data-[highlighted]:bg-gray-800 dark:data-[highlighted]:text-green-200";

export default function Navbar() {
  const pathname = usePathname();
  const user = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [desktopMenu, setDesktopMenu] = useState<"tools" | "account" | null>(null);
  const menuOpen = menuPath === pathname;
  const toolIsActive = TEACHING_TOOLS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  const teacherLink = (href: string) => user ? href : `/sign-in?next=${encodeURIComponent(href)}`;
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeMenus = () => {
      setMenuPath(null);
      setDesktopMenu(null);
    };
    desktop.addEventListener("change", closeMenus);
    return () => desktop.removeEventListener("change", closeMenus);
  }, []);

  // On mount, read saved theme preference
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      const stored = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = stored === "dark" || (!stored && prefersDark);
      setDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Fetch saved lessons count — defined outside effect to reuse
  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const responses = await Promise.all([fetch("/api/lessons"), fetch("/api/resources")]);
      const data = await Promise.all(responses.map((response) => response.json()));
      if (responses.some((response) => !response.ok)) throw new Error("Unable to load library count.");
      setSavedCount(data[0].count + data[1].count);
    } catch (error) {
      console.error("Unable to load saved resource count:", error);
    }
  }, [user]);

  // Refetch on route change
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void fetchCount(); });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, fetchCount]);

  // Listen for lesson-saved event fired from lesson builder
  useEffect(() => {
    window.addEventListener("lesson-saved", fetchCount);
    return () => window.removeEventListener("lesson-saved", fetchCount);
  }, [fetchCount]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      window.location.assign("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
      setSigningOut(false);
    }
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/95">
      <nav aria-label="Main navigation" className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-16 lg:gap-8 lg:px-8">
        <Link href="/" onClick={() => setMenuPath(null)} className={`group flex shrink-0 items-center gap-3 rounded-lg ${focusRing}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-700 text-sm font-bold text-white shadow-sm transition-colors group-hover:bg-green-800 sm:h-10 sm:w-10">CC</span>
          <span className="flex flex-col gap-1">
            <span className="whitespace-nowrap text-[13px] font-bold tracking-tight text-green-950 sm:text-base dark:text-green-100">CurriculumCraft <span className="font-medium text-green-700 dark:text-green-400">AI</span></span>
            <span className="hidden text-[11px] font-medium tracking-wide text-gray-500 sm:block dark:text-gray-400">Built for teachers. Grounded in NaCCA.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex xl:gap-5">
          <DropdownMenu.Root open={desktopMenu === "tools"} onOpenChange={(open) => setDesktopMenu(open ? "tools" : null)}>
            <DropdownMenu.Trigger className={`flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${focusRing} ${toolIsActive ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200" : "text-gray-600 hover:bg-gray-50 hover:text-green-800 dark:text-gray-300 dark:hover:bg-gray-800"}`}>
              Teaching tools <ChevronDown size={15} aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="start" sideOffset={14} className={`${dropdownClass} w-[360px]`}>
                <DropdownMenu.Label className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Plan. Create. Teach.</DropdownMenu.Label>
                {TEACHING_TOOLS.map(({ href, label, description, icon: Icon }) => (
                  <DropdownMenu.Item key={href} asChild>
                    <Link href={teacherLink(href)} aria-current={pathname === href ? "page" : undefined} className="group flex items-center gap-3 rounded-xl p-3 outline-none data-[highlighted]:bg-green-50 dark:data-[highlighted]:bg-green-900/20">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-green-700 group-data-[highlighted]:bg-green-100 dark:bg-gray-800 dark:text-green-300 dark:group-data-[highlighted]:bg-green-900/40"><Icon size={19} /></span>
                      <span className="flex-1"><span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</span><span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</span></span>
                      {!user && <LockKeyhole size={14} className="shrink-0 text-gray-400" aria-label="Sign in required" />}
                    </Link>
                  </DropdownMenu.Item>
                ))}
                {!user && <p className="mx-3 mb-2 mt-2 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">A teacher account unlocks every tool.</p>}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          {user ? (
            <Link href="/saved" aria-current={pathname.startsWith("/saved") ? "page" : undefined} className={`flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ${focusRing} ${pathname.startsWith("/saved") ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200" : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>
              My library {savedCount > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-800 dark:bg-green-900 dark:text-green-200">{savedCount > 99 ? "99+" : savedCount}</span>}
            </Link>
          ) : <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined} className={`rounded-lg px-3 py-3 text-sm font-medium text-gray-600 hover:text-green-800 dark:text-gray-300 dark:hover:text-green-200 ${focusRing}`}>About</Link>}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <button onClick={toggleTheme} disabled={!mounted} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className={`flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${focusRing}`}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden h-7 w-px bg-gray-200 lg:block dark:bg-gray-700" />
          <div className="hidden items-center gap-4 lg:flex">
            {user ? (
              <DropdownMenu.Root open={desktopMenu === "account"} onOpenChange={(open) => setDesktopMenu(open ? "account" : null)}>
                <DropdownMenu.Trigger aria-label="Open account menu" className={`flex items-center gap-3 rounded-full p-1 pr-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${focusRing}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-800 dark:bg-green-900/50 dark:text-green-200">{initials}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">My account</span><ChevronDown size={15} className="text-gray-400" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={14} className={`${dropdownClass} w-64`}>
                    <DropdownMenu.Label className="px-3 py-3"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{user.name}</span><span className="mt-1 block truncate text-xs font-normal text-gray-500">{user.email}</span></DropdownMenu.Label>
                    <DropdownMenu.Separator className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
                    <DropdownMenu.Item asChild><Link href="/account" className={accountItemClass}><UserRound size={17} />Profile & account</Link></DropdownMenu.Item>
                    <DropdownMenu.Item asChild><Link href="/settings" className={accountItemClass}><MapPin size={17} />Classroom settings</Link></DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
                    <DropdownMenu.Item disabled={signingOut} onSelect={() => { void signOut(); }} className={`${accountItemClass} data-[disabled]:opacity-50`}><LogOut size={17} />{signingOut ? "Signing out..." : "Sign out"}</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : <>
              <Link href="/sign-in" className={`rounded-lg px-2 py-3 text-sm font-semibold text-gray-700 hover:text-green-800 dark:text-gray-200 dark:hover:text-green-300 ${focusRing}`}>Sign in</Link>
              <Link href="/sign-up" className={`rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 ${focusRing}`}>Create account</Link>
            </>}
          </div>

          <Dialog.Root open={menuOpen} onOpenChange={(open) => setMenuPath(open ? pathname : null)}>
            <Dialog.Trigger asChild>
              <button aria-label="Open navigation menu" className={`flex h-11 w-11 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-200 dark:hover:bg-gray-800 ${focusRing}`}><Menu size={22} /></button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[60] bg-gray-950/40 backdrop-blur-sm lg:hidden" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-2xl lg:hidden dark:border-gray-800 dark:bg-gray-900">
                <div className="flex shrink-0 items-center justify-between px-6 py-5">
                  <Dialog.Title className="text-lg font-semibold tracking-tight text-green-950 dark:text-green-100">Your workspace</Dialog.Title>
                  <Dialog.Close aria-label="Close navigation menu" className={`flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${focusRing}`}><X size={21} /></Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-8">
                  <Dialog.Description className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{user ? "Your teaching tools and resources, in one place." : "Sign in to prepare lessons and keep your resources together."}</Dialog.Description>
                  {user ? (
                    <Link onClick={() => setMenuPath(null)} href="/saved" className={`mb-7 flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-semibold text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-200 ${focusRing}`}><Library size={20} />My library{savedCount > 0 && <span className="ml-auto text-xs">{savedCount} saved</span>}</Link>
                  ) : (
                    <div className="mb-7 grid grid-cols-2 gap-3">
                      <Link onClick={() => setMenuPath(null)} href="/sign-in" className={`rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200 ${focusRing}`}>Sign in</Link>
                      <Link onClick={() => setMenuPath(null)} href="/sign-up" className={`rounded-xl bg-green-700 py-3 text-center text-sm font-semibold text-white hover:bg-green-800 ${focusRing}`}>Create account</Link>
                    </div>
                  )}
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Teaching tools</p>
                  <div className="space-y-2">
                    {TEACHING_TOOLS.map(({ href, label, description, icon: Icon }) => (
                      <Link key={href} onClick={() => setMenuPath(null)} href={teacherLink(href)} aria-current={pathname === href ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-4 transition-colors ${focusRing} ${pathname === href ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                        <Icon size={20} className="shrink-0 text-green-700 dark:text-green-400" />
                        <span className="flex-1"><span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</span><span className="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</span></span>
                        {!user && <LockKeyhole size={14} className="shrink-0 text-gray-400" aria-label="Sign in required" />}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-7 space-y-1 border-t border-gray-100 pt-5 dark:border-gray-800">
                    {user ? <>
                      <Link onClick={() => setMenuPath(null)} href="/account" className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 ${focusRing}`}><UserRound size={18} />Profile & account</Link>
                      <Link onClick={() => setMenuPath(null)} href="/settings" className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 ${focusRing}`}><MapPin size={18} />Classroom settings</Link>
                      <button onClick={signOut} disabled={signingOut} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-500 disabled:opacity-50 dark:text-gray-400 ${focusRing}`}><LogOut size={18} />{signingOut ? "Signing out..." : "Sign out"}</button>
                    </> : <Link onClick={() => setMenuPath(null)} href="/about" className={`block rounded-xl px-3 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 ${focusRing}`}>About CurriculumCraft</Link>}
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>
    </header>
  );
}