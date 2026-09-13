import type {
  LocalContextProvider,
  LocalExampleCategory,
  LocationProfile,
  RegionProfile,
  ResolvedLocalContext,
} from "./types";

/** Recently-used example values per category, most-recent-first, caller-capped. */
export type ExampleHistory = Partial<Record<LocalExampleCategory, string[]>>;

const CATEGORIES: LocalExampleCategory[] = [
  "market",
  "waterBody",
  "landform",
  "crop",
  "festival",
  "occupation",
  "transport",
  "landmark",
  "activity",
];

/** Picks the option least recently used, so repeated generations rotate. */
function pickExample(options: string[], recentlyUsed: string[]): string {
  if (options.length === 0) return "";
  const unused = options.filter((option) => !recentlyUsed.includes(option));
  if (unused.length > 0) return unused[0];
  // Every option has been used recently - fall back to the one used longest ago.
  const byRecency = [...options].sort(
    (a, b) => recentlyUsed.lastIndexOf(a) - recentlyUsed.lastIndexOf(b)
  );
  return byRecency[0];
}

/**
 * Deprioritises (never fully excludes) a provider's over-represented regions,
 * and avoids repeating the immediately previous region, for teachers with no
 * saved location profile.
 */
export function pickFallbackRegion(
  provider: LocalContextProvider,
  lastRegionName?: string
): RegionProfile {
  const preferred = provider.regions.filter(
    (region) =>
      !provider.overusedRegionNames.includes(region.name) &&
      region.name !== lastRegionName
  );
  const pool = preferred.length > 0 ? preferred : provider.regions;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Resolves the concrete local-example set to inject into one generation,
 * given the teacher's saved/manual location (if any), the rotation history,
 * and the active country provider. Never invents facts - only selects among
 * the provider's curated, factual options.
 */
export function resolveLocalContext(
  provider: LocalContextProvider,
  profile: LocationProfile | undefined,
  history: ExampleHistory,
  lastRegionName?: string
): ResolvedLocalContext {
  const requestedRegion = profile?.region
    ? provider.regions.find(
        (region) =>
          region.name.toLowerCase() === profile.region!.trim().toLowerCase() ||
          region.aliases?.some(
            (alias) => alias.toLowerCase() === profile.region!.trim().toLowerCase()
          )
      )
    : undefined;

  const region = requestedRegion ?? pickFallbackRegion(provider, lastRegionName);
  const isFallback = !requestedRegion;

  const examples = {} as Record<LocalExampleCategory, string>;
  for (const category of CATEGORIES) {
    const options = region.examples[category] ?? [];
    if (options.length === 0) continue;
    examples[category] = pickExample(options, history[category] ?? []);
  }

  return {
    countryName: provider.countryName,
    regionName: region.name,
    district: profile?.district,
    community: profile?.community,
    schoolName: profile?.schoolName,
    isFallback,
    examples,
  };
}

/** Merges newly-used examples into history, capping each category's memory. */
export function updateHistory(
  history: ExampleHistory,
  used: Record<LocalExampleCategory, string>,
  maxPerCategory = 4
): ExampleHistory {
  const next: ExampleHistory = { ...history };
  for (const category of CATEGORIES) {
    const value = used[category];
    if (!value) continue;
    const prior = (history[category] ?? []).filter((item) => item !== value);
    next[category] = [value, ...prior].slice(0, maxPerCategory);
  }
  return next;
}
