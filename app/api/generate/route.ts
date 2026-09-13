import { NextRequest, NextResponse } from "next/server";
import { generateWithClaude, foundryRoot, CLAUDE_MODEL } from "@/lib/claude";
import {
  LESSON_SYSTEM_PROMPT,
  buildLessonUserPrompt,
} from "@/prompts/lesson";
import type { GenerateRequest, GenerateResponse, Citation, LessonHeader } from "@/types/curriculum";
import { getIndicatorGrounding } from "@/lib/curriculum/exemplars";
import { getGradeContext } from "@/lib/curriculum/catalog";
import { getLocalContextProvider, resolveLocalContext } from "@/lib/localContext";

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

    // Call Foundry IQ to retrieve grounded curriculum context
    const response = await fetch(
      `${foundryRoot(endpoint)}/openai/v1/chat/completions`,
      {
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
      }
    );

    if (!response.ok) {
      // Surface the reason instead of silently dropping grounding + citations.
      console.warn(
        `Foundry IQ grounding failed (${response.status}): ${(await response.text()).slice(0, 300)}`
      );
      return { context: null, citation: null };
    }

    const data = await response.json();
    const context = data.choices?.[0]?.message?.content || null;

    // Create citation metadata for Foundry IQ grounding
    const citation: Citation | null = context ? {
      id: `foundry-${indicatorCode}`,
      text: `NaCCA Indicator ${indicatorCode}`,
      source: "Azure Foundry IQ — NaCCA Curriculum Database",
      type: "foundry",
    } : null;

    return { context, citation };
  } catch (error) {
    // Foundry IQ unavailable - continue without grounding
    console.warn("Foundry IQ unavailable, proceeding without grounding:", error);
    return { context: null, citation: null };
  }
}

// Parse Claude's response into three sections
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

// Pull one "### Heading" block out of the AI-generated teacher notes, so it can
// be surfaced as its own structured header field instead of buried in prose.
function extractHeadingSection(markdown: string, heading: string): string | undefined {
  const pattern = new RegExp(`### ${heading}\\s*\\n([\\s\\S]*?)(?=\\n### |$)`, "i");
  const match = markdown.match(pattern);
  return match?.[1]?.trim() || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

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
      locationProfile,
      exampleHistory,
    } = body;

    // Validate required fields
    if (!indicatorCode || !indicatorText || !subject || !grade || !strand) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Resolve local-context examples (region-specific market/river/crop/etc.)
    // before the prompt is built - curriculum fields are never affected by this.
    const provider = getLocalContextProvider(locationProfile?.countryCode ?? "GH");
    const resolvedLocalContext = resolveLocalContext(
      provider,
      locationProfile,
      exampleHistory ?? {}
    );

    // Step 1: Try to get Foundry IQ grounding context with citation
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

    if (foundryContext) {
      console.log(`✅ Foundry IQ context retrieved for ${indicatorCode}`);
    } else {
      console.log(`ℹ️  Generating without Foundry IQ grounding for ${indicatorCode}`);
    }

    // Step 2: Build the user prompt with optional Foundry context
    const userPrompt = buildLessonUserPrompt({
      indicatorCode,
      indicatorText: grounding?.indicatorText ?? indicatorText,
      subject,
      grade,
      strand,
      subStrand: subStrand || strand,
      bloomsLevel: grounding?.bloomsLevel ?? bloomsLevel,
      duration: duration || "60",
      classSize: classSize || "35",
      difficultyLevel: difficultyLevel || "average",
      foundryContext: foundryContext || undefined,
      levelName,
      gradeName,
      typicalAgeMin,
      typicalAgeMax,
      exemplars,
      contentStandardCode: grounding?.contentStandardCode,
      contentStandardText: grounding?.contentStandardText,
      guidance: grounding?.guidance,
      localContext: resolvedLocalContext,
    });

    // Step 3: Generate with Claude
    const rawResponse = await generateWithClaude(
      LESSON_SYSTEM_PROMPT,
      userPrompt,
      3200
    );

    // Step 4: Parse the four sections
    const { lessonPlan, lessonNote, visualPrompts, studentReading } =
      parseLessonResponse(rawResponse);

    // Curriculum fields are always derived here, never re-generated by the AI -
    // school/teacher/week/day are the only teacher-supplied identity fields.
    const inferredContext = getGradeContext(grade);
    const header: LessonHeader = {
      schoolName,
      teacherName,
      weekEnding,
      day,
      curriculumSlug: curriculumSlug || "ghana-nacca-sbc",
      levelName: levelName ?? inferredContext?.levelName ?? "School",
      subject,
      gradeName: gradeName ?? inferredContext?.gradeName ?? grade,
      grade,
      classSize: classSize || "35",
      duration: duration || "60",
      strand,
      subStrand: subStrand || strand,
      contentStandardCode: grounding?.contentStandardCode,
      contentStandardText: grounding?.contentStandardText,
      indicatorCode,
      indicatorText: grounding?.indicatorText ?? indicatorText,
      performanceIndicator: extractHeadingSection(lessonNote, "Performance Indicator"),
      coreCompetencies: extractHeadingSection(lessonNote, "Core Competencies"),
      teachingLearningResources: extractHeadingSection(lessonNote, "Teaching and Learning Resources"),
      reference: grounding?.provenance.document
        ? `${grounding.provenance.document.title} (${grounding.provenance.document.sourceUrl})`
        : "Ghana NaCCA Standards-Based Curriculum (2019)",
      sourceNeedsReview: grounding?.provenance.ambiguityFlag === true || grounding?.provenance.reviewStatus === "needs-review",
    };

    const response: GenerateResponse = {
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
      citations: [
        ...(foundry.citation ? [foundry.citation] : []),
        ...(grounding?.provenance.document
          ? [{
              id: `curriculum-${indicatorCode}-${grounding.revision}`,
              text: `NaCCA Indicator ${indicatorCode}`,
              source: `${grounding.provenance.document.title} (${grounding.provenance.document.sourceUrl})`,
              type: "curriculum" as const,
            }]
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

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate lesson materials",
      },
      { status: 500 }
    );
  }
}