import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects, strands, subStrands, indicators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectSlug = searchParams.get("subject");
    const grade = searchParams.get("grade");

    // Fetch all subjects if no filter
    if (!subjectSlug) {
      const allSubjects = await db.select().from(subjects);
      return NextResponse.json({ success: true, data: allSubjects });
    }

    // Find the subject
    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.slug, subjectSlug));

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "Subject not found" },
        { status: 404 }
      );
    }

    // Single query — fetch everything at once using joins
    const rows = await db
      .select({
        strandId: strands.id,
        strandName: strands.name,
        subStrandId: subStrands.id,
        subStrandName: subStrands.name,
        indicatorCode: indicators.code,
        indicatorText: indicators.text,
        indicatorBlooms: indicators.bloomsLevel,
        indicatorGrade: indicators.grade,
      })
      .from(strands)
      .innerJoin(subStrands, eq(subStrands.strandId, strands.id))
      .innerJoin(indicators, eq(indicators.subStrandId, subStrands.id))
      .where(
        grade
          ? eq(strands.subjectId, subject.id) && eq(indicators.grade, grade) as never
          : eq(strands.subjectId, subject.id)
      );

    // Filter by grade in JS — more reliable than complex SQL
    const filtered = grade
      ? rows.filter((r) => r.indicatorGrade === grade)
      : rows;

    // Group into nested structure
    const strandsMap = new Map<string, {
      name: string;
      subStrands: Map<string, {
        name: string;
        indicators: { code: string; text: string; bloomsLevel: string; grade: string }[];
      }>;
    }>();

    for (const row of filtered) {
      if (!strandsMap.has(row.strandId)) {
        strandsMap.set(row.strandId, {
          name: row.strandName,
          subStrands: new Map(),
        });
      }
      const strandEntry = strandsMap.get(row.strandId)!;

      if (!strandEntry.subStrands.has(row.subStrandId)) {
        strandEntry.subStrands.set(row.subStrandId, {
          name: row.subStrandName,
          indicators: [],
        });
      }
      strandEntry.subStrands.get(row.subStrandId)!.indicators.push({
        code: row.indicatorCode,
        text: row.indicatorText,
        bloomsLevel: row.indicatorBlooms,
        grade: row.indicatorGrade,
      });
    }

    // Convert Maps to arrays
    const result = Array.from(strandsMap.values()).map((strand) => ({
      name: strand.name,
      subStrands: Array.from(strand.subStrands.values()),
    }));

    return NextResponse.json({
      success: true,
      data: {
        subject: subject.name,
        grade: grade || "all",
        strands: result,
      },
    });
  } catch (error) {
    console.error("Curriculum API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch curriculum data" },
      { status: 500 }
    );
  }
}