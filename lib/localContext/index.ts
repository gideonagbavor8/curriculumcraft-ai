import { GHANA_PROVIDER } from "./ghana";
import type { LocalContextProvider } from "./types";

const PROVIDERS: Record<string, LocalContextProvider> = {
  GH: GHANA_PROVIDER,
};

/**
 * Resolves the local-context provider for a country. Only Ghana is
 * implemented today; adding a new country/curriculum means adding one
 * `RegionProfile[]` file and registering it here - nothing else in the
 * prompt/rotation/API layer needs to change.
 */
export function getLocalContextProvider(countryCode = "GH"): LocalContextProvider {
  return PROVIDERS[countryCode.toUpperCase()] ?? GHANA_PROVIDER;
}

export * from "./types";
export { resolveLocalContext, updateHistory, pickFallbackRegion } from "./rotation";
export { GHANA_REGION_NAMES } from "./ghana";
export { formatLocalContextBlock, formatLocalContextLabel } from "./format";
