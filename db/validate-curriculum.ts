import * as dotenv from "dotenv";
import { writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

/**
 * Reports on what the curriculum tables actually hold, subject by subject,
 * and looks for the ways an import can go quietly wrong: a grade a subject
 * never reached, a code that appears twice, a row nobody can navigate to, a
 * page footer that was read as an indicator.
 *
 *   npm run curriculum:validate                # every level
 *   npm run curriculum:validate -- --level JHS # one level
 *   npm run curriculum:validate -- --json out.json
 *
 * Read-only. Legacy seed rows (no release) are reported separately from
 * release-backed rows so that the two are never mistaken for one another.
 */

const sql = neon(process.env.DATABASE_URL ?? "");

interface SubjectReport {
  subject: string;
  slug: string;
  level: string;
  releaseVersion: string | null;
  releaseId: string | null;
  releaseStatus: string | null;
  documentId: string | null;
  documentTitle: string | null;
  documentSha256: string | null;
  indicatorsByGrade: Record<string, number>;
  indicators: number;
  exemplars: number;
  needsReview: number;
  lowConfidence: number;
  missingContentStandard: number;
  blankIndicatorText: number;
  blankExemplarText: number;
  missingSourcePage: number;
  missingRawSource: number;
}

interface Issue {
  check: string;
  detail: string;
}

function arg(name: string): string | null {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] ?? null : null;
}

async function subjectReports(level: string | null): Promise<SubjectReport[]> {
  const levelFilter = level ? sql`and l.code = ${level}` : sql``;
  // One line per subject, level, release and grade; a null release is the seed.
  const perGrade = await sql`
    select s.name as subject, s.slug, l.code as level, g.code as grade,
           r.id as release_id, r.version as release_version, r.status as release_status,
           min(d.id::text) as document_id, min(d.title) as document_title, min(d.sha256) as document_sha256,
           count(*)::int as n,
           count(*) filter (where i.review_status = 'needs-review')::int as needs_review,
           count(*) filter (where i.extraction_confidence = 'low')::int as low,
           count(*) filter (where i.content_standard_id is null)::int as no_cs,
           count(*) filter (where btrim(i.text) = '')::int as blank,
           count(*) filter (where i.pdf_page is null)::int as no_page,
           count(*) filter (where i.raw_source_text is null or i.raw_source_text = '')::int as no_raw
    from indicators i
    join sub_strands ss on ss.id = i.sub_strand_id
    join strands st on st.id = ss.strand_id
    join subjects s on s.id = st.subject_id
    join grades g on g.id = i.grade_id
    join education_levels l on l.id = g.education_level_id
    left join curriculum_releases r on r.id = i.release_id
    left join curriculum_documents d on d.id = i.document_id
    where true ${levelFilter}
    group by s.name, s.slug, l.code, g.code, g.sort_order, r.id, r.version, r.status
    order by l.code, s.name, r.version nulls first, g.sort_order
  `;
  const exemplars = await sql`
    select s.name as subject, l.code as level, i.release_id,
           count(*)::int as n, count(*) filter (where btrim(e.text) = '')::int as blank
    from indicator_exemplars e
    join indicators i on i.id = e.indicator_id
    join sub_strands ss on ss.id = i.sub_strand_id
    join strands st on st.id = ss.strand_id
    join subjects s on s.id = st.subject_id
    join grades g on g.id = i.grade_id
    join education_levels l on l.id = g.education_level_id
    where true ${levelFilter}
    group by s.name, l.code, i.release_id
  `;
  const key = (subject: string, lvl: string, releaseId: string | null) => `${subject}|${lvl}|${releaseId ?? ""}`;
  const exemplarsBy = new Map(exemplars.map((row) => [key(row.subject, row.level, row.release_id), row]));

  const reports = new Map<string, SubjectReport>();
  for (const row of perGrade) {
    const k = key(row.subject, row.level, row.release_id);
    const report: SubjectReport = reports.get(k) ?? {
      subject: row.subject,
      slug: row.slug,
      level: row.level,
      releaseVersion: row.release_version,
      releaseId: row.release_id,
      releaseStatus: row.release_status,
      documentId: row.document_id,
      documentTitle: row.document_title,
      documentSha256: row.document_sha256,
      indicatorsByGrade: {},
      indicators: 0,
      exemplars: exemplarsBy.get(k)?.n ?? 0,
      needsReview: 0,
      lowConfidence: 0,
      missingContentStandard: 0,
      blankIndicatorText: 0,
      blankExemplarText: exemplarsBy.get(k)?.blank ?? 0,
      missingSourcePage: 0,
      missingRawSource: 0,
    };
    report.indicatorsByGrade[row.grade] = row.n;
    report.indicators += row.n;
    report.needsReview += row.needs_review;
    report.lowConfidence += row.low;
    report.missingContentStandard += row.no_cs;
    report.blankIndicatorText += row.blank;
    report.missingSourcePage += row.no_page;
    report.missingRawSource += row.no_raw;
    reports.set(k, report);
  }
  return [...reports.values()];
}

