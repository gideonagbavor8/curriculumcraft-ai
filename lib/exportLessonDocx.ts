import { lessonHeaderRows, stripMarkdown, contentFor, DOCUMENT_TITLES, type LessonExportData, type LessonDocumentType } from "./lessonExport";

// Mirrors exportLessonPdf's structure (header table + one focused section) so
// the Word document a teacher downloads matches the PDF and on-screen layout.
export async function exportLessonDocx(lesson: LessonExportData, documentType: LessonDocumentType) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    BorderStyle,
  } = await import("docx");

  const headerRows = lessonHeaderRows(lesson.header).map(
    ([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph(value)],
          }),
        ],
      })
  );

  const title = DOCUMENT_TITLES[documentType];
  const sectionParagraphs = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }),
    ...stripMarkdown(contentFor(lesson, documentType))
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => new Paragraph(line)),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `CurriculumCraft AI \u2014 ${title}`, bold: true, size: 32, color: "166534" })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `NaCCA Standards-Based Curriculum \u2014 Ghana ${lesson.header.levelName}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          ...(lesson.header.sourceNeedsReview
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "\u26a0 Source text flagged for review - verify against the official NaCCA document before use.",
                      bold: true,
                      color: "92400E",
                    }),
                  ],
                  spacing: { after: 200 },
                }),
              ]
            : []),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
            },
            rows: headerRows,
          }),
          ...sectionParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${documentType}-${lesson.header.indicatorCode}-${lesson.header.subject}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
