import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const curriculumFrameworks = pgTable("curriculum_frameworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  countryCode: text("country_code").notNull(),
  authority: text("authority").notNull(),
  version: text("version").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const curriculumReleases = pgTable(
  "curriculum_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curriculumFrameworks.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    status: text("status").default("draft").notNull(),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("curriculum_releases_curriculum_version_unique").on(
      table.curriculumId,
      table.version
    ),
  ]
);

export const curriculumDocuments = pgTable(
  "curriculum_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => curriculumReleases.id, { onDelete: "restrict" }),
    organization: text("organization").notNull(),
    title: text("title").notNull(),
    publicationDate: text("publication_date"),
    version: text("version").notNull(),
    sourceUrl: text("source_url").notNull(),
    coverage: text("coverage").notNull(),
    sha256: text("sha256").notNull(),
    extractionVersion: text("extraction_version").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("curriculum_documents_release_sha256_unique").on(
      table.releaseId,
      table.sha256
    ),
  ]
);

export const educationLevels = pgTable(
  "education_levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curriculumFrameworks.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    uniqueIndex("education_levels_curriculum_code_unique").on(
      table.curriculumId,
      table.code
    ),
  ]
);

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    educationLevelId: uuid("education_level_id")
      .notNull()
      .references(() => educationLevels.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    typicalAgeMin: integer("typical_age_min"),
    typicalAgeMax: integer("typical_age_max"),
  },
  (table) => [
    uniqueIndex("grades_level_code_unique").on(
      table.educationLevelId,
      table.code
    ),
  ]
);

export const gradeAliases = pgTable(
  "grade_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gradeId: uuid("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    educationLevelId: uuid("education_level_id")
      .notNull()
      .references(() => educationLevels.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    kind: text("kind").default("display").notNull(),
  },
  (table) => [
    uniqueIndex("grade_aliases_level_alias_unique").on(
      table.educationLevelId,
      table.alias
    ),
  ]
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curriculumFrameworks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayName: text("display_name"),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("subjects_curriculum_slug_unique").on(
      table.curriculumId,
      table.slug
    ),
  ]
);

export const gradeSubjects = pgTable(
  "grade_subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gradeId: uuid("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    releaseId: uuid("release_id")
      .references(() => curriculumReleases.id, { onDelete: "restrict" }),
    documentId: uuid("document_id")
      .references(() => curriculumDocuments.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    uniqueIndex("grade_subjects_grade_subject_release_unique").on(
      table.gradeId,
      table.subjectId,
      table.releaseId
    ),
  ]
);

export const strands = pgTable(
  "strands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    gradeSubjectId: uuid("grade_subject_id").references(() => gradeSubjects.id, {
      onDelete: "cascade",
    }),
    code: text("code"),
    name: text("name").notNull(),
    displayName: text("display_name"),
    sortOrder: integer("sort_order"),
    documentId: uuid("document_id").references(() => curriculumDocuments.id, {
      onDelete: "restrict",
    }),
    pdfPage: integer("pdf_page"),
    printedPage: text("printed_page"),
    sourceReference: text("source_reference"),
  },
  (table) => [
    uniqueIndex("strands_legacy_subject_name_unique")
      .on(table.subjectId, table.name)
      .where(sql`${table.gradeSubjectId} is null`),
    uniqueIndex("strands_grade_subject_code_unique")
      .on(table.gradeSubjectId, table.code)
      .where(sql`${table.gradeSubjectId} is not null`),
  ]
);

export const subStrands = pgTable(
  "sub_strands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    strandId: uuid("strand_id")
      .notNull()
      .references(() => strands.id, { onDelete: "cascade" }),
    code: text("code"),
    name: text("name").notNull(),
    displayName: text("display_name"),
    sortOrder: integer("sort_order"),
    documentId: uuid("document_id").references(() => curriculumDocuments.id, {
      onDelete: "restrict",
    }),
    pdfPage: integer("pdf_page"),
    printedPage: text("printed_page"),
    sourceReference: text("source_reference"),
  },
  (table) => [
    uniqueIndex("sub_strands_strand_name_unique").on(table.strandId, table.name),
  ]
);

