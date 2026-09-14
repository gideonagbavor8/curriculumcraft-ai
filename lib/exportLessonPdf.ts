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

type FontStyle = "normal" | "bold" | "italic" | "bolditalic";

function fontStyleFor(bold: boolean, italic: boolean): FontStyle {
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

function toStyledWords(runs: InlineRun[], forceBold: boolean) {
  const words: { text: string; bold: boolean; italic: boolean }[] = [];
  for (const run of runs) {
    const bold = forceBold || run.kind === "bold";
    const italic = run.kind === "italic";
    for (const word of run.text.split(/\s+/).filter(Boolean)) {
      words.push({ text: word, bold, italic });
    }
  }
  return words;
}

/** One cell of the lesson-plan grid, sized in grid columns rather than millimetres. */
interface GridCell {
  label?: string;
  value: string;
  span: number;
  bold?: boolean;
  /** Small grey line under the value - used for a phase's duration. */
  subValue?: string;
}

// Shared PDF layout used by the lesson builder, saved lessons, and weekly
// generation from a Scheme of Learning. Produces ONE focused document - either
// the concise Lesson Plan or the fully expanded Lesson Note - matching Ghana
// school documentation practice where these are two distinct documents.
//
// Split from the actual browser download trigger (see exportLessonPdf below)
// so the generated document can be inspected directly (e.g. in tests) without
// a browser environment.
export async function buildLessonPdfDocument(
  lessons: LessonExportData | LessonExportData[],
  documentType: LessonDocumentType
) {
  const all = Array.isArray(lessons) ? lessons : [lessons];
  const jspdfModule = await import("jspdf");
  const JsPDF = jspdfModule.jsPDF ?? jspdfModule.default;
  // Landscape: the lesson-plan table is eight fields wide across its identity
  // row and three wide across its phases, which portrait A4 cannot hold
  // without shrinking the Learner Activity column past readability.
  const pdf = new JsPDF("l", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const maxW = pageW - margin * 2;
  const bottomLimit = pageH - 15;
  let y = 20;

  const checkPage = (needed = 10) => {
    if (y + needed > bottomLimit) {
      pdf.addPage();
      y = 20;
    }
  };

  const lineHeightFor = (fontSize: number) => fontSize * 0.5 + 1.8;

  // Renders one line-wrapped, mixed bold/italic run of text starting at
  // textX, wrapping continuation lines back to the same textX (hanging
  // indent), and advances the shared `y` cursor.
  const renderRuns = (
    runs: InlineRun[],
    opts: { textX: number; rightEdge: number; fontSize: number; forceBold?: boolean; color?: [number, number, number] }
  ) => {
    const words = toStyledWords(runs, Boolean(opts.forceBold));
    if (words.length === 0) return;
    const lineHeight = lineHeightFor(opts.fontSize);
    const [r, g, b] = opts.color ?? [30, 30, 30];
    pdf.setFontSize(opts.fontSize);
    pdf.setTextColor(r, g, b);
    checkPage(lineHeight);
    let x = opts.textX;
    let lineStart = true;
    for (const word of words) {
      pdf.setFont("helvetica", fontStyleFor(word.bold, word.italic));
      const wordWidth = pdf.getTextWidth(word.text);
      if (!lineStart && x + wordWidth > opts.rightEdge) {
        y += lineHeight;
        checkPage(lineHeight);
        x = opts.textX;
        lineStart = true;
      }
      pdf.text(word.text, x, y);
      x += wordWidth + pdf.getTextWidth(" ");
      lineStart = false;
    }
    y += lineHeight;
  };

  const renderBlocks = (blocks: MarkdownBlock[], colX: number, colWidth: number, baseFontSize: number) => {
    const rightEdge = colX + colWidth;
    for (const block of blocks) {
      switch (block.type) {
        case "blank":
          y += lineHeightFor(baseFontSize) * 0.35;
          break;
        case "rule":
          checkPage(4);
          pdf.setDrawColor(210, 210, 210);
          pdf.line(colX, y, rightEdge, y);
          y += 4;
          break;
        case "heading": {
          const sizeByLevel = { 1: baseFontSize + 2.5, 2: baseFontSize + 1.5, 3: baseFontSize + 0.5 };
          checkPage(lineHeightFor(sizeByLevel[block.level]) + 2);
          y += 2;
          renderRuns(block.runs, {
            textX: colX,
            rightEdge,
            fontSize: sizeByLevel[block.level],
            forceBold: true,
            color: [22, 101, 52],
          });
          break;
        }
        case "bullet": {
          checkPage(lineHeightFor(baseFontSize));
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(baseFontSize);
          pdf.setTextColor(30, 30, 30);
          pdf.text("•", colX, y);
          renderRuns(block.runs, { textX: colX + 4.5, rightEdge, fontSize: baseFontSize });
          break;
        }
        case "numbered": {
          checkPage(lineHeightFor(baseFontSize));
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(baseFontSize);
          pdf.setTextColor(22, 101, 52);
          pdf.text(block.marker, colX, y);
          const markerWidth = pdf.getTextWidth(block.marker) + 2;
          renderRuns(block.runs, { textX: colX + markerWidth, rightEdge, fontSize: baseFontSize });
          break;
        }
        case "paragraph":
          renderRuns(block.runs, { textX: colX, rightEdge, fontSize: baseFontSize });
          break;
      }
    }
  };

  // Twelve grid columns: the identity row's fields sit four to a line, the
  // curriculum and phase rows three, and the standards row two - all landing
  // on the same vertical rules so the table reads as one grid.
  const GRID_COLUMNS = 12;
  const columnWidth = maxW / GRID_COLUMNS;
  const CELL_PADDING = 2;
  const VALUE_SIZE = 8;
  const LABEL_SIZE = 6;

  const VALUE_LINE_HEIGHT = VALUE_SIZE * 0.5 + 1.2;

  /**
   * Lays a cell's text out into lines of word-level runs, so **bold** inside a
   * cell is drawn as bold rather than printed with its asterisks. jsPDF has no
   * rich text, so wrapping is measured word by word against the cell's width.
   */
  const wrapCell = (cell: GridCell, innerWidth: number) => {
    const words: { text: string; bold: boolean; italic: boolean }[] = [];
    for (const run of cellRuns(cell.value || "—")) {
      const bold = cell.bold || run.kind === "bold";
      const italic = run.kind === "italic";
      for (const word of run.text.split(/\s+/).filter(Boolean)) words.push({ text: word, bold, italic });
    }

    const lines: (typeof words)[] = [];
    let line: typeof words = [];
    let lineWidth = 0;
    pdf.setFontSize(VALUE_SIZE);
    for (const word of words) {
      pdf.setFont("helvetica", fontStyleFor(word.bold, word.italic));
      const wordWidth = pdf.getTextWidth(word.text);
      const spaceWidth = line.length > 0 ? pdf.getTextWidth(" ") : 0;
      if (line.length > 0 && lineWidth + spaceWidth + wordWidth > innerWidth) {
        lines.push(line);
        line = [];
        lineWidth = 0;
      }
      line.push(word);
      lineWidth += (line.length > 1 ? spaceWidth : 0) + wordWidth;
    }
    if (line.length > 0) lines.push(line);
    return lines.length > 0 ? lines : [[]];
  };

  /** Height one row needs, measured from every cell's wrapped text. */
  const measureRow = (cells: GridCell[]): number => {
    let tallest = 0;
    for (const cell of cells) {
      const innerWidth = cell.span * columnWidth - CELL_PADDING * 2;
      const lines = wrapCell(cell, innerWidth);
      const labelHeight = cell.label ? LABEL_SIZE * 0.5 + 1.4 : 0;
      const subHeight = cell.subValue ? LABEL_SIZE * 0.5 + 1.2 : 0;
      const height = labelHeight + lines.length * VALUE_LINE_HEIGHT + subHeight + CELL_PADDING * 2;
      tallest = Math.max(tallest, height);
    }
    return Math.max(tallest, 9);
  };

  /** Draws one row of the grid, boxing each cell and printing its label above its value. */
  const drawRow = (cells: GridCell[], options: { fill?: [number, number, number] } = {}) => {
    const rowHeight = measureRow(cells);
    checkPage(rowHeight + 2);
    const rowTop = y;
    let x = margin;

    for (const cell of cells) {
      const cellWidth = cell.span * columnWidth;
      if (options.fill) {
        pdf.setFillColor(...options.fill);
        pdf.rect(x, rowTop, cellWidth, rowHeight, "F");
      }
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.2);
      pdf.rect(x, rowTop, cellWidth, rowHeight);

      let textY = rowTop + CELL_PADDING + 2;
      if (cell.label) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(LABEL_SIZE);
        pdf.setTextColor(110, 110, 110);
        pdf.text(cell.label.toUpperCase(), x + CELL_PADDING, textY);
        textY += LABEL_SIZE * 0.5 + 1.4;
      }

      pdf.setFontSize(VALUE_SIZE);
      pdf.setTextColor(25, 25, 25);
      for (const line of wrapCell(cell, cellWidth - CELL_PADDING * 2)) {
        let wordX = x + CELL_PADDING;
        for (const word of line) {
          pdf.setFont("helvetica", fontStyleFor(word.bold, word.italic));
          pdf.text(word.text, wordX, textY);
          wordX += pdf.getTextWidth(word.text) + pdf.getTextWidth(" ");
        }
        textY += VALUE_LINE_HEIGHT;
      }

      if (cell.subValue) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(LABEL_SIZE);
        pdf.setTextColor(120, 120, 120);
        pdf.text(cell.subValue, x + CELL_PADDING, textY);
      }

      x += cellWidth;
    }
    y = rowTop + rowHeight;
  };

  /** The single GES/NaCCA lesson-plan table - the same layout as the screen and Word versions. */
  const drawLessonPlanTable = (lesson: LessonExportData) => {
    const model = buildLessonPlanTable(
      lesson.header,
      lesson.phases ?? extractLessonPhases(lesson.lessonPlan),
      lesson.indicators
    );
    const quarter = GRID_COLUMNS / 4;
    const third = GRID_COLUMNS / 3;
    const half = GRID_COLUMNS / 2;

    drawRow(model.identity.cells.slice(0, 4).map((c) => ({ label: c.label, value: c.value, span: quarter })));
    drawRow(model.identity.cells.slice(4).map((c) => ({ label: c.label, value: c.value, span: quarter })));
    drawRow(model.curriculum.cells.map((c) => ({ label: c.label, value: c.value, span: third })));
    drawRow([{ label: model.keywords.label, value: model.keywords.value, span: GRID_COLUMNS }]);
    drawRow(model.standards.cells.map((c) => ({ label: c.label, value: c.value, span: half })));

    drawRow(
      [
        { value: "TIME / PHASES", span: third, bold: true },
        { value: "LEARNER ACTIVITY", span: third, bold: true },
        { value: "TLM / TLRs", span: third, bold: true },
      ],
      { fill: [243, 244, 246] }
    );

    for (const phase of model.phases) {
      drawRow([
        { value: phase.phase, span: third, bold: true, subValue: phase.time },
        { value: phase.learnerActivity, span: third },
        { value: phase.resources, span: third },
      ]);
    }
  };

  const title = DOCUMENT_TITLES[documentType];

  // Renders the Lesson Note body as a bordered table - one row per "###
  // Heading" section. Each row's border is only drawn if the row didn't itself
  // get split across a page break (checked via page count), so a rare
  // very-long row degrades to borderless content rather than a garbled box.
  const pageCount = () => (pdf.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  const renderSectionTable = (
    sections: { heading: string; blocks: MarkdownBlock[] }[],
    colX: number,
    colWidth: number,
    labelW: number,
    baseFontSize: number
  ) => {
    for (const section of sections) {
      checkPage(16);
      const rowStartY = y - lineHeightFor(baseFontSize) * 0.7;
      const pagesBefore = pageCount();

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(baseFontSize);
      pdf.setTextColor(22, 101, 52);
      pdf.text(section.heading, colX + 3, y);
      renderBlocks(section.blocks, colX + labelW + 3, colWidth - labelW - 6, baseFontSize);

      const rowEndY = y;
      if (pageCount() === pagesBefore) {
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(colX, rowStartY, colWidth, rowEndY - rowStartY + 3);
        pdf.line(colX + labelW, rowStartY, colX + labelW, rowEndY + 3);
      }
      y += 5;
    }
  };

  all.forEach((lesson, index) => {
    if (index > 0) pdf.addPage();
    y = 20;

    pdf.setFillColor(22, 101, 52);
    pdf.rect(0, 0, pageW, 22, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(`CurriculumCraft AI — ${title}`, margin, 10);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      [`NaCCA Standards-Based Curriculum - Ghana ${lesson.header.levelName}`, lesson.header.day]
        .filter(Boolean)
        .join("  ·  "),
      margin,
      17
    );
    pdf.text(new Date().toLocaleDateString("en-GB"), pageW - margin, 17, { align: "right" });

    y = 28;

    if (lesson.header.sourceNeedsReview) {
      checkPage(10);
      pdf.setFillColor(254, 243, 199);
      pdf.rect(margin, y, maxW, 8, "F");
      pdf.setTextColor(146, 64, 14);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        "⚠ Source text flagged for review - verify against the official NaCCA document before use.",
        margin + 3,
        y + 5.5
      );
      y += 12;
    }

    drawLessonPlanTable(lesson);

    // The Lesson Note carries the expanded script behind the table.
    if (documentType === "note") {
      const bodySections = splitBlocksIntoSections(parseMarkdownBlocks(contentFor(lesson, documentType)));
      if (bodySections.length > 0) {
        y += 8;
        checkPage(16);
        pdf.setFillColor(21, 128, 61);
        pdf.rect(margin, y, maxW, 7, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text("LESSON NOTE", margin + 3, y + 5);
        y += 11;
        renderSectionTable(bodySections, margin, maxW, 45, 8);
      }
    }
  });

  const totalPages = pageCount();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`CurriculumCraft AI  ·  Page ${i} of ${totalPages}`, pageW / 2, pageH - 6, { align: "center" });
  }

  return pdf;
}

export async function exportLessonPdf(
  lessons: LessonExportData | LessonExportData[],
  documentType: LessonDocumentType
) {
  const all = Array.isArray(lessons) ? lessons : [lessons];
  if (all.length === 0) return;
  const pdf = await buildLessonPdfDocument(all, documentType);
  pdf.save(lessonFileName(all, documentType, "pdf"));
}
