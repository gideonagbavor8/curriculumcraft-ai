import type { ResolvedLocalContext } from "./types";

/**
 * Renders the resolved local-context examples as a prompt block. Shared by
 * every generation prompt (lesson, activity, ...) so the "use ONLY these
 * details" instruction and format stay identical everywhere local context is
 * injected.
 *
 * Naming priority is most-specific-first (School, then Town/Community, then
 * District, then Region): the factual market/river/crop/etc. facts are only
 * curated at region level, but the model is told to set every scenario in
 * the teacher's actual school/town by name when we have it, falling back to
 * district then region only as those get less specific.
 */
export function formatLocalContextBlock(
  localContext: ResolvedLocalContext | undefined,
  contentLabel: string
): string {
  if (!localContext) return "";
  const place = [localContext.schoolName, localContext.community, localContext.district]
    .filter(Boolean)
    .join(", ");
  return `## Local Context (use ONLY these specific details for every example ${contentLabel}):
- Region: ${localContext.regionName}${localContext.district ? `, ${localContext.district} district` : ""}${localContext.community ? `, ${localContext.community}` : ""}
${localContext.schoolName ? `- School: ${localContext.schoolName}\n` : ""}${Object.entries(localContext.examples)
    .map(([category, value]) => `- ${category}: ${value}`)
    .join("\n")}
Naming priority: set scenarios in ${place || localContext.regionName} by name (the
most specific place we know - School, then Town, then District, then Region) -
never invent a different town, market, or landmark, and never substitute a
different named place in Ghana just because it is more famous.
`;
}

/**
 * Short "where this lesson's local examples are set" label for display in the
 * lesson header (in-app, PDF, DOCX) - most-specific-first, School to Region.
 */
export function formatLocalContextLabel(localContext: ResolvedLocalContext): string {
  const parts = [
    localContext.schoolName,
    localContext.community,
    localContext.district,
    `${localContext.regionName} Region`,
  ].filter(Boolean);
  return parts.join(" · ");
}
