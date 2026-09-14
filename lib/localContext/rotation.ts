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

/**
 * Picks the option least recently used, so repeated generations rotate.
 * When `preferredKeyword` (the teacher's actual town/community) is given and
 * an option names it (e.g. "the Keta Lagoon" for a Keta teacher), that option
 * wins even over rotation - it's more specific to the teacher's real place
 * than a same-region option that doesn't mention their town at all.
 */
function pickExample(options: string[], recentlyUsed: string[], preferredKeyword?: string): string {
  if (options.length === 0) return "";
  const matchesKeyword = (option: string) =>
    Boolean(preferredKeyword) && option.toLowerCase().includes(preferredKeyword!.trim().toLowerCase());

  const unused = options.filter((option) => !recentlyUsed.includes(option));
  const keywordMatch = (unused.length > 0 ? unused : options).find(matchesKeyword);
  if (keywordMatch) return keywordMatch;

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
 * Normalizes a place name for approximate matching against region names/
 * aliases: lowercase, trim, and strip MMDA category suffixes (a teacher's
 * saved district is e.g. "Ho Municipal", not "Ho").
 */
function normalizeLocationName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+(municipal|metropolitan|metropolis|assembly|district)$/i, "")
    .trim();
}

function findRegionForValue(
  provider: LocalContextProvider,
  value?: string
): RegionProfile | undefined {
  if (!value) return undefined;
  const normalized = normalizeLocationName(value);
  return provider.regions.find(
    (region) =>
      normalizeLocationName(region.name) === normalized ||
      region.aliases?.some((alias) => normalizeLocationName(alias) === normalized)
  );
}

/**
 * Resolves the concrete local-example set to inject into one generation,
 * given the teacher's saved/manual location (if any), the rotation history,
 * and the active country provider. Never invents facts - only selects among
 * the provider's curated, factual options.
 *
 * Match priority is most-specific-first (community, then district, then
 * region) so a teacher whose saved region doesn't exactly match our list but
 * whose district/community does (e.g. only "Ho" was typed) still resolves
 * correctly, falling back to a deprioritised random region only when none of
 * the three match anything.
 */
export function resolveLocalContext(
  provider: LocalContextProvider,
  profile: LocationProfile | undefined,
  history: ExampleHistory,
  lastRegionName?: string
): ResolvedLocalContext {
  const requestedRegion =
    findRegionForValue(provider, profile?.community) ??
    findRegionForValue(provider, profile?.district) ??
    findRegionForValue(provider, profile?.region);

  const region = requestedRegion ?? pickFallbackRegion(provider, lastRegionName);
  const isFallback = !requestedRegion;

  const examples = {} as Record<LocalExampleCategory, string>;
  // Only bias toward the teacher's own town when it's the field that actually
  // resolved the region - a fallback/random region has no real town to match.
  const townKeyword = !isFallback ? profile?.community : undefined;
  for (const category of CATEGORIES) {
    const options = region.examples[category] ?? [];
    if (options.length === 0) continue;
    examples[category] = pickExample(options, history[category] ?? [], townKeyword);
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
