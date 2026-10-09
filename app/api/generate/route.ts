import { NextRequest, NextResponse } from "next/server";
import type { GenerateRequest } from "@/types/curriculum";
import { generateLessonForIndicator } from "@/lib/generateLesson";
import { authorize } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await authorize(request);
    if (user instanceof NextResponse) return user;
    const body: GenerateRequest = await request.json();
    const response = await generateLessonForIndicator(body);
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
