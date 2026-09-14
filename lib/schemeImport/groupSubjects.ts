import type { ParsedSchemeSection } from "./types";
import type { NormalizedSchemeWeek } from "./normalizeRows";

/** Fuzzy-matches a "full school" section's detected heading text (e.g. "BASIC 4 - MATHEMATICS - FIRST TERM") against known subject names. */
function resolveSubjectFromHint(
  hint: string | null,
  knownSubjects: { slug: string; name: string }[]
): { slug: string | null; label: string } {
  if (!hint) return { slug: null, label: "Unknown subject" };
  const normalizedHint = hint.toLowerCase();
  // Longest name first, so "History of Ghana" wins over "History" when a
  // heading contains both.
  const match = [...knownSubjects]
    .sort((a, b) => b.name.length - a.name.length)
    .find((s) => normalizedHint.includes(s.name.toLowerCase()));
  return match ? { slug: match.slug, label: match.name } : { slug: null, label: cleanSubjectLabel(hint) };
}

/** Trims the grade/term scaffolding off an unmatched heading so it still reads as a subject name in the picker: "BASIC 4 - GHANAIAN LANGUAGE - FIRST TERM" -> "Ghanaian Language". */
export function cleanSubjectLabel(hint: string): string {
  const parts = hint
    .split(/\s*[–—-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^(basic|primary|grade|jhs|shs|kg|b)\s*\d*$/i.test(part))
    .filter((part) => !/(first|second|third|1st|2nd|3rd)\s+term/i.test(part));
  const label = (parts.join(" - ") || hint).trim();
  // School headings SHOUT; title case reads better beside the catalog's own names.
  return label === label.toUpperCase()
    ? label.toLowerCase().replace(/(^|[\s(\/-])([a-z])/g, (_m, lead, letter) => lead + letter.toUpperCase())
    : label;
}

export interface SubjectGroup {
  resolved: { slug: string | null; label: string };
  sections: ParsedSchemeSection[];
}

/**
 * Stitches parsed sections back into subjects. One subject's scheme routinely
 * runs to several tables - typically one per strand, one per page - and only
 * the first of them sits under the subject's heading; the rest are headed by
 * their strand ("STRAND 2: READING"). Treating every table as its own subject
 * is what turned a single English scheme into ten "subjects" named after its
 * strands. So a section without a subject heading continues the subject above
 * it, and consecutive sections naming the same subject merge into one.
 */
export function groupSectionsBySubject(
  sections: ParsedSchemeSection[],
  knownSubjects: { slug: string; name: string }[]
): SubjectGroup[] {
  const groups: SubjectGroup[] = [];
  for (const section of sections) {
    const current = groups[groups.length - 1];
    if (section.subjectHint) {
      const resolved = resolveSubjectFromHint(section.subjectHint, knownSubjects);
      const sameAsCurrent =
        current &&
        (resolved.slug
          ? current.resolved.slug === resolved.slug
          : current.resolved.label.toLowerCase() === resolved.label.toLowerCase());
      if (sameAsCurrent) current.sections.push(section);
      else groups.push({ resolved, sections: [section] });
      continue;
    }
    if (current) current.sections.push(section);
    else groups.push({ resolved: resolveSubjectFromHint(null, knownSubjects), sections: [section] });
  }
  return groups;
}

/** Fills in the strand for weeks whose table named its strand in a heading above it rather than in a Strand column. */
export function weeksWithStrandHint(section: ParsedSchemeSection): NormalizedSchemeWeek[] {
  if (!section.strandHint) return section.weeks;
  return section.weeks.map((week) => (week.strandText ? week : { ...week, strandText: section.strandHint ?? undefined }));
}