export const contentStandards = pgTable(
  "content_standards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subStrandId: uuid("sub_strand_id")
      .notNull()
      .references(() => subStrands.id, { onDelete: "cascade" }),
    gradeId: uuid("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "restrict" }),
    releaseId: uuid("release_id")
      .references(() => curriculumReleases.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    text: text("text").notNull(),
    displayText: text("display_text"),
    sortOrder: integer("sort_order").notNull(),
    documentId: uuid("document_id").references(() => curriculumDocuments.id, {
      onDelete: "restrict",
    }),
    pdfPage: integer("pdf_page"),
    printedPage: text("printed_page"),
    sourceReference: text("source_reference"),
    extractionConfidence: text("extraction_confidence"),
    reviewStatus: text("review_status").default("pending").notNull(),
    ambiguityFlag: boolean("ambiguity_flag").default(false).notNull(),
    rawSourceText: text("raw_source_text"),
  },
  (table) => [
    uniqueIndex("content_standards_grade_sub_strand_release_code_unique").on(
      table.gradeId,
      table.subStrandId,
      table.releaseId,
      table.code
    ),
  ]
);

export const indicators = pgTable(
  "indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subStrandId: uuid("sub_strand_id")
      .notNull()
      .references(() => subStrands.id, { onDelete: "cascade" }),
    contentStandardId: uuid("content_standard_id").references(
      () => contentStandards.id,
      { onDelete: "restrict" }
    ),
    releaseId: uuid("release_id").references(() => curriculumReleases.id, {
      onDelete: "restrict",
    }),
    code: text("code").notNull(),
    text: text("text").notNull(),
    displayText: text("display_text"),
    bloomsLevel: text("blooms_level"),
    sortOrder: integer("sort_order"),
    documentId: uuid("document_id").references(() => curriculumDocuments.id, {
      onDelete: "restrict",
    }),
    pdfPage: integer("pdf_page"),
    printedPage: text("printed_page"),
    sourceReference: text("source_reference"),
    extractionConfidence: text("extraction_confidence"),
    reviewStatus: text("review_status").default("pending").notNull(),
    ambiguityFlag: boolean("ambiguity_flag").default(false).notNull(),
    rawSourceText: text("raw_source_text"),
    gradeId: uuid("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "restrict" }),
    // Retained while existing clients and saved lessons migrate to gradeId.
    grade: text("grade").notNull(),
  },
  (table) => [
    uniqueIndex("indicators_legacy_grade_sub_strand_code_unique")
      .on(table.gradeId, table.subStrandId, table.code)
      .where(sql`${table.releaseId} is null`),
    uniqueIndex("indicators_grade_sub_strand_release_code_unique").on(
      table.gradeId,
      table.subStrandId,
      table.releaseId,
      table.code
    ),
  ]
);

export const indicatorExemplars = pgTable(
  "indicator_exemplars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    indicatorId: uuid("indicator_id")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    code: text("code"),
    label: text("label"),
    text: text("text").notNull(),
    sortOrder: integer("sort_order").notNull(),
    revision: text("revision").notNull(),
    sourceReference: text("source_reference"),
    documentId: uuid("document_id").references(() => curriculumDocuments.id, {
      onDelete: "restrict",
    }),
    pdfPage: integer("pdf_page"),
    printedPage: text("printed_page"),
    extractionConfidence: text("extraction_confidence"),
    reviewStatus: text("review_status").default("pending").notNull(),
    ambiguityFlag: boolean("ambiguity_flag").default(false).notNull(),
    rawSourceText: text("raw_source_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("indicator_exemplars_indicator_revision_code_unique").on(
      table.indicatorId,
      table.revision,
      table.code
    ),
    uniqueIndex("indicator_exemplars_indicator_revision_order_unique").on(
      table.indicatorId,
      table.revision,
      table.sortOrder
    ),
    index("indicator_exemplars_lookup_idx").on(
      table.indicatorId,
      table.revision,
      table.sortOrder
    ),
  ]
);

