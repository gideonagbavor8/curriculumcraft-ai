import {
  contentFor,
  DOCUMENT_TITLES,
  lessonFileName,
  type LessonExportData,
  type LessonDocumentType,
} from "./lessonExport";
import { buildLessonPlanTable, cellRuns } from "./lessonPlanTable";
import { extractLessonPhases } from "./lessonPhases";
import { parseMarkdownBlocks, splitBlocksIntoSections, type InlineRun, type MarkdownBlock } from "./markdownBlocks";

/**
 * Writes the lesson as the single GES/NaCCA lesson-plan table a teacher
 * submits and teaches from - the same table shown on screen and in the PDF,
 * built from lib/lessonPlanTable.ts so the three can't drift. Several days can
 * go in one document, each starting on its own page.
 */
export async function exportLessonDocx(
  lessons: LessonExportData | LessonExportData[],
  documentType: LessonDocumentType
) {
  const all = Array.isArray(lessons) ? lessons : [lessons];
  if (all.length === 0) return;

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
    AlignmentType,
  } = await import("docx");

  const textRunsFor = (runs: InlineRun[], forceBold = false) =>
    runs.map((run) => new TextRun({ text: run.text, bold: forceBold || run.kind === "bold", italics: run.kind === "italic" }));

  const headingLevelFor = (level: 1 | 2 | 3) =>
    level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;

  // Converts the AI's constrained markdown into real Word structure -
  // headings, bold/italic runs, and bullet/numbered lists - instead of
  // leaking raw #/**/* characters as plain text.
  const blocksToParagraphs = (blocks: MarkdownBlock[]) =>
    blocks.map((block) => {
      switch (block.type) {
        case "blank":
          return new Paragraph({ text: "" });
        case "rule":
          return new Paragraph({ text: "", border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } } });
        case "heading":
          return new Paragraph({
            heading: headingLevelFor(block.level),
            spacing: { before: 200, after: 100 },
            children: textRunsFor(block.runs, true),
          });
        case "bullet":
          return new Paragraph({ bullet: { level: 0 }, children: textRunsFor(block.runs) });
        case "numbered":
          return new Paragraph({
            indent: { left: 360 },
            children: [new TextRun({ text: `${block.marker} `, bold: true }), ...textRunsFor(block.runs)],
          });
        case "paragraph":
          return new Paragraph({ spacing: { after: 80 }, children: textRunsFor(block.runs) });
      }
    });

  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
    left: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
    right: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
    insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
  };

  /** A cell's text as Word runs, carrying its markdown emphasis rather than printing the markers. */
  const cellTextRuns = (text: string) =>
    cellRuns(text).map(
      (run) => new TextRun({ text: run.text, size: 19, bold: run.kind === "bold", italics: run.kind === "italic" })
    );

  /** A labelled cell: the field name above its value, as on the printed form. */
  const labelledCell = (label: string, value: string, columnSpan: number) =>
    new TableCell({
      columnSpan,
      children: [
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 14, color: "666666" })],
        }),
        // Each line's **bold** / *italic* becomes real Word emphasis instead
        // of literal asterisks in the printed plan.
        ...value.split("\n").map((line) => new Paragraph({ children: cellTextRuns(line) })),
      ],
    });

  // Twelve columns so every band divides into whole spans: four cells per
  // identity line, three per curriculum/phase line, two per standards line.
  const COLUMNS = 12;

  const lessonPlanTableFor = (lesson: LessonExportData) => {
    const model = buildLessonPlanTable(
      lesson.header,
      lesson.phases ?? extractLessonPhases(lesson.lessonPlan),
      lesson.indicators
    );
    const rows: InstanceType<typeof TableRow>[] = [];

    rows.push(
      new TableRow({
        children: model.identity.cells.slice(0, 4).map((cell) => labelledCell(cell.label, cell.value, COLUMNS / 4)),
      })
    );
    rows.push(
      new TableRow({
        children: model.identity.cells.slice(4).map((cell) => labelledCell(cell.label, cell.value, COLUMNS / 4)),
      })
    );
    rows.push(
      new TableRow({
        children: model.curriculum.cells.map((cell) => labelledCell(cell.label, cell.value, COLUMNS / 3)),
      })
    );
    rows.push(new TableRow({ children: [labelledCell(model.keywords.label, model.keywords.value, COLUMNS)] }));
    rows.push(
      new TableRow({
        children: model.standards.cells.map((cell) => labelledCell(cell.label, cell.value, COLUMNS / 2)),
      })
    );

    rows.push(
      new TableRow({
        tableHeader: true,
        children: ["Time / Phases", "Learner Activity", "TLM / TLRs"].map(
          (label) =>
            new TableCell({
              columnSpan: COLUMNS / 3,
              shading: { fill: "F3F4F6" },
              children: [new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 16 })] })],
            })
        ),
      })
    );

    for (const phase of model.phases) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: COLUMNS / 3,
              children: [
                new Paragraph({ children: [new TextRun({ text: phase.phase, bold: true, size: 19 })] }),
                new Paragraph({ children: [new TextRun({ text: phase.time, size: 17, color: "666666" })] }),
              ],
            }),
            new TableCell({
              columnSpan: COLUMNS / 3,
              children: [new Paragraph({ children: cellTextRuns(phase.learnerActivity) })],
            }),
            new TableCell({
              columnSpan: COLUMNS / 3,
              children: [new Paragraph({ children: cellTextRuns(phase.resources) })],
            }),
          ],
        })
      );
    }

    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders, rows });
  };

  const title = DOCUMENT_TITLES[documentType];

  // The Lesson Note is the expanded script; it follows the table so the
  // teacher has both the form and the detail behind it in one document.
  const noteSectionsFor = (lesson: LessonExportData) => {
    if (documentType !== "note") return [];
    const sections = splitBlocksIntoSections(parseMarkdownBlocks(contentFor(lesson, documentType)));
    if (sections.length === 0) return [];
    return [
      new Paragraph({ text: "Lesson Note", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: sections.map(
          (section) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: section.heading, bold: true })] })],
                }),
                new TableCell({
                  width: { size: 75, type: WidthType.PERCENTAGE },
                  children: section.blocks.length > 0 ? blocksToParagraphs(section.blocks) : [new Paragraph({ text: "" })],
                }),
              ],
            })
        ),
      }),
    ];
  };

  const doc = new Document({
    sections: all.map((lesson, index) => ({
      properties: index > 0 ? { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } } : undefined,
      children: [
        new Paragraph({
          children: [new TextRun({ text: `CurriculumCraft AI — ${title}`, bold: true, size: 28, color: "166534" })],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: [
                `NaCCA Standards-Based Curriculum — Ghana ${lesson.header.levelName}`,
                lesson.header.day,
              ]
                .filter(Boolean)
                .join(" · "),
              size: 18,
            }),
          ],
        }),
        ...(lesson.header.sourceNeedsReview
          ? [
              new Paragraph({
                spacing: { after: 160 },
                children: [
                  new TextRun({
                    text: "⚠ Source text flagged for review - verify against the official NaCCA document before use.",
                    bold: true,
                    color: "92400E",
                  }),
                ],
              }),
            ]
          : []),
        lessonPlanTableFor(lesson),
        ...noteSectionsFor(lesson),
        ...(index < all.length - 1
          ? [new Paragraph({ text: "", alignment: AlignmentType.LEFT, pageBreakBefore: false })]
          : []),
      ],
    })),
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = lessonFileName(all, documentType, "docx");
  link.click();
  URL.revokeObjectURL(url);
}
