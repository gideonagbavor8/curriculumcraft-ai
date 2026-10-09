import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { savedLessons } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { authorize } from "@/lib/auth";
import { isUuid } from "@/lib/authSecurity";

// GET - fetch all saved lessons (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const user = await authorize(request);
    if (user instanceof NextResponse) return user;
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const grade = searchParams.get("grade");
    const id = searchParams.get("id");
    if (id && !isUuid(id)) return NextResponse.json({ success: false, error: "Invalid lesson ID" }, { status: 400 });

    const query = db
      .select()
      .from(savedLessons)
      .where(and(eq(savedLessons.userId, user.id), id ? eq(savedLessons.id, id) : undefined,
        subject ? eq(savedLessons.subject, subject) : undefined,
        grade ? eq(savedLessons.grade, grade) : undefined))
      .orderBy(desc(savedLessons.createdAt));

    const results = await query;

    if (id && !results.length) return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Lessons GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch saved lessons" },
      { status: 500 }
    );
  }
}

// POST - save a new lesson
export async function POST(request: NextRequest) {
  try {
    const user = await authorize(request);
    if (user instanceof NextResponse) return user;
    const raw = await request.text();
    if (raw.length > 1_000_000) return NextResponse.json({ success: false, error: "Lesson is too large" }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "Invalid lesson" }, { status: 400 });
    }

    const {
      indicatorCode,
      subject,
      grade,
      curriculumSlug,
      levelCode,
      strand,
      subStrand,
      lessonPlan,
      teacherNotes,
      visualPrompts,
      studentReading,
      lessonHeader,
    } = body;

    const textFields = { indicatorCode, subject, grade, strand, subStrand, curriculumSlug, levelCode, lessonPlan, teacherNotes, visualPrompts, studentReading };
    if (Object.values(textFields).some((value) => value != null && (typeof value !== "string" || value.length > 200_000))
      || (lessonHeader != null && (typeof lessonHeader !== "object" || Array.isArray(lessonHeader)))) {
      return NextResponse.json({ success: false, error: "Invalid lesson fields" }, { status: 400 });
    }

    const missingFields = [];
    if (!indicatorCode) missingFields.push("indicatorCode");
    if (!subject) missingFields.push("subject");
    if (!grade) missingFields.push("grade");
    if (!strand) missingFields.push("strand");
    if (!teacherNotes) missingFields.push("teacherNotes");
    if (!visualPrompts) missingFields.push("visualPrompts");
    if (!studentReading) missingFields.push("studentReading");

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const [saved] = await db
      .insert(savedLessons)
      .values({
        userId: user.id,
        indicatorCode,
        subject,
        grade,
        curriculumSlug: curriculumSlug || "ghana-nacca-sbc",
        levelCode: levelCode || (grade.startsWith("P") ? "PRIMARY" : "JHS"),
        strand,
        subStrand: subStrand || strand,
        teacherNotes,
        visualPrompts,
        studentReading,
        lessonPlan: lessonPlan ?? null,
        lessonHeader: lessonHeader ?? null,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: saved },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lessons POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save lesson" },
      { status: 500 }
    );
  }
}

// DELETE - remove a saved lesson by id
export async function DELETE(request: NextRequest) {
  try {
    const user = await authorize(request);
    if (user instanceof NextResponse) return user;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { success: false, error: "Lesson ID is required" },
        { status: 400 }
      );
    }

    const [deleted] = await db.delete(savedLessons)
      .where(and(eq(savedLessons.id, id), eq(savedLessons.userId, user.id))).returning({ id: savedLessons.id });
    if (!deleted) return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Lesson deleted" });
  } catch (error) {
    console.error("Lessons DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}