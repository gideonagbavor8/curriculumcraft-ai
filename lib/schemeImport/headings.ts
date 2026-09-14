// Classifies the loose text lines that sit between/above the tables of a
// Scheme of Learning document. Both parsers hand these to importScheme.ts,
// which needs to tell three very different things apart:
//
//   "BASIC 4 - ENGLISH LANGUAGE - FIRST TERM"  -> a new subject starts here
//   "STRAND 1: ORAL LANGUAGE"                  -> still the same subject,
//                                                 just the next strand
//   "contexts" / "of Ghana" / "Year"           -> a stray wrapped fragment
//                                                 from the page above
//
// Getting this wrong is what previously turned one English scheme into ten
// separate "subjects" named after its strands and after random text
// fragments. No curriculum-DB lookup happens here - subject *resolution*
// stays in importScheme.ts; this module only reads the shape of the text.

/** "STRAND 1: ORAL LANGUAGE", "SUB-STRAND 2: Penmanship", "STRAND 2 - CYCLES". */
const STRAND_HEADING = /^(sub[\s\-–—]*strand|strand|theme)\b/i;

/** A code like "B4.1.5.4.1" leading the line - that's scheme content, never a heading. */
const LEADING_CODE = /^[A-Z]\d+(?:\.\s*\d+)+/;

export type HeadingKind = "strand" | "candidate" | "noise";

/**
 * A heading line is only a plausible *subject* heading if it reads like a
 * title rather than a wrapped sentence fragment. Real subject headings in
 * school schemes are short, mostly upper-case or title-cased, and carry no
 * indicator code. Fragments left over from a page break ("separating them
 * into their components", "of Ghana") fail on sentence-case or length.
 */
export function classifyHeading(raw: string): HeadingKind {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "noise";
  if (STRAND_HEADING.test(text)) return "strand";
  if (LEADING_CODE.test(text)) return "noise";
  if (text.length < 3 || text.length > 120) return "noise";

  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return "noise";
  // Sentence fragments carried over from the previous page are overwhelmingly
  // lower-case; genuine headings are SHOUTED or Title Cased.
  const upperRatio = letters.split("").filter((c) => c >= "A" && c <= "Z").length / letters.length;
  if (upperRatio < 0.5) return "noise";

  return "candidate";
}

/**
 * Reduces the heading lines collected before a table to the one that names a
 * subject and the one that names a strand. Scans newest-first so the nearest
 * heading wins, and discards wrapped sentence fragments left over from the
 * page above (see classifyHeading). Either may come back null - a table with
 * no subject heading of its own belongs to the last subject that had one.
 */
export function splitHeadings(headings: string[]): { subjectHint: string | null; strandHint: string | null } {
  let subjectHint: string | null = null;
  let strandHint: string | null = null;
  for (let i = headings.length - 1; i >= 0; i--) {
    const text = headings[i].replace(/\s+/g, " ").trim();
    const kind = classifyHeading(text);
    if (kind === "strand" && !strandHint) strandHint = text;
    else if (kind === "candidate" && !subjectHint) subjectHint = text;
  }
  return { subjectHint, strandHint };
}

/**
 * Turns a raw Strand / Sub-strand value from a scheme into a label fit for a
 * dropdown: "STRAND 1: ORAL LANGUAGE" -> "1. Oral Language", "Sub-Strand 2:
 * Materials" -> "2. Materials". The "STRAND"/"SUB-STRAND" word is redundant
 * once the dropdown is labelled, and school documents SHOUT their headings,
 * which reads badly in a list. Anything that doesn't carry the prefix is
 * returned as-is - some schemes just name the strand ("Number").
 */
export function displayStrandLabel(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  const match = text.match(/^(?:sub[\s\-–—]*)?(?:strand|theme)\s*(\d+)?\s*[:.\-–—]?\s*(.*)$/i);
  if (!match || !match[2]) return titleCaseIfShouted(text);
  const name = titleCaseIfShouted(match[2].trim());
  return match[1] ? `${match[1]}. ${name}` : name;
}

/** School headings are typed in caps; sentence-cased text is left exactly as the school wrote it. */
function titleCaseIfShouted(text: string): string {
  if (text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/(^|[\s(/\-])([a-z])/g, (_m, lead, letter) => lead + letter.toUpperCase());
}
