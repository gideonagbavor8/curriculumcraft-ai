import { generateWithClaude, foundryRoot, CLAUDE_MODEL } from "@/lib/claude";
import { LESSON_SYSTEM_PROMPT, buildLessonUserPrompt } from "@/prompts/lesson";
import type { GenerateRequest, GenerateResponse, Citation, LessonHeader } from "@/types/curriculum";
import { getIndicatorGrounding } from "@/lib/curriculum/exemplars";
import { getGradeContext } from "@/lib/curriculum/catalog";
import { getLocalContextProvider, resolveLocalContext, formatLocalContextLabel } from "@/lib/localContext";
import { extractLessonPhases, extractHeadingSection } from "@/lib/lessonPhases";
import { resolveDuration, resolveClassSize } from "@/lib/lessonSizing";

// Foundry IQ grounding - retrieves relevant NaCCA context with citations
async function getFoundryContext(
  indicatorCode: string,
  indicatorText: string,
  subject: string
): Promise<{ context: string | null; citation: Citation | null }> {
  try {
    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
    const apiKey = process.env.AZURE_FOUNDRY_API_KEY;

    if (!endpoint || !apiKey) return { context: null, citation: null };

    const response = await fetch(`${foundryRoot(endpoint)}/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a NaCCA Ghana curriculum expert. Provide concise, accurate context about the curriculum standard requested. Focus on what the standard requires, common teaching approaches, and key concepts. Keep response under 200 words.",
          },
          {
            role: "user",
            content: `Provide curriculum context for this NaCCA Ghana curriculum indicator:
Subject: ${subject}
Code: ${indicatorCode}
Indicator: ${indicatorText}

What are the key concepts, teaching considerations, and expected student outcomes for this standard?`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.warn(`Foundry IQ grounding failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
      return { context: null, citation: null };
    }

    const data = await response.json();
    const context = data.choices?.[0]?.message?.content || null;

    const citation: Citation | null = context
      ? {
          id: `foundry-${indicatorCode}`,
          text: `NaCCA Indicator ${indicatorCode}`,
          source: "Azure Foundry IQ — NaCCA Curriculum Database",
          type: "foundry",
        }
      : null;

    return { context, citation };
  } catch (error) {
    console.warn("Foundry IQ unavailable, proceeding without grounding:", error);
    return { context: null, citation: null };
  }
}

// Parse Claude's response into four sections
function parseLessonResponse(text: string): {
  lessonPlan: string;
  lessonNote: string;
  visualPrompts: string;
  studentReading: string;
} {
  const planSplit = text.split("---LESSON NOTE---");
  const noteSplit = planSplit[1]?.split("---VISUAL CONTENT PROMPTS---");
  const visualSplit = noteSplit?.[1]?.split("---STUDENT READING MATERIAL---");

  const lessonPlan = planSplit[0]?.replace("---LESSON PLAN---", "").trim() || "";
  const lessonNote = noteSplit?.[0]?.trim() || "";
  const visualPrompts = visualSplit?.[0]?.trim() || "";
  const studentReading = visualSplit?.[1]?.trim() || "";

  if (!lessonPlan || !lessonNote || !visualPrompts || !studentReading) {
    throw new Error("Failed to parse lesson sections from response");
  }

  return { lessonPlan, lessonNote, visualPrompts, studentReading };
}

/**
 * The single shared lesson-generation core, used by both the indicator-picker
 * driven /api/generate route and the scheme-of-learning-driven weekly
 * generation route - one prompt-build/Claude-call/parse/header-assembly path
 * so both stay in sync.
 */
