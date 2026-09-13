import type { LessonHeader } from "@/types/curriculum";

export type LessonDocumentType = "plan" | "note";

export interface LessonExportData {
  header: LessonHeader;
  lessonPlan: string;
  lessonNote: string;
}

export const DOCUMENT_TITLES: Record<LessonDocumentType, string> = {
  plan: "Lesson Plan",
  note: "Lesson Note",
};

export function contentFor(lesson: LessonExportData, documentType: LessonDocumentType) {
  return documentType === "plan" ? lesson.lessonPlan : lesson.lessonNote;
}

// Strip the constrained markdown subset the AI is instructed to use down to
// plain text, for renderers (PDF/DOCX) that don't support markdown natively.
export function stripMarkdown(content: string): string {
  return content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[-*]\s+/gm, "\u2022 ");
}

export function lessonHeaderRows(header: LessonHeader): [string, string][] {
  const contentStandard = header.contentStandardCode
    ? `${header.contentStandardCode}: ${header.contentStandardText ?? ""}`
    : header.contentStandardText;

  const rows: [string, string | undefined][] = [
    ["School", header.schoolName],
    ["Teacher", header.teacherName],
    ["Week Ending", header.weekEnding],
    ["Day", header.day],
    ["Subject", header.subject],
    ["Class", `${header.gradeName} (${header.grade})`],
    ["Class Size", header.classSize],
    ["Duration", `${header.duration} minutes`],
    ["Strand", header.strand],
    ["Sub-Strand", header.subStrand],
    ["Content Standard", contentStandard],
    ["Indicator", `${header.indicatorCode}: ${header.indicatorText}`],
    ["Performance Indicator", header.performanceIndicator],
    ["Core Competencies", header.coreCompetencies],
    ["Teaching & Learning Resources", header.teachingLearningResources],
    ["Reference", header.reference],
  ];
  return rows.filter((row): row is [string, string] => Boolean(row[1]));
}
