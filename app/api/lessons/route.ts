import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { savedLessons } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - fetch all saved lessons (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const grade = searchParams.get("grade");

    let query = db
      .select()
      .from(savedLessons)
      .orderBy(desc(savedLessons.createdAt));

    const results = await query;

    // Filter in JS since drizzle conditional where chains are verbose
    const filtered = results.filter((lesson) => {
      if (subject && lesson.subject !== subject) return false;
      if (grade && lesson.grade !== grade) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
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
    const body = await request.json();

    const {
      indicatorCode,
      subject,
      grade,
      strand,
      subStrand,
      teacherNotes,
      visualPrompts,
      studentReading,
    } = body;

    // Validate all required fields
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
        indicatorCode,
        subject,
        grade,
        strand,
        subStrand: subStrand || strand,
        teacherNotes,
        visualPrompts,
        studentReading,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Lesson ID is required" },
        { status: 400 }
      );
    }

    await db.delete(savedLessons).where(eq(savedLessons.id, id));

    return NextResponse.json({ success: true, message: "Lesson deleted" });
  } catch (error) {
    console.error("Lessons DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}