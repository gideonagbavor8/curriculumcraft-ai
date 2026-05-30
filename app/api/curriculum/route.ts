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

    // Fetch strands for this subject
    const subjectStrands = await db
      .select()
      .from(strands)
      .where(eq(strands.subjectId, subject.id));

    // For each strand, fetch sub-strands and indicators
    const strandsWithData = await Promise.all(
      subjectStrands.map(async (strand) => {
        const strandSubStrands = await db
          .select()
          .from(subStrands)
          .where(eq(subStrands.strandId, strand.id));

        const subStrandsWithIndicators = await Promise.all(
          strandSubStrands.map(async (subStrand) => {
            let indicatorQuery = db
              .select()
              .from(indicators)
              .where(eq(indicators.subStrandId, subStrand.id));

            const strandIndicators = await indicatorQuery;

            // Filter by grade if provided
            const filtered = grade
              ? strandIndicators.filter((ind) => ind.grade === grade)
              : strandIndicators;

            return {
              name: subStrand.name,
              indicators: filtered.map((ind) => ({
                code: ind.code,
                text: ind.text,
                bloomsLevel: ind.bloomsLevel,
                grade: ind.grade,
              })),
            };
          })
        );

        // Only return sub-strands that have indicators
        const nonEmpty = subStrandsWithIndicators.filter(
          (ss) => ss.indicators.length > 0
        );

        return {
          name: strand.name,
          subStrands: nonEmpty,
        };
      })
    );

    // Only return strands that have sub-strands with indicators
    const nonEmptyStrands = strandsWithData.filter(
      (s) => s.subStrands.length > 0
    );

    return NextResponse.json({
      success: true,
      data: {
        subject: subject.name,
        grade: grade || "all",
        strands: nonEmptyStrands,
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