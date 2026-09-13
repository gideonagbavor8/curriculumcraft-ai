import { NextRequest, NextResponse } from "next/server";
import { generateWithClaude } from "@/lib/claude";
import {
  ACTIVITY_SYSTEM_PROMPT,
  buildActivityUserPrompt,
} from "@/prompts/activity";
import type { ActivityResponse } from "@/types/curriculum";
import { getIndicatorGrounding } from "@/lib/curriculum/exemplars";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      indicatorCode,
      indicatorText,
      subject,
      grade,
      strand,
      subStrand,
      bloomsLevel,
      levelName,
      gradeName,
      typicalAgeMin,
      typicalAgeMax,
      curriculumSlug,
      exemplarRevision,
    } = body;

    if (!indicatorCode || !indicatorText || !subject || !grade) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const grounding = await getIndicatorGrounding({
      indicatorCode,
      subject,
      grade,
      strand,
      subStrand,
      curriculumSlug,
      revision: exemplarRevision,
    });
    const exemplars = grounding?.exemplars ?? [];

    const userPrompt = buildActivityUserPrompt({
      indicatorCode,
      indicatorText: grounding?.indicatorText ?? indicatorText,
      subject,
      grade,
      strand,
      bloomsLevel: grounding?.bloomsLevel ?? bloomsLevel,
      levelName,
      gradeName,
      typicalAgeMin,
      typicalAgeMax,
      exemplars,
      contentStandardCode: grounding?.contentStandardCode,
      contentStandardText: grounding?.contentStandardText,
      guidance: grounding?.guidance,
    });

    const rawResponse = await generateWithClaude(
      ACTIVITY_SYSTEM_PROMPT,
      userPrompt,
      2000
    );

    // Strip any markdown fences if Claude added them
    const cleaned = rawResponse
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const activityData: ActivityResponse = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: activityData });
  } catch (error) {
    console.error("Activity generate error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate activities",
      },
      { status: 500 }
    );
  }
}