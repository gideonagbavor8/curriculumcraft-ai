import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const strands = pgTable("strands", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const subStrands = pgTable("sub_strands", {
  id: uuid("id").defaultRandom().primaryKey(),
  strandId: uuid("strand_id")
    .notNull()
    .references(() => strands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const indicators = pgTable("indicators", {
  id: uuid("id").defaultRandom().primaryKey(),
  subStrandId: uuid("sub_strand_id")
    .notNull()
    .references(() => subStrands.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  text: text("text").notNull(),
  bloomsLevel: text("blooms_level").notNull(),
  grade: text("grade").notNull(),
});

export const savedLessons = pgTable("saved_lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  indicatorCode: text("indicator_code").notNull(),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  strand: text("strand").notNull(),
  subStrand: text("sub_strand").notNull(),
  teacherNotes: text("teacher_notes").notNull(),
  visualPrompts: text("visual_prompts").notNull(),
  studentReading: text("student_reading").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});