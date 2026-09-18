# Curriculum Architecture

## Current-State Audit

Before this expansion, curriculum data used four PostgreSQL tables:

`subjects -> strands -> sub_strands -> indicators`

The grade was a free-text value on each indicator. Subjects were globally unique,
and the UI duplicated fixed subject and B7-B9 lists. `GET /api/curriculum` loaded a
subject and optional grade, joined its hierarchy, and assembled nested JSON. Lesson
and activity pages sent the selected indicator directly to generation routes. Both
AI system prompts were fixed to JHS, while saved lessons stored denormalized display
values so existing lessons did not depend on curriculum joins.

The seed contains only JHS sample indicators. It remains the source of those records;
this change does not invent Primary curriculum content.

## Target Model

The normalized, release-aware hierarchy is:

`curriculum_frameworks -> curriculum_releases -> curriculum_documents`

`education_levels -> grades -> grade_subjects -> strands -> sub_strands -> content_standards -> indicators`

`indicators -> indicator_exemplars` and `content_standards/indicators -> curriculum_guidance`

Each indicator also belongs to one normalized grade.

- A framework identifies a country, authority, and version. Ghana NaCCA SBC is the
  default, but additional African curricula can coexist by slug.
- Levels are ordered framework-owned entities such as Primary, JHS, SHS, or TVET.
- Grades are ordered level-owned entities with optional typical age ranges.
- Subjects are framework-scoped rather than globally scoped.
- Primary grades use the official B1-B6 codes. P1-P6 remain accepted aliases at
  API boundaries and are never stored as canonical grade codes.
- Indicator identity is scoped to release, grade, sub-strand, and code.
- Exemplars are child records rather than embedded JSON. Each has a stable import
  code, text, explicit order, curriculum revision, optional source reference, and
  timestamps. Unique keys prevent duplicate codes or positions within an indicator
  revision; a lookup index supports ordered reads.
- The legacy `indicators.grade` value remains during migration so old API clients
  continue to work. New code should use `grade_id` and return the code as `grade`.
- Saved lessons retain their denormalized snapshot and now record curriculum and
  level, preserving old rows while preventing Primary lessons from being labelled JHS.

## API Contracts

`GET /api/curriculum/catalog?curriculum=ghana-nacca-sbc`

Returns framework metadata, ordered levels and grades, and subjects. Selectors use
this endpoint instead of hardcoded arrays.

`GET /api/curriculum?curriculum=ghana-nacca-sbc&level=PRIMARY&grade=P1&subject=mathematics`

Returns the existing nested strand response plus normalized level, grade name, and
age metadata. Each indicator includes its content standard, guidance, provenance,
and `exemplars` array. By default the API selects the latest approved release;
callers may request a specific release with `revision=...`. Existing `subject` and
`grade` calls remain valid, and indicators without exemplars return an empty array.

`GET /api/curriculum/sources?curriculum=ghana-nacca-sbc&revision=<version>`

Returns release metadata and the official source registry, including source URL,
coverage, document SHA-256, and extraction version. Without `revision`, it returns
the most recently approved release.

Generation requests accept optional `curriculumSlug`, `levelCode`, `levelName`,
`gradeName`, and age bounds. When older clients send only `grade`, P1-P6 and B7-B9
metadata is inferred. Prompts vary reading load, abstraction, scaffolding, and task
style by level and typical learner age. Lesson and activity routes load exemplars
from the database using the full indicator hierarchy; client-provided exemplar text
is not trusted. At most 20 ordered exemplars and 1,000 characters per exemplar are
included as bounded grounding context. Lesson responses include curriculum citations
for the exemplars used.

## Import Format

Run either format through the same validated, idempotent importer:

```powershell
npm run curriculum:import -- data/curriculum.json --dry-run
npm run curriculum:import -- data/curriculum.json
```

Dry-run validates and reports counts and a checksum without opening a database
connection. A real import uses one database transaction. Approved releases are
immutable: an identical checksum is a no-op, while changed content must use a new
release version.

Legacy CSV and JSON record arrays remain supported. A provenance-preserving JSON
import uses this envelope:

