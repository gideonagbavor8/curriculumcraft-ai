import type { LessonHeader, LessonPhase } from "@/types/curriculum";

export type LessonDocumentType = "plan" | "note";

export interface LessonExportData {
  header: LessonHeader;
  lessonPlan: string;
  lessonNote: string;
  /** Delivery phases for the single-table lesson-plan layout; absent on lessons generated before it existed. */
  phases?: LessonPhase[];
  /** Every indicator the lesson covers - a scheme week can assign several to one day. */
  indicators?: { code: string; text?: string }[];
}

/** Names a downloaded file after the lesson it holds, not just its indicator code. */
export function lessonFileName(lessons: LessonExportData[], documentType: LessonDocumentType, extension: string): string {
  const first = lessons[0];
  const subject = (first?.header.subject ?? "lesson").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  const scope = lessons.length > 1 ? `${lessons.length}-days` : (first?.header.day || first?.header.indicatorCode || "lesson");
  return `${documentType}-${subject}-${String(scope).replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.${extension}`;
}

export const DOCUMENT_TITLES: Record<LessonDocumentType, string> = {
  plan: "Lesson Plan",
  note: "Lesson Note",
};

export function contentFor(lesson: LessonExportData, documentType: LessonDocumentType) {
  return documentType === "plan" ? lesson.lessonPlan : lesson.lessonNote;
}
