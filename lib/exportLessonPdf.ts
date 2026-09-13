import { lessonHeaderRows, stripMarkdown, contentFor, DOCUMENT_TITLES, type LessonExportData, type LessonDocumentType } from "./lessonExport";

// Shared PDF layout used by both the live lesson-builder result and saved
// lessons, so exports are consistent regardless of where they're triggered.
// Produces ONE focused document - either the concise Lesson Plan or the fully
// expanded Lesson Note - matching Ghana school documentation practice where
// these are two distinct documents, not one bundle.
export async function exportLessonPdf(lesson: LessonExportData, documentType: LessonDocumentType) {
  const jspdfModule = await import("jspdf");
  const JsPDF = jspdfModule.jsPDF ?? jspdfModule.default;
  const pdf = new JsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const maxW = pageW - margin * 2;
  let y = 20;

  const checkPage = (needed = 10) => {
    if (y + needed > 275) {
      pdf.addPage();
      y = 20;
    }
  };

  const title = DOCUMENT_TITLES[documentType];

  // Header bar
  pdf.setFillColor(22, 101, 52);
  pdf.rect(0, 0, pageW, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(`CurriculumCraft AI \u2014 ${title}`, margin, 12);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `NaCCA Standards-Based Curriculum - Ghana ${lesson.header.levelName}`,
    margin,
    20
  );
  pdf.text(new Date().toLocaleDateString("en-GB"), pageW - margin, 20, { align: "right" });

  y = 36;

  if (lesson.header.sourceNeedsReview) {
    checkPage(12);
    pdf.setFillColor(254, 243, 199);
    pdf.rect(margin, y, maxW, 10, "F");
    pdf.setTextColor(146, 64, 14);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      "\u26a0 Source text flagged for review - verify against the official NaCCA document before use.",
      margin + 3,
      y + 6.5
    );
    y += 14;
  }

  // GES/NaCCA lesson-plan header table
  const rows = lessonHeaderRows(lesson.header);
  pdf.setFontSize(9);
  const labelW = 45;
  for (const [label, value] of rows) {
    const lines = pdf.splitTextToSize(value, maxW - labelW);
    checkPage(lines.length * 5 + 2);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(22, 101, 52);
    pdf.text(label, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 30, 30);
    pdf.text(lines, margin + labelW, y);
    y += lines.length * 5 + 2;
  }
  y += 4;
  checkPage(4);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  checkPage(20);
  pdf.setFillColor(21, 128, 61);
  pdf.rect(margin, y, maxW, 8, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, margin + 3, y + 5.5);
  y += 11;
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const bodyLines = pdf.splitTextToSize(stripMarkdown(contentFor(lesson, documentType)), maxW);
  for (const line of bodyLines) {
    checkPage(6);
    pdf.text(line, margin, y);
    y += 5.5;
  }

  const totalPages = (pdf.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`CurriculumCraft AI  \u00b7  Page ${i} of ${totalPages}`, pageW / 2, 291, { align: "center" });
  }

  pdf.save(`${documentType}-${lesson.header.indicatorCode}-${lesson.header.subject}.pdf`);
}
