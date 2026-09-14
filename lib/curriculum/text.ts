/**
 * Cleans curriculum text of the artefacts left behind by extracting it from
 * the NaCCA PDFs.
 *
 * The worst offenders are Private Use Area codepoints: Word and the PDF
 * generator write list bullets in the Symbol and Wingdings fonts, where the
 * bullet glyph lives at U+F0B7 / U+F0A7 / U+F0FC rather than at a real Unicode
 * bullet. Those codepoints only render as a bullet in the font that defines
 * them - everywhere else they come out as an empty box, which is what a
 * teacher currently sees scattered through the RME indicators (107 of them in
 * Basic 4 alone). They also reach the lesson-generation prompt, where they are
 * pure noise.
 *
 * Applied on the read path rather than in the importer, so every row already
 * in the database is cleaned without a re-import.
 */

/** Symbol/Wingdings bullet and dash glyphs, mapped to the real characters they were standing in for. */
const PRIVATE_USE_REPLACEMENTS: Record<number, string> = {
  0xf0b7: "•", // Symbol font bullet
  0xf0a7: "•", // Wingdings square bullet
  0xf0fc: "•", // Wingdings check-mark bullet
  0xf076: "•", // Wingdings arrowhead bullet
  0xf0d8: "•", // Wingdings triangular bullet
  0xf02d: "-", // Symbol font hyphen
  0xf0e0: "→", // Wingdings right arrow
};

function isPrivateUse(codePoint: number): boolean {
  return (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
    (codePoint >= 0x100000 && codePoint <= 0x10fffd)
  );
}

/**
 * Control and formatting characters that carry no meaning in curriculum prose -
 * zero-width spaces, soft hyphens, bidi marks and the replacement character a
 * failed decode leaves behind. Tabs and newlines are deliberately kept.
 */
function isDroppableFormatting(codePoint: number): boolean {
  if (codePoint === 0x09 || codePoint === 0x0a) return false; // tab, newline
  if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) return true;
  return (
    codePoint === 0x00ad || // soft hyphen
    codePoint === 0x200b || // zero-width space
    codePoint === 0x200c ||
    codePoint === 0x200d ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    codePoint === 0xfeff || // byte-order mark
    codePoint === 0xfffd // replacement character
  );
}

/** Spaces that are not the ordinary one: non-breaking, thin, figure, ideographic. */
function isUnusualSpace(codePoint: number): boolean {
  return (
    codePoint === 0x00a0 ||
    (codePoint >= 0x2000 && codePoint <= 0x200a) ||
    codePoint === 0x202f ||
    codePoint === 0x205f ||
    codePoint === 0x3000
  );
}

/**
 * Returns the text as a teacher should read it: PDF bullet glyphs turned into
 * real bullets, invisible formatting characters removed, exotic spaces
 * normalised, and runs of spaces collapsed. Line breaks are preserved.
 */
export function cleanCurriculumText(value: string): string;
export function cleanCurriculumText(value: null | undefined): undefined;
export function cleanCurriculumText(value: string | null | undefined): string | undefined;
export function cleanCurriculumText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;

  let out = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;

    const replacement = PRIVATE_USE_REPLACEMENTS[codePoint];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    // An unmapped private-use glyph has no meaning outside its original font,
    // so it is dropped rather than guessed at.
    if (isPrivateUse(codePoint)) continue;
    if (isDroppableFormatting(codePoint)) continue;
    out += isUnusualSpace(codePoint) ? " " : character;
  }

  return out
    .replace(/[ \t]+/g, " ")
    // A bullet left stranded by the extraction ("text • • more") reads as noise.
    .replace(/•(\s*•)+/g, "•")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

/**
 * Shortens a curriculum statement to fit a fixed-width cell, cutting at a word
 * boundary so it never ends mid-word. The code beside it is what a teacher
 * looks the full wording up by, so the tail is genuinely optional.
 */
export function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.•-]+$/, "");
  return `${trimmed}…`;
}
