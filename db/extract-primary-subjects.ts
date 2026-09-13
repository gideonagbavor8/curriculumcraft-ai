import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Generic extractor for the remaining official NaCCA Primary (B1-B6) subject
// curricula. Reuses the same table-shape assumptions validated for Mathematics
// (content standard column at line start, indicator column further right,
// "subject specific practices and core competencies" column on the far right)
// but auto-detects the two column boundaries per source file instead of
// hardcoding them, since layout varies subject to subject.

type SourceFile = {
  path: string;
  grades: number[];
};

type SubjectConfig = {
  key: string;
  subjectSlug: string;
  subjectName: string;
  subjectSortOrder: number;
  sources: SourceFile[];
  documents: { title: string; sourceUrl: string; coverage: string }[];
};

type SourceLine = { text: string; pdfPage: number; line: number };
type IndicatorDraft = {
  code: string;
  standardCode: string;
  grade: number;
  strand: number;
  strandName: string;
  subStrand: number;
  subStrandName: string;
  pdfPage: number;
  sourceLine: number;
  indicatorColumn: number;
  rightColumn: number;
  middle: string[];
};

const tempDir = resolve(process.env.TEMP ?? ".", "nacca-primary-2019");

const SUBJECTS: SubjectConfig[] = [
  {
    key: "english",
    subjectSlug: "english",
    subjectName: "English Language",
    subjectSortOrder: 2,
    sources: [
      { path: resolve(tempDir, "english-lower.txt"), grades: [1, 2, 3] },
      { path: resolve(tempDir, "english-upper.txt"), grades: [4, 5, 6] },
    ],
    documents: [
      { title: "ENGLISH LANGUAGE (BASIC 1 - 3)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/ENGLISH-LOWER-PRIMARY-B1-B3.pdf", coverage: "Primary English Language, Basic 1-3" },
      { title: "ENGLISH LANGUAGE (BASIC 4 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/06/ENGLISH-B4-B6.pdf", coverage: "Primary English Language, Basic 4-6" },
    ],
  },
  {
    key: "science",
    subjectSlug: "science",
    subjectName: "Science",
    subjectSortOrder: 3,
    sources: [
      { path: resolve(tempDir, "science-lower.txt"), grades: [1, 2, 3] },
      { path: resolve(tempDir, "science-upper.txt"), grades: [4, 5, 6] },
    ],
    documents: [
      { title: "SCIENCE (BASIC 1 - 3)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/SCIENCE-LOWER-PRIMARY-B1-B3.pdf", coverage: "Primary Science, Basic 1-3" },
      { title: "SCIENCE (BASIC 4 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/SCIENCE-UPPER-PRIMARY-B4-B6.pdf", coverage: "Primary Science, Basic 4-6" },
    ],
  },
  {
    key: "french",
    subjectSlug: "french",
    subjectName: "French",
    subjectSortOrder: 9,
    sources: [{ path: resolve(tempDir, "french-upper.txt"), grades: [4, 5, 6] }],
    documents: [
      { title: "FRENCH (BASIC 4 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/06/FRENCH-B4-B6.pdf", coverage: "Primary French, Basic 4-6" },
    ],
  },
  {
    key: "computing",
    subjectSlug: "computing",
    subjectName: "Computing",
    subjectSortOrder: 10,
    sources: [{ path: resolve(tempDir, "computing-upper.txt"), grades: [4, 5, 6] }],
    documents: [
      { title: "COMPUTING (BASIC 4 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/COMPUTING-B4-B6.pdf", coverage: "Primary Computing, Basic 4-6" },
    ],
  },
  {
    key: "ghanaian-language",
    subjectSlug: "ghanaian-language",
    subjectName: "Ghanaian Language",
    subjectSortOrder: 8,
    sources: [
      { path: resolve(tempDir, "ghanaian-language-lower.txt"), grades: [1, 2, 3] },
      { path: resolve(tempDir, "ghanaian-language-upper.txt"), grades: [4, 5, 6] },
    ],
    documents: [
      { title: "GHANAIAN LANGUAGE (BASIC 1 - 3)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/06/GHANAIAN-LANGUAGE-B1-B3.pdf", coverage: "Primary Ghanaian Language, Basic 1-3" },
      { title: "GHANAIAN LANGUAGE (BASIC 4 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/06/GHANAIAN-LANGUAGE-B4-B6.pdf", coverage: "Primary Ghanaian Language, Basic 4-6" },
    ],
  },
  {
    key: "history",
    subjectSlug: "history",
    subjectName: "History",
    subjectSortOrder: 6,
    sources: [{ path: resolve(tempDir, "history.txt"), grades: [1, 2, 3, 4, 5, 6] }],
    documents: [
      { title: "HISTORY (BASIC 1 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/HISTORY-B1-B6.pdf", coverage: "Primary History, Basic 1-6" },
    ],
  },
  {
    key: "physical-education",
    subjectSlug: "physical-education",
    subjectName: "Physical Education",
    subjectSortOrder: 7,
    sources: [{ path: resolve(tempDir, "pe.txt"), grades: [1, 2, 3, 4, 5, 6] }],
    documents: [
      { title: "PHYSICAL EDUCATION (BASIC 1 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/PHYSICAL-EDUCATION-B1-B6.pdf", coverage: "Primary Physical Education, Basic 1-6" },
    ],
  },
  {
    key: "owop",
    subjectSlug: "our-world-our-people",
    subjectName: "Our World and Our People",
    subjectSortOrder: 5,
    sources: [
      { path: resolve(tempDir, "owop-lower.txt"), grades: [1, 2, 3] },
      { path: resolve(tempDir, "owop-upper.txt"), grades: [4, 5, 6] },
    ],
    documents: [
      { title: "OUR WORLD AND OUR PEOPLE (BASIC 1 - 3)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/06/OUR-WORLD-AND-OUR-PEOPLE-B1-B3-1.pdf", coverage: "Primary Our World and Our People, Basic 1-3" },
      { title: "OUR WORLD AND OUR PEOPLE (BASIC 4 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/06/OUR-WORLD-AND-OUR-PEOPLE-B4-B6-1.pdf", coverage: "Primary Our World and Our People, Basic 4-6" },
    ],
  },
  {
    key: "creative-arts",
    subjectSlug: "creative-arts",
    subjectName: "Creative Arts",
    subjectSortOrder: 4,
    sources: [
      { path: resolve(tempDir, "creative-arts-lower.txt"), grades: [1, 2, 3] },
      { path: resolve(tempDir, "creative-arts-upper.txt"), grades: [4, 5, 6] },
    ],
    documents: [
      { title: "CREATIVE ARTS (BASIC 1 - 3)", sourceUrl: "https://nacca.gov.gh/wp-content/uploads/2019/06/CREATIVE-ARTS-B1-B3.pdf", coverage: "Primary Creative Arts, Basic 1-3" },
      { title: "CREATIVE ARTS (BASIC 4 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/06/CREATIVE-ARTS-B4-B6-.pdf", coverage: "Primary Creative Arts, Basic 4-6" },
    ],
  },
  {
    key: "rme",
    subjectSlug: "religious-and-moral-education",
    subjectName: "Religious and Moral Education",
    subjectSortOrder: 11,
    sources: [{ path: resolve(tempDir, "rme.txt"), grades: [1, 2, 3, 4, 5, 6] }],
    documents: [
      { title: "RELIGIOUS AND MORAL EDUCATION (BASIC 1 - 6)", sourceUrl: "http://nacca.gov.gh/wp-content/uploads/2019/04/RELIGIOUS-AND-MORAL-EDUCATION-B1-B6.pdf", coverage: "Primary Religious and Moral Education, Basic 1-6" },
    ],
  },
];

