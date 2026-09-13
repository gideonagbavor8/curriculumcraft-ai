// Generic types for the local-context engine. Deliberately country-agnostic so
// a future provider (e.g. Nigeria, Kenya) can implement the same shape without
// touching the prompt/rotation/API code that consumes it.

export interface LocationProfile {
  countryCode?: string; // defaults to "GH" when omitted
  region?: string;
  district?: string;
  community?: string;
  schoolName?: string;
}

export type LocalExampleCategory =
  | "market"
  | "waterBody"
  | "landform"
  | "crop"
  | "festival"
  | "occupation"
  | "transport"
  | "landmark"
  | "activity";

export type LocalExampleSet = Partial<Record<LocalExampleCategory, string[]>>;

export interface RegionProfile {
  name: string;
  /** Alternate spellings/short names a teacher might type, for lookup. */
  aliases?: string[];
  examples: LocalExampleSet;
}

/** A country-specific source of regions and their local examples. */
export interface LocalContextProvider {
  countryCode: string;
  countryName: string;
  regions: RegionProfile[];
  /** Region names that are already heavily over-represented in generic AI output. */
  overusedRegionNames: string[];
}

/** The resolved set of local details actually injected into one generation. */
export interface ResolvedLocalContext {
  countryName: string;
  regionName: string;
  district?: string;
  community?: string;
  schoolName?: string;
  isFallback: boolean;
  examples: Record<LocalExampleCategory, string>;
}
