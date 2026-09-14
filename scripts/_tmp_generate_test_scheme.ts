import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { writeFileSync } from "fs";

function headerRow() {
  const headers = ["WK", "STRAND", "SUB STRAND", "CONTENT STANDARD", "INDICATOR(S)", "RESOURCES"];
  return new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        })
    ),
  });
}

function dataRow(cells: string[]) {
  return new TableRow({
    children: cells.map(
      (c) =>
        new TableCell({
          children: c.split("\n").map((line) => new Paragraph({ children: [new TextRun({ text: line })] })),
        })
    ),
  });
}

function subjectHeading(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
  });
}

const mathTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    headerRow(),
    dataRow([
      "1",
      "NUMBER",
      "Counting, Representation & Cardinality",
      "B4.1.1.1\nDemonstrate an understanding of quantities and place value for multi-digit whole numerals up to 100,000.",
      "B4.1.1.1.1 Model number quantities, place value for multi-digit using graph sheets or multi-base materials up to 100,000\nB4.1.1.1.2 Read and write numbers in figures and in words",
      "Number charts, counters",
    ]),
    dataRow([
      "2",
      "NUMBER",
      "Counting, Representation & Cardinality",
      "B4.1.1.1\nDemonstrate an understanding of quantities and place value for multi-digit whole numerals up to 100,000.",
      "B4.1.1.1.3 Identify numbers in different positions around a given number in number chart\nB4.1.1.1.4 Compare and order whole numbers up to 10,000 and represent comparisons using the symbols \"<\", \"=\", \">\"",
      "Number charts",
    ]),
    // Deliberately messy row: no content-standard code, indicator text has no code,
    // extra blank line - exercises the "best effort" tolerant parsing path.
    dataRow([
      "3",
      "NUMBER",
      "",
      "Continued work on place value concepts.",
      "Round off whole numbers up to 10000 to the nearest thousands, hundreds and tens\n\nSkip count forwards and backwards in 50s and 100s",
      "",
    ]),
    dataRow(["4", "REVISION", "", "", "", ""]),
  ],
});

const englishTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    headerRow(),
    dataRow([
      "1",
      "ORAL LANGUAGE",
      "Songs",
      "B4.1.1.1\nDemonstrate understanding of variety of songs",
      "B4.1.1.1.1 Listen attentively to songs and sing them with appropriate stress, rhythm and actions\nB4.1.1.1.2 Identify and discuss values in songs",
      "Audio player, song sheets",
    ]),
    dataRow([
      "2",
      "ORAL LANGUAGE",
      "Poems",
      "B4.1.3.1\nDemonstrate understanding of poems and other pieces of literary materials",
      "B4.1.3.1.1 Recite poems with stress, rhythm and actions and interpret them in own their words\nB4.1.3.1.2 Identify and discuss values in poems",
      "Poem chart",
    ]),
    // Indicator code that does not exist in the curriculum DB at all - should
    // become "unmatched" but still import using the teacher's own text.
    dataRow([
      "3",
      "ORAL LANGUAGE",
      "Story Telling",
      "B4.1.9.9\nDemonstrate understanding of story elements",
      "B4.1.9.9.1 Tell a familiar story using appropriate expressions and gestures",
      "Story books",
    ]),
  ],
});

async function main() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: "GHANA EDUCATION SERVICE", bold: true, size: 32 })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: "BASIC 4 - FIRST TERM SCHEME OF LEARNING", bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          subjectHeading("BASIC 4 - MATHEMATICS - FIRST TERM"),
          mathTable,
          subjectHeading("BASIC 4 - ENGLISH LANGUAGE - FIRST TERM"),
          englishTable,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync("D:\\curriculumcraft-ai\\_tmp_full_school_scheme.docx", buffer);
  console.log("Written _tmp_full_school_scheme.docx", buffer.length, "bytes");
}

main();
