"use client";

import { useCallback, useEffect, useState } from "react";
import type { LocationProfile } from "./localContext/types";

const STORAGE_KEY = "curriculumcraft:teacher-profile";

function readProfile(): LocationProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocationProfile) : {};
  } catch {
    return {};
  }
}

function writeProfile(profile: LocationProfile) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event("teacher-profile-updated"));
}

/**
 * There is no user-account system in this app - the teacher's location
 * profile is a browser-local setting (same pattern as the theme toggle),
 * not tied to a login. It is designed to be swapped for a server-backed
 * per-user profile later without changing the LocationProfile shape.
 */
export function useTeacherProfile() {
  const [profile, setProfileState] = useState<LocationProfile>(() => readProfile());

  useEffect(() => {
    const onUpdate = () => setProfileState(readProfile());
    window.addEventListener("teacher-profile-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("teacher-profile-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const setProfile = useCallback((next: LocationProfile) => {
    writeProfile(next);
    setProfileState(next);
  }, []);

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
