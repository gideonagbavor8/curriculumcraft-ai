import { generateWithClaudeVision } from "@/lib/claude";
import type { ParseResult, ParsedSchemeSection } from "./types";
import type { NormalizedSchemeWeek, NormalizedIndicator } from "./normalizeRows";

// No dedicated OCR pipeline - a vision-capable chat model reads the photo
// directly and transcribes it into the same shape the DOCX/PDF parsers
// produce, so it flows through the exact same import/matching/generation
// pipeline afterwards. Best-effort per the "extract first, flag
// uncertainty" philosophy: never invents data, uses null for anything
// illegible instead of guessing.
const SYSTEM_PROMPT = `You transcribe photos of Ghanaian NaCCA "Scheme of Learning" pages for a teaching app. Read every visible row of the table(s) in the image exactly as printed - never invent, correct, or complete missing information; if a field isn't legible, use null.

Respond with ONLY strict JSON (no markdown fences, no commentary) matching this exact shape:
{
  "sections": [
    {
      "subjectHint": string | null,
      "weeks": [
        {
          "weekNumber": number | null,
          "isNonTeachingWeek": boolean,
          "nonTeachingLabel": string | null,
          "strand": string | null,
          "subStrand": string | null,
          "contentStandardCode": string | null,
          "contentStandardText": string | null,
          "indicators": [ { "code": string | null, "text": string } ],
          "resources": string | null
        }
      ]
    }
  ],
  "warnings": string[]
}

If the photo shows more than one subject's table, return one entry per subject in "sections". "warnings" should be plain factual notes about the photo itself (e.g. "bottom row partially cropped"), never instructions telling the teacher what to fix. Always return your best-effort transcription of whatever text is visible - never refuse.`;

const USER_PROMPT = "Transcribe this Scheme of Learning page into the JSON shape described in your instructions.";

function extractJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

interface RawImageIndicator {
  code?: string | null;
  text?: string | null;
}
interface RawImageWeek {
  weekNumber?: number | null;
  isNonTeachingWeek?: boolean;
  nonTeachingLabel?: string | null;
  strand?: string | null;
  subStrand?: string | null;
  contentStandardCode?: string | null;
  contentStandardText?: string | null;
  indicators?: RawImageIndicator[];
  resources?: string | null;
}
interface RawImageSection {
  subjectHint?: string | null;
  weeks?: RawImageWeek[];
}
interface RawImageResult {
  sections?: RawImageSection[];
  warnings?: string[];
}

/** Extracts a scheme's subjects/weeks/indicators from a photo/screenshot via vision AI transcription, then normalizes into the same shape the DOCX/PDF parsers produce. */
export async function parseImageScheme(buffer: Buffer, mimeType: string): Promise<ParseResult> {
  const base64 = buffer.toString("base64");

  let raw: string;
  try {
    raw = await generateWithClaudeVision(SYSTEM_PROMPT, USER_PROMPT, base64, mimeType, 4000);
  } catch (err) {
    throw new Error(`Couldn't read the image: ${err instanceof Error ? err.message : String(err)}`);
  }

  let parsed: RawImageResult;
  try {
    parsed = extractJson(raw) as RawImageResult;
  } catch {
    return {
      sections: [],
      warnings: ["The photo couldn't be read as a scheme table - try a clearer, well-lit shot with the table filling the frame, or use manual entry instead."],
    };
  }

  const warnings = [...(parsed.warnings ?? [])];
  const sections: ParsedSchemeSection[] = (parsed.sections ?? []).map((section) => {
    let previousWeekNumber = 0;
    const weeks: NormalizedSchemeWeek[] = (section.weeks ?? []).map((week) => {
      const weekNumber = week.weekNumber ?? previousWeekNumber + 1;
      previousWeekNumber = weekNumber;

      if (week.isNonTeachingWeek) {
        return {
          weekNumber,
          isNonTeachingWeek: true,
          nonTeachingLabel: week.nonTeachingLabel ?? undefined,
          rawRowText: [week.strand, week.subStrand, week.nonTeachingLabel].filter(Boolean).join(" | "),
          indicators: [],
        };
      }

      const indicators: NormalizedIndicator[] = (week.indicators ?? []).map((ind, i) => ({
        code: ind.code || `UNCODED-W${weekNumber}-${i + 1}`,
        text: ind.text || undefined,
      }));

      return {
        weekNumber,
        isNonTeachingWeek: false,
        strandText: week.strand ?? undefined,
        subStrandText: week.subStrand ?? undefined,
        contentStandardCode: week.contentStandardCode ?? undefined,
        contentStandardText: week.contentStandardText ?? undefined,
        resourcesText: week.resources ?? undefined,
        rawRowText: [week.strand, week.subStrand, week.contentStandardCode, week.contentStandardText].filter(Boolean).join(" | "),
        indicators,
      };
    });
    // A photo is one table; its strand, when named, is read into each week's
    // Strand column by the vision prompt rather than as a heading above it.
    return { subjectHint: section.subjectHint ?? null, strandHint: null, weeks };
  });

  if (sections.length === 0) {
    warnings.push("No scheme table could be identified in the photo - try a clearer, well-lit shot, or use manual entry instead.");
  }

  return { sections, warnings };
}
