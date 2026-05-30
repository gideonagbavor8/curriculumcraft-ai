import { NextRequest, NextResponse } from "next/server";
import { generateWithClaude } from "@/lib/claude";
import {
  LESSON_SYSTEM_PROMPT,
  buildLessonUserPrompt,
} from "@/prompts/lesson";
import type { GenerateRequest, GenerateResponse } from "@/types/curriculum";

// Foundry IQ grounding - retrieves relevant NaCCA context
async function getFoundryContext(
  indicatorCode: string,
  indicatorText: string,
  subject: string
): Promise<string | null> {
  try {
    const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
    const apiKey = process.env.AZURE_FOUNDRY_API_KEY;

    if (!endpoint || !apiKey) return null;

    // Call Foundry IQ to retrieve grounded curriculum context
    const response = await fetch(`${endpoint}/inference/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a NaCCA Ghana curriculum expert. Provide concise, accurate context about the curriculum standard requested. Focus on what the standard requires, common teaching approaches, and key concepts. Keep response under 200 words.",
          },
          {
            role: "user",
            content: `Provide curriculum context for this NaCCA Ghana JHS indicator:
Subject: ${subject}
Code: ${indicatorCode}
Indicator: ${indicatorText}

What are the key concepts, teaching considerations, and expected student outcomes for this standard?`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    // Foundry IQ unavailable - continue without grounding
    console.warn("Foundry IQ unavailable, proceeding without grounding:", error);
    return null;
  }
}

// Parse Claude's response into three sections
function parseLessonResponse(text: string): {
  teacherNotes: string;
  visualPrompts: string;
  studentReading: string;
} {
  const teacherSplit = text.split("---VISUAL CONTENT PROMPTS---");
  const visualSplit = teacherSplit[1]?.split("---STUDENT READING MATERIAL---");

  const teacherNotes = teacherSplit[0]
    ?.replace("---TEACHER NOTES---", "")
    .trim() || "";
  const visualPrompts = visualSplit?.[0]?.trim() || "";
  const studentReading = visualSplit?.[1]?.trim() || "";

  if (!teacherNotes || !visualPrompts || !studentReading) {
    throw new Error("Failed to parse lesson sections from response");
  }

  return { teacherNotes, visualPrompts, studentReading };
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
    } = body;

    // Validate required fields
    if (!indicatorCode || !indicatorText || !subject || !grade || !strand) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Step 1: Try to get Foundry IQ grounding context
    const foundryContext = await getFoundryContext(
      indicatorCode,
      indicatorText,
      subject
    );

    if (foundryContext) {
      console.log(`✅ Foundry IQ context retrieved for ${indicatorCode}`);
    } else {
      console.log(`ℹ️  Generating without Foundry IQ grounding for ${indicatorCode}`);
    }

    // Step 2: Build the user prompt with optional Foundry context
    const userPrompt = buildLessonUserPrompt({
      indicatorCode,
      indicatorText,
      subject,
      grade,
      strand,
      subStrand: subStrand || strand,
      bloomsLevel,
      duration: duration || "60",
      classSize: classSize || "35",
      foundryContext: foundryContext || undefined,
    });

    // Step 3: Generate with Claude
    const rawResponse = await generateWithClaude(
      LESSON_SYSTEM_PROMPT,
      userPrompt,
      2000
    );

    // Step 4: Parse the three sections
    const { teacherNotes, visualPrompts, studentReading } =
      parseLessonResponse(rawResponse);

    const response: GenerateResponse = {
      teacherNotes,
      visualPrompts,
      studentReading,
      indicatorCode,
      subject,
      grade,
      strand,
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