const codePattern = /B(\d)\s*\.\s*(\d)\s*\.\s*(\d)\s*\.\s*(\d)(?:\s*\.\s*(\d))?/g;
const noisePattern = /^(?:CONTENT|STANDARD|STANDARDS|INDICATORS AND EXEMPLARS|SUBJECT SPECIFIC|PRACTICES AND|CORE COMPETENC|AND CORE COMPETENC|Learners develop:|CONT'?D|©?\s*NaCCA)/i;
const MARKER_PHRASES = [
  "Learners develop", "Critical Thinking", "Creativity and [Ii]nnovation",
  "Communication and Collaboration", "Cultural [Ii]dentity", "Personal [Dd]evelopment",
  "Digital [Ll]iteracy", "Global Citizenship", "Problem Solving", "Justification of Ideas",
  "Attention to Precision", "Collaborative [Ll]earning", "SUBJECT SPECIFIC",
  "CORE COMPETENC", "Leadership Skills", "Subject Specific Practices",
];
const markerRegex = new RegExp(MARKER_PHRASES.join("|"), "i");

function hashFile(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
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

function mode(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function headingText(text: string, kind: "strand" | "sub-strand") {
  const pattern = kind === "strand"
    ? /(?<!Sub[-\u2013\u2014 ]{0,3})\bStrand\s*(\d)?\s*[:.\u2013\u2014-]?\s*([A-Za-z][^\n]*?)(?=\s{4,}|$)/i
    : /\bSub[-\u2013\u2014 ]{0,3}[Ss]trand\s*(\d)?\s*[:.\u2013\u2014-]?\s*([A-Za-z][^\n]*?)(?=\s{4,}|$)/i;
  const match = text.match(pattern);
  return match ? { number: match[1] ? Number(match[1]) : undefined, name: clean([match[2]]) } : undefined;
}

function parseSource(source: SourceFile, subject: SubjectConfig, documentSha256Map: Map<string, string>) {
  const lines = sourceLines(source.path);
  const firstGrade = source.grades[0];
  const lastGrade = source.grades.at(-1)!;
  const start = lines.findIndex((line) => new RegExp(`^\\f?\\s*BASIC\\s+${firstGrade}\\s*$`, "i").test(line.text));
  if (start < 0) throw new Error(`Could not locate BASIC ${firstGrade} content in ${source.path}`);
  const scoped = lines.slice(start);

  // Auto-detect the indicator column and the far-right guidance column since
  // table layout differs subject to subject (unlike a single hardcoded value).
  const indicatorIndexes: number[] = [];
  const markerIndexes: number[] = [];
  for (const line of scoped) {
    for (const match of line.text.matchAll(codePattern)) {
      if (match[5] && match.index! >= 15 && match.index! < 200) indicatorIndexes.push(match.index!);
    }
    const markerMatch = line.text.match(markerRegex);
    if (markerMatch && markerMatch.index! > 40) markerIndexes.push(markerMatch.index!);
  }
  const indicatorColumn = mode(indicatorIndexes, 30);
  const rightColumn = mode(markerIndexes, 120);

  let grade = firstGrade;
  let strandNumber = 0;
  let strandName = "";
  let subStrandNumber = 0;
  let subStrandName = "";
  let standardOccurrence: { code: string; parts: string[] } | undefined;
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

  for (const line of scoped) {
    const gradeHeading = line.text.match(/^\f?\s*BASIC\s+([1-6])\s*$/i);
    if (gradeHeading) {
      const nextGrade = Number(gradeHeading[1]);
      if (!source.grades.includes(nextGrade)) {
        if (nextGrade > lastGrade) break;
        continue;
      }
      grade = nextGrade;
    }

    const strandHeading = headingText(line.text, "strand");
    if (strandHeading) {
      strandNumber = strandHeading.number ?? strandNumber + 1;
      strandName = strandHeading.name;
    }
    const subStrandHeading = headingText(line.text, "sub-strand");
    if (subStrandHeading) {
      subStrandNumber = subStrandHeading.number ?? subStrandNumber + 1;
      subStrandName = subStrandHeading.name;
    }

    const isHeading = Boolean(gradeHeading || strandHeading || subStrandHeading);
    const isPageNoise = /NaCCA, Ministry of Education 2019/i.test(line.text) || /^\s*\d+\s*$/.test(line.text.replace(/\f/g, ""));

    const matches = isPageNoise ? [] : [...line.text.matchAll(codePattern)];
    const standardMatch = matches.find((match) => !match[5] && match.index! < 15 && Number(match[1]) === grade);
    if (standardMatch) {
      finishStandardOccurrence();
      standardOccurrence = { code: `B${standardMatch[1]}.${standardMatch[2]}.${standardMatch[3]}.${standardMatch[4]}`, parts: [] };
    }

    const indicatorMatch = matches.find((match) =>
      match[5] &&
      Number(match[1]) === grade &&
      Math.abs(match.index! - indicatorColumn) <= 10
    );
    if (indicatorMatch) {
      finishIndicator();
      const code = `B${indicatorMatch[1]}.${indicatorMatch[2]}.${indicatorMatch[3]}.${indicatorMatch[4]}.${indicatorMatch[5]}`;
      indicator = {
        code,
        standardCode: code.split(".").slice(0, 4).join("."),
        grade,
        strand: strandNumber,
        strandName,
        subStrand: subStrandNumber,
        subStrandName,
        pdfPage: line.pdfPage,
        sourceLine: line.line,
        indicatorColumn,
        rightColumn,
        middle: [line.text.slice(indicatorMatch.index! + indicatorMatch[0].length, rightColumn)],
      };
    } else if (indicator && !isHeading && !isPageNoise) {
      indicator.middle.push(line.text.slice(indicator.indicatorColumn, rightColumn));
    }

    if (standardOccurrence && !isHeading && !isPageNoise) {
      const cutoff = matches.length ? Math.min(indicatorColumn, matches[0].index!) : indicatorColumn;
      standardOccurrence.parts.push(line.text.slice(0, cutoff).replace(codePattern, ""));
    }
  }
  finishIndicator();
  finishStandardOccurrence();

  const uniqueIndicators = [...indicators.reduce((byCode, draft) => {
    const existing = byCode.get(draft.code);
    if (!existing || clean(draft.middle).length > clean(existing.middle).length) byCode.set(draft.code, draft);
    return byCode;
  }, new Map<string, IndicatorDraft>()).values()];

  const documentSha256 = documentSha256Map.get(source.path)!;

  return uniqueIndicators.map((draft) => {
    const middle = clean(draft.middle);
    const exemplarMarker = /\b(?:E\.?\s*g\.?\s*(\d+)?\s*[.:]?|Exemplar\s*(\d+)?\s*[.:]?)/gi;
    const exemplarMatches = [...middle.matchAll(exemplarMarker)];
    const indicatorText = clean([middle.slice(0, exemplarMatches[0]?.index ?? middle.length)]);
    const exemplars = exemplarMatches.map((match, index) => {
      const text = clean([middle.slice(match.index! + match[0].length, exemplarMatches[index + 1]?.index ?? middle.length)]);
      const suspect = markerRegex.test(text) || /�/.test(text);
      return {
        label: (match[1] ?? match[2]) ? `E.g. ${match[1] ?? match[2]}` : "E.g.",
        text,
        sortOrder: index + 1,
        revision: `2019-primary-${subject.key}`,
        documentSha256,
        pdfPage: draft.pdfPage,
        sourceReference: `${draft.code}, exemplar ${index + 1}`,
        extractionConfidence: (suspect ? "low" : "medium") as "low" | "medium",
        reviewStatus: (suspect ? "needs-review" : "pending") as "needs-review" | "pending",
        ambiguityFlag: suspect,
        rawSourceText: middle.slice(match.index!, exemplarMatches[index + 1]?.index ?? middle.length).trim(),
      };
    }).filter(({ text }) => text);

    const standardText = (standardCandidates.get(draft.standardCode) ?? []).sort((a, b) => b.length - a.length)[0] ?? "";
    const contaminated = markerRegex.test(indicatorText) || exemplars.some((exemplar) => markerRegex.test(exemplar.text));
    // A missing content standard is not itself ambiguous - some subjects (e.g. French)
    // label that column with a skill category instead of a coded standard. Only the
    // indicator's own text/hierarchy and contamination are used as the trust signal.
    const ambiguous = !indicatorText || !draft.strandName || !draft.subStrandName || /�/.test(`${middle}${standardText}`) || contaminated;

    return {
      curriculumSlug: "ghana-nacca-sbc",
      curriculumName: "Ghana NaCCA Standards-Based Curriculum",
      countryCode: "GH",
      authority: "NaCCA",
      version: `2019-primary-${subject.key}`,
      levelCode: "PRIMARY",
      levelName: "Primary",
      gradeCode: `B${draft.grade}`,
      gradeName: `Basic ${draft.grade}`,
      gradeAliases: [`P${draft.grade}`],
      gradeSortOrder: draft.grade,
      typicalAgeMin: draft.grade + 5,
      typicalAgeMax: draft.grade + 6,
      subjectSlug: subject.subjectSlug,
      subjectName: subject.subjectName,
      subjectSortOrder: subject.subjectSortOrder,
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
      indicatorText: indicatorText || "(unresolved - needs manual review)",
      indicatorSortOrder: Number(draft.code.split(".").at(-1)),
      bloomsLevel: null,
      documentSha256,
      pdfPage: draft.pdfPage,
      sourceReference: draft.code,
      extractionConfidence: ambiguous ? "low" : "medium",
      reviewStatus: ambiguous ? "needs-review" : "pending",
      ambiguityFlag: ambiguous,
      rawSourceText: middle,
      guidance: [],
      exemplars,
    };
  });
}

function processSubject(subject: SubjectConfig) {
  const documentSha256Map = new Map<string, string>();
  const documents = subject.sources.map((source, index) => {
    const pdfPath = source.path.replace(/\.txt$/, ".pdf");
    const sha256 = hashFile(pdfPath);
    documentSha256Map.set(source.path, sha256);
    return { ...subject.documents[index], sha256, publicationDate: "2019", version: "2019", extractionVersion: "primary-subjects-pdftotext-layout-v1", organization: "National Council for Curriculum and Assessment (NaCCA), Ministry of Education, Ghana" };
  });

  const records = subject.sources.flatMap((source) => parseSource(source, subject, documentSha256Map));
  const byGrade = Object.fromEntries(
    subject.sources.flatMap((s) => s.grades).map((grade) => [
      `B${grade}`,
      records.filter((record) => record.gradeCode === `B${grade}`).length,
    ])
  );
  const needsReview = records.filter((record) => record.reviewStatus === "needs-review").length;

  const artifact = {
    manifest: { schemaVersion: "1", releaseStatus: "approved", documents },
    records,
  };
  const outputPath = resolve(tempDir, `primary-${subject.key}-2019.json`);
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return { key: subject.key, subjectSlug: subject.subjectSlug, output: outputPath, total: records.length, byGrade, needsReview };
}

const requestedKey = process.argv[2];
const targets = requestedKey && requestedKey !== "all"
  ? SUBJECTS.filter((subject) => subject.key === requestedKey)
  : SUBJECTS;
if (targets.length === 0) throw new Error(`Unknown subject key: ${requestedKey}`);

const summary = targets.map((subject) => {
  try {
    return processSubject(subject);
  } catch (error) {
    return { key: subject.key, subjectSlug: subject.subjectSlug, failed: true, error: error instanceof Error ? error.message : String(error) };
  }
});
console.log(JSON.stringify(summary, null, 2));
