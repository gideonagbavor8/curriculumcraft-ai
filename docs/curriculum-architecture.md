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

The normalized hierarchy is:

`curriculum_frameworks -> education_levels -> grades`

`curriculum_frameworks -> subjects -> strands -> sub_strands -> indicators -> indicator_exemplars`

Each indicator also belongs to one normalized grade.

- A framework identifies a country, authority, and version. Ghana NaCCA SBC is the
  default, but additional African curricula can coexist by slug.
- Levels are ordered framework-owned entities such as Primary, JHS, SHS, or TVET.
- Grades are ordered level-owned entities with optional typical age ranges.
- Subjects are framework-scoped rather than globally scoped.
- Indicator identity is scoped to grade, sub-strand, and code.
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
age metadata. Each indicator now includes an `exemplars` array. By default the API
returns exemplars matching the framework's current version; callers may request a
specific historical set with `revision=...`. Existing `subject` and `grade` calls
remain valid, and indicators without exemplars return an empty array.

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
npm run curriculum:import -- data/ghana-primary.csv
npm run curriculum:import -- data/ghana-primary.json
```

CSV headers and JSON object keys are:

```text
curriculumSlug,curriculumName,countryCode,authority,version,levelCode,levelName,gradeCode,gradeName,gradeSortOrder,typicalAgeMin,typicalAgeMax,subjectSlug,subjectName,strandName,subStrandName,indicatorCode,indicatorText,bloomsLevel
```

CSV may append these columns and repeat the indicator row once per exemplar:

```text
exemplarCode,exemplarText,exemplarSortOrder,exemplarRevision,exemplarSourceReference
```

JSON records may include an `exemplars` array whose objects contain `code`, `text`,
`sortOrder`, optional `revision` (defaults to the record version), and optional
`sourceReference`. See [CSV example](./examples/curriculum-with-exemplars.csv) and
[JSON example](./examples/curriculum-with-exemplars.json).

JSON can be a record array or `{ "records": [...] }`. Supported Bloom levels are
Remember, Understand, Apply, Analyse, Evaluate, and Create. The importer validates
the complete file before opening a database connection, then upserts framework,
level, grade, subject, strand, sub-strand, and indicator records. Re-importing a
release updates names, metadata, and indicator text without creating duplicates.
When an import includes exemplars for a revision, that indicator/revision set is
treated as authoritative and replaced in order. Other revisions remain available.
Omitting exemplars does not delete existing sets, which keeps old JHS imports
backward-compatible. Run imports against staging first and retry a failed import;
the upsert and replacement operations are idempotent.

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
4. Deploy the catalog-aware API and UI. Legacy grade strings remain operational.
5. Import authoritative curriculum and exemplar records through the importer.
6. Verify counts, exemplar order, revision selection, and sample P1, P6, B7, and B9
  generation before enabling users.
7. In a later release, once all external clients use normalized IDs, consider
   removing the legacy indicator grade column. This is intentionally not part of the
   compatibility migration.

## Future Extensions

SHS and TVET require data rows, not schema changes. A different national curriculum
requires a new framework plus its levels, grades, subjects, and indicators. Future
age bands, differentiation defaults, languages, and pedagogy profiles can be attached
to grades or levels without changing indicator identity or selector contracts.