```json
{
  "manifest": {
    "schemaVersion": "1",
    "releaseStatus": "draft",
    "documents": [{
      "organization": "NaCCA",
      "title": "Official curriculum title",
      "publicationDate": "YYYY-MM-DD",
      "version": "source version",
      "sourceUrl": "https://...",
      "coverage": "grades and subject covered",
      "sha256": "64 hexadecimal characters",
      "extractionVersion": "extractor/version"
    }]
  },
  "records": []
}
```

Records link to a source with `documentSha256` and may include `pdfPage`,
`printedPage`, `sourceReference`, `extractionConfidence`, `reviewStatus`,
`ambiguityFlag`, and `rawSourceText`. A referenced hash must exist in the manifest.
Content standards use `contentStandardCode` and `contentStandardText` together.

JSON records may include `exemplars` and `guidance` arrays. Bloom level, exemplar
code, and exemplar label are optional because they may be absent from the official
source. Guidance may set `target` to `indicator` (default) or `contentStandard`.
The importer validates the complete file before connecting, then atomically upserts
the release, source registry, hierarchy, standards, guidance, exemplars, and import
manifest. Omitting child arrays preserves existing legacy sets. This infrastructure
does not include or import Primary curriculum content.

For production releases, keep source files versioned outside UI code, validate in a
staging database, compare record counts by framework/level/grade/subject, and promote
the same reviewed artifact to production.

## Migration Strategy

1. Apply `0001_curriculum_hierarchy.sql`. It creates Primary and JHS metadata,
   backfills all existing subjects into Ghana NaCCA SBC, maps B7-B9 indicators to
   normalized grades, then enforces foreign keys.
2. Apply `0002_curriculum_import_keys.sql` to replace globally unique indicator codes
   with hierarchy-scoped import keys.
3. Apply `0003_indicator_exemplars.sql`. It adds only the exemplar child table and
  indexes; existing indicator and saved lesson rows are unchanged.
4. Apply `0004_curriculum-source-infrastructure.sql`. It adds releases, documents,
   aliases, grade-subject links, content standards, guidance, provenance, and import
   manifests without replacing existing JHS rows.
5. Deploy the catalog-aware API and UI. Legacy grade strings remain operational.
6. Import a separately reviewed authoritative curriculum artifact through the importer.
7. Verify counts, exemplar order, revision selection, and sample B1, B6, B7, and B9
  generation before enabling users.
8. In a later release, once all external clients use normalized IDs, consider
   removing the legacy indicator grade column. This is intentionally not part of the
   compatibility migration.

## JHS (Common Core Programme) Releases

The JHS curriculum is imported from the twelve 2021 CCP books on
nacca.gov.gh/common-core-programme, one approved release per subject
(`2021-ccp-jhs-<key>`), by `db/extract-jhs-ccp.ts`. The CCP books share a
three-column table (content standard | indicators and exemplars | core
competencies) that differs from the 2019 Primary layout, so they have their own
extractor; it normalises the books' numbering typographies ("B7.1.1.1.1",
"B7 1.1.1.1", "B7/JHS1.1.1.1.1"), measures the column edges from where the codes
sit on each page, and keeps every numbered indicator - flagging rather than
dropping the ones it cannot settle (a code the book reuses, a heading the book
omits, a six-part reference, competency wording bled into a cell).

The first seed's JHS placeholder rows (67 indicators, no release) are kept.
`GET /api/curriculum` serves release-backed rows wherever a release covers the
grade and falls back to the placeholders only where none does. Two seed slugs
were superseded by the official subjects - `english-language` by `english` and
`rme` by `religious-and-moral-education` (the slugs the Primary releases already
used); `lib/curriculum/catalog.ts` hides the superseded slugs from the catalog
and answers requests for them with the replacement.

`npm run curriculum:validate -- --level JHS` reports, per subject and release,
the B7/B8/B9 counts, exemplars, needs-review rows and blank fields, and runs
cross-subject checks for missing grades, duplicate codes, orphans, invalid
grade relationships and heading or footer text left inside a row.

## Future Extensions

SHS and TVET require data rows, not schema changes. A different national curriculum
requires a new framework plus its levels, grades, subjects, and indicators. Future
age bands, differentiation defaults, languages, and pedagogy profiles can be attached
to grades or levels without changing indicator identity or selector contracts.