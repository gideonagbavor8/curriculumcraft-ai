import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

type SourceConfig = {
  path: string;
  pdfPath: string;
  grades: number[];
  expectedIndicators: number;
  sha256: string;
  title: string;
  sourceUrl: string;
  coverage: string;
  rightColumn: number;
};

type SourceLine = { text: string; pdfPage: number; line: number };
type StandardCandidate = { code: string; parts: string[] };
type IndicatorDraft = {
  code: string;
  standardCode: string;
  grade: number;
  strand: number;
  subStrand: number;
  strandName: string;
  subStrandName: string;
  pdfPage: number;
  sourceLine: number;
  middleColumn: number;
  middle: string[];
  guidance: string[];
};

const [lowerText, upperText, output = "data/primary-mathematics-2019.json"] = process.argv.slice(2);
if (!lowerText || !upperText) {
  throw new Error("Usage: npm run curriculum:extract-primary-math -- <lower.txt> <upper.txt> [output.json]");
}

const sourceRoot = resolve(process.env.TEMP ?? ".", "nacca-primary-2019");
const sources: SourceConfig[] = [
  {
    path: resolve(lowerText),
    pdfPath: resolve(sourceRoot, "math-lower.pdf"),
    grades: [1, 2, 3],
    expectedIndicators: 92,
    sha256: "9D178A3A2585A82C86766A2F61B5B5BB2B503783E8ED1428A6237C43822A1AA0",
    title: "MATHEMATICS (BASIC 1 - 3)",
    sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/MATHS-LOWER-PRIMARY-B1-B3.pdf",
    coverage: "Primary Mathematics, Basic 1-3",
    rightColumn: 116,
  },
  {
    path: resolve(upperText),
    pdfPath: resolve(sourceRoot, "math-upper.pdf"),
    grades: [4, 5, 6],
    expectedIndicators: 180,
    sha256: "4B4439306AD2FAFC07F92CA6061DCBFBDE63975549177FDE3C69393FAF4A427C",
    title: "MATHEMATICS (BASIC 4 - 6)",
    sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/MATHS-UPPER-PRIMARY-B4-B6.pdf",
    coverage: "Primary Mathematics, Basic 4-6",
    rightColumn: 104,
  },
];

