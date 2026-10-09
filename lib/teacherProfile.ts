"use client";

import { useCallback, useEffect, useState } from "react";
import type { LocationProfile } from "./localContext/types";
import { useAuth } from "@/components/auth/AuthProvider";

const STORAGE_KEY = "curriculumcraft:teacher-profile";

function readProfile(key: string): LocationProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocationProfile) : {};
  } catch {
    return {};
  }
}

function writeProfile(key: string, profile: LocationProfile) {
  window.localStorage.setItem(key, JSON.stringify(profile));
  window.dispatchEvent(new Event("teacher-profile-updated"));
}

/**
 * Classroom location remains a browser-local preference, namespaced by
 * account so teachers sharing a device do not inherit each other's school.
 * Account identity and saved resources are stored separately on the server.
 */
export function useTeacherProfile() {
  const user = useAuth();
  const key = `${STORAGE_KEY}:${user?.id ?? "guest"}`;
  const [profile, setProfileState] = useState<LocationProfile>(() => readProfile(key));

  useEffect(() => {
    const onUpdate = () => setProfileState(readProfile(key));
    window.addEventListener("teacher-profile-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("teacher-profile-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [key]);

  const setProfile = useCallback((next: LocationProfile) => {
    writeProfile(key, next);
    setProfileState(next);
  }, [key]);

  return { profile, setProfile, loaded: true };
}

const HISTORY_KEY = "curriculumcraft:local-example-history";
const LAST_REGION_KEY = "curriculumcraft:last-fallback-region";

export function readExampleHistory(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writeExampleHistory(history: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function readLastFallbackRegion(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(LAST_REGION_KEY) ?? undefined;
}

export function writeLastFallbackRegion(region: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_REGION_KEY, region);
}