async function crossChecks(level: string | null): Promise<Issue[]> {
  const issues: Issue[] = [];
  const levelFilter = level ? sql`and l.code = ${level}` : sql``;

  // A release-backed subject that reached some grades of its level but not all.
  const missingGrades = await sql`
    select s.name as subject, r.version, l.code as level,
           array_agg(g.code order by g.sort_order) filter (where gs.id is null) as missing
    from grade_subjects gs0
    join subjects s on s.id = gs0.subject_id
    join curriculum_releases r on r.id = gs0.release_id
    join grades g0 on g0.id = gs0.grade_id
    join education_levels l on l.id = g0.education_level_id
    join grades g on g.education_level_id = l.id
    left join grade_subjects gs on gs.subject_id = s.id and gs.grade_id = g.id and gs.release_id = r.id
    where true ${levelFilter}
    group by s.name, r.version, l.code
    having count(*) filter (where gs.id is null) > 0
  `;
  for (const row of missingGrades) {
    issues.push({ check: "missing-grade", detail: `${row.subject} (${row.version}) has no ${row.level} rows for ${row.missing.join(", ")}` });
  }

  // The same indicator code twice within one subject, grade and release.
  const duplicateIndicators = await sql`
    select s.name as subject, g.code as grade, coalesce(r.version, '(seed)') as release, i.code, count(*)::int as n
    from indicators i
    join sub_strands ss on ss.id = i.sub_strand_id
    join strands st on st.id = ss.strand_id
    join subjects s on s.id = st.subject_id
    join grades g on g.id = i.grade_id
    join education_levels l on l.id = g.education_level_id
    left join curriculum_releases r on r.id = i.release_id
    where true ${levelFilter}
    group by s.name, g.code, r.version, i.code
    having count(*) > 1
  `;
  for (const row of duplicateIndicators) {
    issues.push({ check: "duplicate-indicator", detail: `${row.subject} ${row.grade} ${row.release}: ${row.code} x${row.n}` });
  }

  // The same exemplar text twice under one indicator.
  const duplicateExemplars = await sql`
    select i.code, coalesce(r.version, 'seed, no release') as release, count(*)::int as n
    from indicator_exemplars e
    join indicators i on i.id = e.indicator_id
    join grades g on g.id = i.grade_id
    join education_levels l on l.id = g.education_level_id
    left join curriculum_releases r on r.id = i.release_id
    where true ${levelFilter}
    group by i.id, i.code, r.version, e.revision, lower(btrim(e.text))
    having count(*) > 1
  `;
  for (const row of duplicateExemplars) {
    issues.push({ check: "duplicate-exemplar", detail: `${row.code} [${row.release}]: the same exemplar text appears ${row.n} times` });
  }

  // Structure nobody can reach from the selector.
  const orphans = await sql`
    select 'strand without sub-strands' as what, st.name as detail
    from strands st
    join subjects s on s.id = st.subject_id
    left join sub_strands ss on ss.strand_id = st.id
    left join grade_subjects gs on gs.id = st.grade_subject_id
    left join grades g on g.id = gs.grade_id
    left join education_levels l on l.id = g.education_level_id
    where ss.id is null ${level ? sql`and (l.code = ${level} or l.code is null)` : sql``}
    union all
    select 'sub-strand without indicators', st.name || ' / ' || ss.name
    from sub_strands ss
    join strands st on st.id = ss.strand_id
    left join indicators i on i.sub_strand_id = ss.id
    left join grade_subjects gs on gs.id = st.grade_subject_id
    left join grades g on g.id = gs.grade_id
    left join education_levels l on l.id = g.education_level_id
    where i.id is null ${level ? sql`and (l.code = ${level} or l.code is null)` : sql``}
    union all
    select 'content standard without indicators', cs.code
    from content_standards cs
    join grades g on g.id = cs.grade_id
    join education_levels l on l.id = g.education_level_id
    left join indicators i on i.content_standard_id = cs.id
    where i.id is null ${levelFilter}
  `;
  for (const row of orphans) issues.push({ check: "orphan", detail: `${row.what}: ${row.detail}` });

  // An indicator filed under a grade its strand does not belong to, or whose
  // code names a different grade than the row says.
  const badRelations = await sql`
    select i.code, g.code as grade, gsg.code as strand_grade, i.grade as grade_label
    from indicators i
    join sub_strands ss on ss.id = i.sub_strand_id
    join strands st on st.id = ss.strand_id
    join grades g on g.id = i.grade_id
    join education_levels l on l.id = g.education_level_id
    left join grade_subjects gs on gs.id = st.grade_subject_id
    left join grades gsg on gsg.id = gs.grade_id
    where (gsg.code is not null and gsg.code <> g.code)
       or i.grade <> g.code
       or (i.code ~ '^B[1-9]' and split_part(i.code, '.', 1) <> g.code)
       ${levelFilter}
  `;
  for (const row of badRelations) {
    issues.push({ check: "invalid-relationship", detail: `${row.code}: row grade ${row.grade}, label ${row.grade_label}, strand grade ${row.strand_grade ?? "-"}` });
  }

  // Codes outside the B<n>.<strand>.<sub-strand>.<standard>.<indicator> shape
  // (a "-2" suffix marks a code the source reused), and text carrying a
  // column heading, footer, or control character the extraction should have
  // dropped.
  const suspicious = await sql`
    select i.code, left(i.text, 80) as text, coalesce(r.version, 'seed, no release') as release,
           case
             when i.code !~ '^B[1-9]\\.\\d{1,2}\\.\\d{1,2}\\.\\d{1,2}\\.\\d{1,2}(-\\d)?$' then 'code shape'
             when i.text ~* '(CORE COMPETENC|INDICATORS AND EXEMPLAR|CONTENT STANDARD|NaCCA, Ministry|SUBJECT SPECIFIC PRACTICE)' then 'heading or footer in text'
             when i.text ~ '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\uFFFD]' then 'control character in text'
             when length(btrim(i.text)) < 12 then 'very short text'
           end as why
    from indicators i
    join grades g on g.id = i.grade_id
    join education_levels l on l.id = g.education_level_id
    left join curriculum_releases r on r.id = i.release_id
    where (
      i.code !~ '^B[1-9]\\.\\d{1,2}\\.\\d{1,2}\\.\\d{1,2}\\.\\d{1,2}(-\\d)?$'
      or i.text ~* '(CORE COMPETENC|INDICATORS AND EXEMPLAR|CONTENT STANDARD|NaCCA, Ministry|SUBJECT SPECIFIC PRACTICE)'
      or i.text ~ '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\uFFFD]'
      or length(btrim(i.text)) < 12
    ) ${levelFilter}
    order by i.code
  `;
  for (const row of suspicious) issues.push({ check: "suspicious", detail: `${row.code} [${row.release}] (${row.why}): ${row.text}` });

  const suspiciousExemplars = await sql`
    select i.code, e.code as exemplar, left(e.text, 80) as text
    from indicator_exemplars e
    join indicators i on i.id = e.indicator_id
    join grades g on g.id = i.grade_id
    join education_levels l on l.id = g.education_level_id
    where (e.text ~* '(CORE COMPETENC|INDICATORS AND EXEMPLAR|NaCCA, Ministry|SUBJECT SPECIFIC PRACTICE)'
       or e.text ~ '[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\uFFFD]') ${levelFilter}
    order by i.code
  `;
  for (const row of suspiciousExemplars) issues.push({ check: "suspicious-exemplar", detail: `${row.exemplar ?? row.code}: ${row.text}` });

  return issues;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const level = arg("--level");
  const jsonPath = arg("--json");

  const subjects = await subjectReports(level);
  const issues = await crossChecks(level);

  const grades = [...new Set(subjects.flatMap((s) => Object.keys(s.indicatorsByGrade)))].sort();
  const pad = (value: string | number, width: number) => String(value).padEnd(width);
  console.log(`\n${pad("Subject", 32)}${pad("Level", 8)}${pad("Release", 44)}${grades.map((g) => pad(g, 5)).join("")}${pad("Total", 7)}${pad("Exemp.", 8)}${pad("Review", 8)}${pad("No CS", 7)}Document`);
  for (const s of subjects) {
    console.log(
      `${pad(s.subject, 32)}${pad(s.level, 8)}${pad(s.releaseVersion ?? "(seed, no release)", 44)}` +
        grades.map((g) => pad(s.indicatorsByGrade[g] ?? "-", 5)).join("") +
        `${pad(s.indicators, 7)}${pad(s.exemplars, 8)}${pad(s.needsReview, 8)}${pad(s.missingContentStandard, 7)}${s.documentTitle ?? "-"}`
    );
    const blanks = [
      s.blankIndicatorText && `${s.blankIndicatorText} blank indicator text`,
      s.blankExemplarText && `${s.blankExemplarText} blank exemplar text`,
      s.missingSourcePage && `${s.missingSourcePage} without a source page`,
      s.missingRawSource && `${s.missingRawSource} without raw source text`,
    ].filter(Boolean);
    if (blanks.length) console.log(`${" ".repeat(32)}  ! ${blanks.join("; ")}`);
  }

  const byCheck = Map.groupBy(issues, (issue) => issue.check);
  console.log(`\nCross-subject checks: ${issues.length} finding(s)`);
  for (const [check, list] of byCheck) {
    console.log(`\n[${check}] ${list.length}`);
    for (const issue of list.slice(0, 40)) console.log(`  - ${issue.detail}`);
    if (list.length > 40) console.log(`  ... and ${list.length - 40} more`);
  }

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), level, subjects, issues }, null, 2));
    console.log(`\nWritten to ${jsonPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