export const curriculumGuidance = pgTable(
  "curriculum_guidance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentStandardId: uuid("content_standard_id").references(
      () => contentStandards.id,
      { onDelete: "cascade" }
    ),
    indicatorId: uuid("indicator_id").references(() => indicators.id, {
      onDelete: "cascade",
    }),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    sortOrder: integer("sort_order").notNull(),
    documentId: uuid("document_id").references(() => curriculumDocuments.id, {
      onDelete: "restrict",
    }),
    pdfPage: integer("pdf_page"),
    printedPage: text("printed_page"),
    sourceReference: text("source_reference"),
    extractionConfidence: text("extraction_confidence"),
    reviewStatus: text("review_status").default("pending").notNull(),
    ambiguityFlag: boolean("ambiguity_flag").default(false).notNull(),
    rawSourceText: text("raw_source_text"),
  },
  (table) => [
    index("curriculum_guidance_indicator_order_idx").on(
      table.indicatorId,
      table.kind,
      table.sortOrder
    ),
  ]
);

export const curriculumImportManifests = pgTable(
  "curriculum_import_manifests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => curriculumReleases.id, { onDelete: "restrict" }),
    checksum: text("checksum").notNull(),
    sourceFileName: text("source_file_name").notNull(),
    status: text("status").notNull(),
    recordCount: integer("record_count").notNull(),
    exemplarCount: integer("exemplar_count").notNull(),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("curriculum_import_manifests_release_checksum_unique").on(
      table.releaseId,
      table.checksum
    ),
  ]
);