export async function generateLessonForIndicator(body: GenerateRequest): Promise<GenerateResponse> {
  const {
    indicatorCode,
    indicatorText,
    subject,
    grade,
    strand,
    subStrand,
    bloomsLevel,
    duration,
    classSize,
    difficultyLevel,
    levelName,
    gradeName,
    typicalAgeMin,
    typicalAgeMax,
    curriculumSlug,
    exemplarRevision,
    schoolName,
    teacherName,
    weekEnding,
    day,
    lessonDate,
    locationProfile,
    exampleHistory,
  } = body;

  if (!indicatorCode || !indicatorText || !subject || !grade || !strand) {
    throw new Error("Missing required fields");
  }

  // Duration and class size are typed by the teacher, so they reach here as
  // free text. Resolve them once, here, rather than at each use site - the
  // prompt, the phase timings and the lesson header must all agree on the
  // same numbers.
  const lessonDuration = resolveDuration(duration);
  const lessonClassSize = resolveClassSize(classSize);

  const provider = getLocalContextProvider(locationProfile?.countryCode ?? "GH");
  const resolvedLocalContext = resolveLocalContext(provider, locationProfile, exampleHistory ?? {});

  const [foundry, grounding] = await Promise.all([
    getFoundryContext(indicatorCode, indicatorText, subject),
    getIndicatorGrounding({
      indicatorCode,
      subject,
      grade,
      strand,
      subStrand,
      curriculumSlug,
      revision: exemplarRevision,
    }),
  ]);
  const foundryContext = foundry.context;
  const exemplars = grounding?.exemplars ?? [];

  const userPrompt = buildLessonUserPrompt({
    indicatorCode,
    indicatorText: grounding?.indicatorText ?? indicatorText,
    subject,
    grade,
    strand,
    subStrand: subStrand || strand,
    bloomsLevel: grounding?.bloomsLevel ?? bloomsLevel,
    duration: lessonDuration,
    classSize: lessonClassSize,
    difficultyLevel: difficultyLevel || "average",
    foundryContext: foundryContext || undefined,
    levelName,
    gradeName,
    typicalAgeMin,
    typicalAgeMax,
    exemplars,
    // The curriculum match is preferred (it carries the official wording), but
    // a scheme upload supplies its own content standard for indicators the
    // curriculum database doesn't have - so the request's value is used rather
    // than leaving the lesson's Content Standard cell empty.
    contentStandardCode: grounding?.contentStandardCode ?? body.contentStandardCode,
    contentStandardText: grounding?.contentStandardText ?? body.contentStandardText,
    guidance: grounding?.guidance,
    localContext: resolvedLocalContext,
  });

  const rawResponse = await generateWithClaude(LESSON_SYSTEM_PROMPT, userPrompt, 3200);
  const { lessonPlan, lessonNote, visualPrompts, studentReading } = parseLessonResponse(rawResponse);

  const inferredContext = getGradeContext(grade);
  const header: LessonHeader = {
    schoolName,
    teacherName,
    weekEnding,
    day,
    lessonDate,
    curriculumSlug: curriculumSlug || "ghana-nacca-sbc",
    levelName: levelName ?? inferredContext?.levelName ?? "School",
    subject,
    gradeName: gradeName ?? inferredContext?.gradeName ?? grade,
    grade,
    classSize: lessonClassSize,
    duration: lessonDuration,
    strand,
    subStrand: subStrand || strand,
    // The curriculum match is preferred (it carries the official wording), but
    // a scheme upload supplies its own content standard for indicators the
    // curriculum database doesn't have - so the request's value is used rather
    // than leaving the lesson's Content Standard cell empty.
    contentStandardCode: grounding?.contentStandardCode ?? body.contentStandardCode,
    contentStandardText: grounding?.contentStandardText ?? body.contentStandardText,
    indicatorCode,
    indicatorText: grounding?.indicatorText ?? indicatorText,
    performanceIndicator: extractHeadingSection(lessonNote, "Performance Indicator"),
    coreCompetencies: extractHeadingSection(lessonNote, "Core Competencies"),
    teachingLearningResources: extractHeadingSection(lessonNote, "Teaching and Learning Resources"),
    keywords: extractHeadingSection(lessonPlan, "Key Vocabulary") ?? extractHeadingSection(lessonNote, "Key Vocabulary"),
    reference: grounding?.provenance.document
      ? `${grounding.provenance.document.title} (${grounding.provenance.document.sourceUrl})`
      : "Ghana NaCCA Standards-Based Curriculum (2019)",
    localContextLabel: formatLocalContextLabel(resolvedLocalContext),
    sourceNeedsReview: grounding?.provenance.ambiguityFlag === true || grounding?.provenance.reviewStatus === "needs-review",
  };

  return {
    lessonPlan,
    lessonNote,
    teacherNotes: lessonNote,
    visualPrompts,
    studentReading,
    indicatorCode,
    subject,
    grade,
    strand,
    difficultyLevel: difficultyLevel || "average",
    header,
    phases: extractLessonPhases(lessonPlan),
    citations: [
      ...(foundry.citation ? [foundry.citation] : []),
      ...(grounding?.provenance.document
        ? [
            {
              id: `curriculum-${indicatorCode}-${grounding.revision}`,
              text: `NaCCA Indicator ${indicatorCode}`,
              source: `${grounding.provenance.document.title} (${grounding.provenance.document.sourceUrl})`,
              type: "curriculum" as const,
            },
          ]
        : []),
      ...exemplars.map((exemplar) => ({
        id: `exemplar-${indicatorCode}-${exemplar.revision}-${exemplar.code ?? exemplar.sortOrder}`,
        text: exemplar.code ? `NaCCA Exemplar ${exemplar.code}` : "NaCCA Exemplar",
        source: exemplar.sourceReference || `NaCCA curriculum revision ${exemplar.revision}`,
        type: "curriculum" as const,
      })),
    ],
    foundryContext: foundryContext || undefined,
    resolvedLocalContext,
  };
}
