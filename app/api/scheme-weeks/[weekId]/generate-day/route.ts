import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schemeWeeks, schemeSubjects, schemeUploads, schemeWeekIndicators } from "@/db/schema";
import { generateLessonForIndicator } from "@/lib/generateLesson";
import { distributeIndicatorsAcrossDays } from "@/lib/schemeImport/distributeDays";
import { displayStrandLabel } from "@/lib/schemeImport/headings";
import type { GenerateRequest, GenerateResponse } from "@/types/curriculum";

interface GenerateDayRequestBody {
  dayIndex: number;
  totalDays: number;
  duration?: GenerateRequest["duration"];
  classSize?: GenerateRequest["classSize"];
  difficultyLevel?: GenerateRequest["difficultyLevel"];
  schoolName?: string;
  teacherName?: string;
  weekEnding?: string;
  /** The calendar date this day's lesson is taught, shown as the lesson table's Date. */
  lessonDate?: string;
  day?: string;
  locationProfile?: GenerateRequest["locationProfile"];
  exampleHistory?: GenerateRequest["exampleHistory"];
}

// POST - generates ONE day's lesson from a scheme week, using the existing
// lesson-generation system (the scheme decides WHAT/which indicators; this
// just picks which indicator(s) belong to `dayIndex` out of `totalDays`,
// then delegates to the same generateLessonForIndicator() /api/generate
// uses). Never modifies the scheme - purely reads it.
export async function POST(request: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  try {
    const { weekId } = await params;
    const body: GenerateDayRequestBody = await request.json();
    const { dayIndex, totalDays } = body;

    if (typeof dayIndex !== "number" || typeof totalDays !== "number" || totalDays < 1) {
      return NextResponse.json({ success: false, error: "dayIndex and totalDays are required" }, { status: 400 });
    }

    const [week] = await db.select().from(schemeWeeks).where(eq(schemeWeeks.id, weekId)).limit(1);
    if (!week) {
      return NextResponse.json({ success: false, error: "Scheme week not found" }, { status: 404 });
    }
    if (week.isNonTeachingWeek) {
      return NextResponse.json(
        { success: false, error: `Week ${week.weekNumber} is "${week.nonTeachingLabel}" - not a teaching week, nothing to generate.` },
        { status: 400 }
      );
    }

    const [subject] = await db.select().from(schemeSubjects).where(eq(schemeSubjects.id, week.schemeSubjectId)).limit(1);
    if (!subject) {
      return NextResponse.json({ success: false, error: "Scheme subject not found" }, { status: 404 });
    }
    const [upload] = await db.select().from(schemeUploads).where(eq(schemeUploads.id, subject.schemeUploadId)).limit(1);
    if (!upload) {
      return NextResponse.json({ success: false, error: "Scheme upload not found" }, { status: 404 });
    }

    const indicators = await db
      .select()
      .from(schemeWeekIndicators)
      .where(eq(schemeWeekIndicators.schemeWeekId, weekId))
      .orderBy(asc(schemeWeekIndicators.sortOrder));

    const plan = distributeIndicatorsAcrossDays(indicators, totalDays);
    const today = plan[dayIndex];
    if (!today) {
      return NextResponse.json({ success: false, error: `dayIndex ${dayIndex} is out of range for ${totalDays} teaching days` }, { status: 400 });
    }
    if (today.indicators.length === 0) {
      return NextResponse.json({ success: false, error: "This week has no indicators to generate from." }, { status: 400 });
    }

    // Multiple indicators assigned to one day are combined into a single
    // generation call - the primary indicator's code drives grounding/
    // exemplar lookup, and every assigned indicator's own (uploaded) text is
    // preserved and concatenated so the lesson covers all of them.
    const primary = today.indicators[0];
    const indicatorText = today.indicators
      .map((ind) => `${ind.indicatorCode}: ${ind.indicatorText ?? ""}`.trim())
      .join("; ");

    const generateRequest: GenerateRequest = {
      indicatorCode: primary.indicatorCode,
      indicatorText,
      subject: subject.subjectLabel,
      grade: upload.gradeCode,
      // The scheme stores headings as printed ("STRAND 1: ORAL LANGUAGE");
      // the lesson names the strand the way a teacher says it.
      strand: week.strandText ? displayStrandLabel(week.strandText) : "General",
      subStrand: week.subStrandText
        ? displayStrandLabel(week.subStrandText)
        : week.strandText
          ? displayStrandLabel(week.strandText)
          : "General",
      contentStandardCode: week.contentStandardCode ?? undefined,
      contentStandardText: week.contentStandardText ?? undefined,
      duration: body.duration ?? "60",
      classSize: body.classSize ?? "35",
      difficultyLevel: body.difficultyLevel ?? "average",
      schoolName: body.schoolName,
      teacherName: body.teacherName,
      weekEnding: body.weekEnding,
      lessonDate: body.lessonDate,
      day: body.day,
      locationProfile: body.locationProfile,
      exampleHistory: body.exampleHistory,
    };

    const response: GenerateResponse = await generateLessonForIndicator(generateRequest);

    return NextResponse.json({
      success: true,
      data: {
        ...response,
        schemeContext: {
          weekNumber: week.weekNumber,
          dayIndex,
          totalDays,
          isPracticeDay: today.isPracticeDay,
          indicatorCodes: today.indicators.map((ind) => ind.indicatorCode),
          // Every indicator assigned to this day, so the lesson table's
          // Indicators cell lists them all rather than only the primary one
          // that drove grounding.
          indicators: today.indicators.map((ind) => ({
            code: ind.indicatorCode,
            text: ind.indicatorText ?? undefined,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Scheme week generate-day error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate lesson for this day" },
      { status: 500 }
    );
  }
}
