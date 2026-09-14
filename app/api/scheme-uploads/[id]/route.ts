import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { schemeUploads, schemeSubjects, schemeWeeks, schemeWeekIndicators } from "@/db/schema";

// GET - review a parsed scheme: its subjects, each subject's weeks, their
// indicators, match status, and any parsing warnings/errors. Never returns
// the raw file bytes.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [upload] = await db
      .select({
        id: schemeUploads.id,
        fileName: schemeUploads.fileName,
        mimeType: schemeUploads.mimeType,
        gradeCode: schemeUploads.gradeCode,
        termLabel: schemeUploads.termLabel,
        uploadKind: schemeUploads.uploadKind,
        parseStatus: schemeUploads.parseStatus,
        parseWarnings: schemeUploads.parseWarnings,
        parseError: schemeUploads.parseError,
        uploadedAt: schemeUploads.uploadedAt,
      })
      .from(schemeUploads)
      .where(eq(schemeUploads.id, id))
      .limit(1);

    if (!upload) {
      return NextResponse.json({ success: false, error: "Scheme upload not found" }, { status: 404 });
    }

    const subjectRows = await db
      .select()
      .from(schemeSubjects)
      .where(eq(schemeSubjects.schemeUploadId, id))
      .orderBy(asc(schemeSubjects.sortOrder));
    const subjectIds = subjectRows.map((s) => s.id);

    const weeks = subjectIds.length
      ? await db
          .select()
          .from(schemeWeeks)
          .where(inArray(schemeWeeks.schemeSubjectId, subjectIds))
          .orderBy(asc(schemeWeeks.sortOrder))
      : [];
    const weekIds = weeks.map((w) => w.id);

    const indicatorsByWeek = new Map<string, (typeof schemeWeekIndicators.$inferSelect)[]>();
    if (weekIds.length > 0) {
      const allIndicators = await db
        .select()
        .from(schemeWeekIndicators)
        .where(inArray(schemeWeekIndicators.schemeWeekId, weekIds))
        .orderBy(asc(schemeWeekIndicators.sortOrder));
      for (const ind of allIndicators) {
        const list = indicatorsByWeek.get(ind.schemeWeekId) ?? [];
        list.push(ind);
        indicatorsByWeek.set(ind.schemeWeekId, list);
      }
    }

    const weeksBySubject = new Map<string, typeof weeks>();
    for (const week of weeks) {
      const list = weeksBySubject.get(week.schemeSubjectId) ?? [];
      list.push(week);
      weeksBySubject.set(week.schemeSubjectId, list);
    }

    const matchSummary = { exact: 0, fuzzy: 0, unmatched: 0 };
    for (const list of indicatorsByWeek.values()) {
      for (const ind of list) {
        if (ind.matchConfidence === "exact") matchSummary.exact++;
        else if (ind.matchConfidence === "fuzzy") matchSummary.fuzzy++;
        else matchSummary.unmatched++;
      }
    }

    const subjects = subjectRows.map((subject) => ({
      ...subject,
      weeks: (weeksBySubject.get(subject.id) ?? []).map((week) => ({
        ...week,
        indicators: indicatorsByWeek.get(week.id) ?? [],
      })),
    }));

    return NextResponse.json({
      success: true,
      data: { upload, subjects, matchSummary, warnings: upload.parseWarnings },
    });
  } catch (error) {
    console.error("Scheme upload review error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch scheme review" }, { status: 500 });
  }
}


// DELETE - remove an uploaded scheme and everything imported from it. The
// subjects/weeks/indicators cascade from the upload row (see db/schema.ts), so
// the teacher can prune superseded or mis-read uploads and keep the Scheme
// Library down to the schemes they actually teach from.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [deleted] = await db.delete(schemeUploads).where(eq(schemeUploads.id, id)).returning({ id: schemeUploads.id });
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Scheme upload not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { id: deleted.id } });
  } catch (error) {
    console.error("Scheme upload delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete scheme upload" }, { status: 500 });
  }
}
