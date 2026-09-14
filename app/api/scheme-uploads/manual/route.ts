import { NextRequest, NextResponse } from "next/server";
import { importManualSchemeWeek, type ManualSchemeWeekInput } from "@/lib/schemeImport/importScheme";

// POST - records one hand-typed week (the practical path for a photo/image
// upload, since OCR isn't implemented, or any teacher who just wants to type
// a week directly) into the Scheme Library, in the same shape a real
// file-upload would produce.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ManualSchemeWeekInput>;

    const { gradeCode, subjectSlug, subjectLabel, weekNumber, indicatorsText } = body;
    if (!gradeCode || !subjectSlug || !subjectLabel || !weekNumber || !indicatorsText) {
      return NextResponse.json(
        { success: false, error: "gradeCode, subjectSlug, subjectLabel, weekNumber and indicatorsText are required" },
        { status: 400 }
      );
    }

    const summary = await importManualSchemeWeek({
      gradeCode,
      termLabel: body.termLabel,
      subjectSlug,
      subjectLabel,
      weekNumber,
      strandText: body.strandText,
      subStrandText: body.subStrandText,
      contentStandardCode: body.contentStandardCode,
      contentStandardText: body.contentStandardText,
      indicatorsText,
      resourcesText: body.resourcesText,
    });

    return NextResponse.json({ success: true, data: summary }, { status: 201 });
  } catch (error) {
    console.error("Manual scheme week entry error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save manual week entry" },
      { status: 500 }
    );
  }
}