export const savedLessons = pgTable("saved_lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  indicatorCode: text("indicator_code").notNull(),
  subject: text("subject").notNull(),
  curriculumSlug: text("curriculum_slug").default("ghana-nacca-sbc").notNull(),
  levelCode: text("level_code").default("JHS").notNull(),
  grade: text("grade").notNull(),
  strand: text("strand").notNull(),
  subStrand: text("sub_strand").notNull(),
  lessonPlan: text("lesson_plan"),
  teacherNotes: text("teacher_notes").notNull(),
  visualPrompts: text("visual_prompts").notNull(),
  studentReading: text("student_reading").notNull(),
  lessonHeader: jsonb("lesson_header"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Location database (countries -> regions -> districts -> towns -> schools) ---
// Deliberately generic (country_id everywhere) so a second country can be added
// later without changing this schema - only its rows.

export const countries = pgTable("countries", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // ISO 3166-1 alpha-2, e.g. "GH"
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const locationRegions = pgTable(
  "location_regions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    capital: text("capital"),
    sourceReference: text("source_reference"),
  },
  (table) => [
    uniqueIndex("location_regions_country_slug_unique").on(table.countryId, table.slug),
    index("location_regions_name_search_idx").on(table.name),
  ]
);

export const locationDistricts = pgTable(
  "location_districts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    regionId: uuid("region_id")
      .notNull()
      .references(() => locationRegions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // Ghana MMDA category; kept as free text so other countries' equivalent
    // administrative-unit terminology doesn't require a schema change.
    category: text("category").notNull(),
    capital: text("capital"),
    isRegionalCapital: boolean("is_regional_capital").default(false).notNull(),
    sourceReference: text("source_reference"),
  },
  (table) => [
    uniqueIndex("location_districts_region_slug_unique").on(table.regionId, table.slug),
    index("location_districts_name_search_idx").on(table.name),
  ]
);

export const locationTowns = pgTable(
  "location_towns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    districtId: uuid("district_id")
      .notNull()
      .references(() => locationDistricts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isDistrictCapital: boolean("is_district_capital").default(false).notNull(),
    sourceReference: text("source_reference"),
  },
  (table) => [
    uniqueIndex("location_towns_district_slug_unique").on(table.districtId, table.slug),
    index("location_towns_name_search_idx").on(table.name),
  ]
);

export const locationSchools = pgTable(
  "location_schools",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    townId: uuid("town_id").references(() => locationTowns.id, { onDelete: "cascade" }),
    districtId: uuid("district_id")
      .notNull()
      .references(() => locationDistricts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownership: text("ownership"), // "public" | "private" | null if unknown
    levelBand: text("level_band"), // "KG" | "Primary" | "JHS" | "SHS" | null if unknown
    sourceReference: text("source_reference"),
  },
  (table) => [
    uniqueIndex("location_schools_district_slug_unique").on(table.districtId, table.slug),
    index("location_schools_name_search_idx").on(table.name),
  ]
);

// Scheme of Learning upload/parse pipeline - the uploaded file is the source
// of truth (see lib/schemeImport/*); these tables store the parsed result,
// never the curriculum DB's own wording, so a teacher's school-specific
// scheme is preserved verbatim even where an indicator code matches.
//
// One upload can contain multiple subjects (a "full school" scheme bundles
// every subject's schedule in one file) - each subject found gets its own
// schemeSubjects row, which owns that subject's weeks. A single-subject or
// single-week upload just produces exactly one schemeSubjects row.
export const schemeUploads = pgTable("scheme_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  // Base64-encoded original file bytes - no external blob storage configured
  // yet, and scheme documents are small (a few pages), so Postgres text is
  // sufficient for now.
  fileContentBase64: text("file_content_base64").notNull(),
  gradeCode: text("grade_code").notNull(),
  termLabel: text("term_label"),
  // "full_school" (many subjects in one file) | "single_subject" (the
  // existing/default case) | "single_week" (one week only, e.g. a photo of
  // one page - see lib/schemeImport for how each is parsed/imported).
  uploadKind: text("upload_kind").default("single_subject").notNull(),
  // "pending" | "parsed" | "needs_review" | "failed"
  parseStatus: text("parse_status").default("pending").notNull(),
  parseWarnings: jsonb("parse_warnings").$type<string[]>().default([]).notNull(),
  parseError: text("parse_error"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const schemeSubjects = pgTable(
  "scheme_subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schemeUploadId: uuid("scheme_upload_id")
      .notNull()
      .references(() => schemeUploads.id, { onDelete: "cascade" }),
    // Resolved against the curriculum DB's subjects.slug when confidently
    // matched; null when the subject couldn't be auto-detected (full-school
    // uploads only) - subjectLabel is always the display name either way.
    subjectSlug: text("subject_slug"),
    subjectLabel: text("subject_label").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("scheme_subjects_upload_idx").on(table.schemeUploadId)]
);

export const schemeWeeks = pgTable(
  "scheme_weeks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schemeSubjectId: uuid("scheme_subject_id")
      .notNull()
      .references(() => schemeSubjects.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    isNonTeachingWeek: boolean("is_non_teaching_week").default(false).notNull(),
    nonTeachingLabel: text("non_teaching_label"),
    // Carried forward from the last non-blank row when a school's table
    // merges/blanks these cells across consecutive weeks of the same
    // strand/sub-strand - see lib/schemeImport/normalizeRows.ts.
    strandText: text("strand_text"),
    subStrandText: text("sub_strand_text"),
    contentStandardCode: text("content_standard_code"),
    contentStandardText: text("content_standard_text"),
    resourcesText: text("resources_text"),
    rawRowText: text("raw_row_text"),
    sortOrder: integer("sort_order").notNull(),
  },
  // No unique key on (subject, week): a scheme laid out strand by strand
  // restarts its week numbering for every strand, so one subject legitimately
  // has several "Week 1" rows. sortOrder is what keeps them in document order.
  (table) => [index("scheme_weeks_subject_idx").on(table.schemeSubjectId)]
);

export const schemeWeekIndicators = pgTable(
  "scheme_week_indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schemeWeekId: uuid("scheme_week_id")
      .notNull()
      .references(() => schemeWeeks.id, { onDelete: "cascade" }),
    // Exactly as printed in the uploaded scheme - never overwritten by a
    // curriculum DB match, only annotated with one.
    indicatorCode: text("indicator_code").notNull(),
    indicatorText: text("indicator_text"),
    matchedIndicatorId: uuid("matched_indicator_id").references(() => indicators.id, {
      onDelete: "set null",
    }),
    // "exact" | "fuzzy" | "unmatched"
    matchConfidence: text("match_confidence").default("unmatched").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("scheme_week_indicators_week_idx").on(table.schemeWeekId)]
);