const codePattern = /B(\d)\s*\.\s*(\d)\s*\.\s*(\d)\s*\.\s*(\d)(?:\s*\.\s*(\d))?/g;
const noisePattern = /^(?:CONTENT|STANDARD|STANDARDS|INDICATORS AND EXEMPLARS|SUBJECT SPECIFIC|PRACTICES AND|CORE COMPETENCIES|AND CORE COMPETENCIES|Learners develop:|CONT'?D|©?\s*NaCCA)/i;

function hashFile(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function normalizeCode(match: RegExpMatchArray) {
  return `B${match[1]}.${match[2]}.${match[3]}.${match[4]}${match[5] ? `.${match[5]}` : ""}`;
}

function clean(parts: string[]) {
  return parts
    .map((part) => part.replace(/\f/g, " ").trim())
    .filter((part) => part && !noisePattern.test(part) && !/^\d+$/.test(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function sourceLines(path: string): SourceLine[] {
  let pdfPage = 1;
  return readFileSync(path, "utf8").split(/\r?\n/).map((text, index) => {
    if (text.includes("\f")) pdfPage += 1;
    return { text, pdfPage, line: index + 1 };
  });
}

function headingText(text: string, kind: "strand" | "sub-strand") {
  const pattern = kind === "strand"
    ? /(?<!Sub-)Strand\s+(\d)\s*[:.-]\s*([^\n]+?)(?=\s{4,}|$)/i
    : /Sub[- ]?[Ss]trand\s+(\d)\s*[:.-]\s*([^\n]+?)(?=\s{4,}|$)/i;
  const match = text.match(pattern);
  return match ? { number: Number(match[1]), name: clean([match[2]]) } : undefined;
}

function parseSource(source: SourceConfig) {
  if (hashFile(source.pdfPath) !== source.sha256) {
    throw new Error(`${basename(source.pdfPath)} does not match the audited SHA-256`);
  }

  const lines = sourceLines(source.path);
  const firstGrade = source.grades[0];
  const start = lines.findIndex((line) => new RegExp(`^\\f?\\s*BASIC ${firstGrade}\\s*$`, "i").test(line.text));
  if (start < 0) throw new Error(`Could not locate BASIC ${firstGrade} content in ${source.path}`);

  let grade = firstGrade;
  let strandName = "";
  let subStrandName = "";
  let standardOccurrence: StandardCandidate | undefined;
  let indicator: IndicatorDraft | undefined;
  const standardCandidates = new Map<string, string[]>();
  const indicators: IndicatorDraft[] = [];

  const finishStandardOccurrence = () => {
    if (!standardOccurrence) return;
    const text = clean(standardOccurrence.parts).replace(/\bCONT'?D\b\.?/gi, "").trim();
    if (text) standardCandidates.set(standardOccurrence.code, [...(standardCandidates.get(standardOccurrence.code) ?? []), text]);
  };
  const finishIndicator = () => {
    if (indicator) indicators.push(indicator);
  };

  for (const line of lines.slice(start)) {
    const isPageNoise = /NaCCA, Ministry of Education 2019/i.test(line.text) || /^\s*\d+\s*$/.test(line.text.replace(/\f/g, ""));
    const gradeHeading = line.text.match(/^\f?\s*BASIC\s+([1-6])\s*$/i);
    if (gradeHeading) {
      const nextGrade = Number(gradeHeading[1]);
      if (!source.grades.includes(nextGrade)) {
        if (nextGrade > source.grades.at(-1)!) break;
        continue;
      }
      grade = nextGrade;
    }

    const strandHeading = headingText(line.text, "strand");
    if (strandHeading) strandName = strandHeading.name;
    const subStrandHeading = headingText(line.text, "sub-strand");
    if (subStrandHeading) subStrandName = subStrandHeading.name;
    const isHeading = Boolean(gradeHeading || strandHeading || subStrandHeading);

    const matches = [...line.text.matchAll(codePattern)];
    const standardMatch = matches.find((match) => !match[5] && match.index! < 15 && Number(match[1]) === grade);
    if (standardMatch) {
      finishStandardOccurrence();
      standardOccurrence = { code: normalizeCode(standardMatch), parts: [] };
    }

    const indicatorMatch = matches.find((match) => match[5] && match.index! >= 15 && match.index! < 70 && Number(match[1]) === grade);
    if (indicatorMatch) {
      finishIndicator();
      const code = normalizeCode(indicatorMatch);
      indicator = {
        code,
        standardCode: code.split(".").slice(0, 4).join("."),
        grade,
        strand: Number(indicatorMatch[2]),
        subStrand: Number(indicatorMatch[3]),
        strandName,
        subStrandName,
        pdfPage: line.pdfPage,
        sourceLine: line.line,
        middleColumn: indicatorMatch.index!,
        middle: [line.text.slice(indicatorMatch.index! + indicatorMatch[0].length, source.rightColumn)],
        guidance: [line.text.slice(source.rightColumn)],
      };
    } else if (indicator && !isPageNoise && !isHeading) {
      indicator.middle.push(line.text.slice(indicator.middleColumn, source.rightColumn));
      indicator.guidance.push(line.text.slice(source.rightColumn));
    }

    if (standardOccurrence) {
      standardOccurrence.parts.push(line.text.slice(0, 28).replace(codePattern, ""));
    }
  }
  finishIndicator();
  finishStandardOccurrence();

  const uniqueIndicators = [...indicators.reduce((byCode, draft) => {
    const existing = byCode.get(draft.code);
    if (!existing || clean(draft.middle).length > clean(existing.middle).length) byCode.set(draft.code, draft);
    return byCode;
  }, new Map<string, IndicatorDraft>()).values()];
  if (uniqueIndicators.length !== source.expectedIndicators) {
    throw new Error(`${source.path}: expected ${source.expectedIndicators} indicators, extracted ${uniqueIndicators.length}`);
  }

  return uniqueIndicators.map((draft, index) => {
    const middle = clean(draft.middle);
    const exemplarMarker = /\bE\.?\s*g\.?\s*(\d+)?\s*[.:]?/gi;
    const exemplarMatches = [...middle.matchAll(exemplarMarker)];
    const indicatorText = clean([middle.slice(0, exemplarMatches[0]?.index ?? middle.length)]);
    const exemplars = exemplarMatches.map((match, exemplarIndex) => ({
      label: match[1] ? `E.g. ${match[1]}` : "E.g.",
      text: clean([middle.slice(match.index! + match[0].length, exemplarMatches[exemplarIndex + 1]?.index ?? middle.length)]),
      sortOrder: exemplarIndex + 1,
      revision: "2019-primary-mathematics",
      documentSha256: source.sha256,
      pdfPage: draft.pdfPage,
      sourceReference: `${draft.code}, ${match[1] ? `E.g. ${match[1]}` : "exemplar"}`,
      extractionConfidence: "medium",
      reviewStatus: "needs-review",
      ambiguityFlag: true,
      rawSourceText: middle.slice(match.index!, exemplarMatches[exemplarIndex + 1]?.index ?? middle.length).trim(),
    })).filter(({ text }) => text);
    const standardText = (standardCandidates.get(draft.standardCode) ?? []).sort((a, b) => b.length - a.length)[0] ?? "";
    const guidanceText = clean(draft.guidance);
    const ambiguous = !indicatorText || !standardText || !draft.strandName || !draft.subStrandName || /�/.test(`${middle}${standardText}${guidanceText}`);

    return {
      curriculumSlug: "ghana-nacca-sbc",
      curriculumName: "Ghana NaCCA Standards-Based Curriculum",
      countryCode: "GH",
      authority: "NaCCA",
      version: "2019-primary-mathematics",
      levelCode: "PRIMARY",
      levelName: "Primary",
      gradeCode: `B${draft.grade}`,
      gradeName: `Basic ${draft.grade}`,
      gradeAliases: [`P${draft.grade}`],
      gradeSortOrder: draft.grade,
      typicalAgeMin: draft.grade + 5,
      typicalAgeMax: draft.grade + 6,
      subjectSlug: "mathematics",
      subjectName: "Mathematics",
      subjectSortOrder: 1,
      strandCode: `${draft.grade}.${draft.strand}`,
      strandName: draft.strandName,
      strandSortOrder: draft.strand,
      subStrandCode: `${draft.grade}.${draft.strand}.${draft.subStrand}`,
      subStrandName: draft.subStrandName,
      subStrandSortOrder: draft.subStrand,
      contentStandardCode: standardText ? draft.standardCode : undefined,
      contentStandardText: standardText || undefined,
      contentStandardSortOrder: standardText ? Number(draft.standardCode.split(".").at(-1)) : undefined,
      indicatorCode: draft.code,
      indicatorText,
      indicatorSortOrder: Number(draft.code.split(".").at(-1)),
      bloomsLevel: null,
      documentSha256: source.sha256,
      pdfPage: draft.pdfPage,
      sourceReference: draft.code,
      extractionConfidence: ambiguous ? "low" : "medium",
      reviewStatus: "needs-review",
      ambiguityFlag: true,
      rawSourceText: middle,
      guidance: guidanceText ? [{
        target: "indicator",
        kind: "subject_specific_practice",
        text: guidanceText,
        sortOrder: 1,
        documentSha256: source.sha256,
        pdfPage: draft.pdfPage,
        sourceReference: `${draft.code}, subject-specific practices and core competencies`,
        extractionConfidence: "low",
        reviewStatus: "needs-review",
        ambiguityFlag: true,
        rawSourceText: guidanceText,
      }] : [],
      exemplars,
      _sourceLine: draft.sourceLine,
      _sourceOrder: index,
    };
  });
}

const records = sources.flatMap(parseSource).map(({ _sourceLine, _sourceOrder, ...record }) => record);
const grades = Object.fromEntries(sources.flatMap((source) => source.grades).map((grade) => [
  `B${grade}`,
  records.filter((record) => record.gradeCode === `B${grade}`).length,
]));

const artifact = {
  manifest: {
    schemaVersion: "1",
    releaseStatus: "approved",
    documents: sources.map((source) => ({
      organization: "National Council for Curriculum and Assessment (NaCCA), Ministry of Education, Ghana",
      title: source.title,
      publicationDate: "2019-09",
      version: "September 2019",
      sourceUrl: source.sourceUrl,
      coverage: source.coverage,
      sha256: source.sha256,
      extractionVersion: "primary-mathematics-pdftotext-layout-v1",
    })),
  },
  records,
};

writeFileSync(resolve(output), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: resolve(output), records: records.length, grades }, null, 2));