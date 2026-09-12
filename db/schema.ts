import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curriculumFrameworks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
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

export const strands = pgTable(
  "strands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("strands_subject_name_unique").on(table.subjectId, table.name),
  ]
);

export const subStrands = pgTable(
  "sub_strands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    strandId: uuid("strand_id")
      .notNull()
      .references(() => strands.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("sub_strands_strand_name_unique").on(table.strandId, table.name),
  ]
);

export const indicators = pgTable(
  "indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subStrandId: uuid("sub_strand_id")
      .notNull()
      .references(() => subStrands.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    text: text("text").notNull(),
    bloomsLevel: text("blooms_level").notNull(),
    gradeId: uuid("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "restrict" }),
    // Retained while existing clients and saved lessons migrate to gradeId.
    grade: text("grade").notNull(),
  },
  (table) => [
    uniqueIndex("indicators_grade_sub_strand_code_unique").on(
      table.gradeId,
      table.subStrandId,
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
    code: text("code").notNull(),
    text: text("text").notNull(),
    sortOrder: integer("sort_order").notNull(),
    revision: text("revision").notNull(),
    sourceReference: text("source_reference"),
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

export const savedLessons = pgTable("saved_lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  indicatorCode: text("indicator_code").notNull(),
  subject: text("subject").notNull(),
  curriculumSlug: text("curriculum_slug").default("ghana-nacca-sbc").notNull(),
  levelCode: text("level_code").default("JHS").notNull(),
  grade: text("grade").notNull(),
  strand: text("strand").notNull(),
  subStrand: text("sub_strand").notNull(),
  teacherNotes: text("teacher_notes").notNull(),
  visualPrompts: text("visual_prompts").notNull(),
  studentReading: text("student_reading").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});