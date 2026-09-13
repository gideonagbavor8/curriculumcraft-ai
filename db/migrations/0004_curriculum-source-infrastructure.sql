CREATE TABLE "content_standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub_strand_id" uuid NOT NULL,
	"grade_id" uuid NOT NULL,
	"release_id" uuid,
	"code" text NOT NULL,
	"text" text NOT NULL,
	"display_text" text,
	"sort_order" integer NOT NULL,
	"document_id" uuid,
	"pdf_page" integer,
	"printed_page" text,
	"source_reference" text,
	"extraction_confidence" text,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"ambiguity_flag" boolean DEFAULT false NOT NULL,
	"raw_source_text" text
);
--> statement-breakpoint
CREATE TABLE "curriculum_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"organization" text NOT NULL,
	"title" text NOT NULL,
	"publication_date" text,
	"version" text NOT NULL,
	"source_url" text NOT NULL,
	"coverage" text NOT NULL,
	"sha256" text NOT NULL,
	"extraction_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_guidance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_standard_id" uuid,
	"indicator_id" uuid,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer NOT NULL,
	"document_id" uuid,
	"pdf_page" integer,
	"printed_page" text,
	"source_reference" text,
	"extraction_confidence" text,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"ambiguity_flag" boolean DEFAULT false NOT NULL,
	"raw_source_text" text
);
--> statement-breakpoint
CREATE TABLE "curriculum_import_manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"checksum" text NOT NULL,
	"source_file_name" text NOT NULL,
	"status" text NOT NULL,
	"record_count" integer NOT NULL,
	"exemplar_count" integer NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"version" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grade_id" uuid NOT NULL,
	"education_level_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"kind" text DEFAULT 'display' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grade_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"release_id" uuid,
	"document_id" uuid,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
DROP INDEX "indicators_grade_sub_strand_code_unique";--> statement-breakpoint
DROP INDEX "strands_subject_name_unique";--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ALTER COLUMN "blooms_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "pdf_page" integer;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "printed_page" text;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "extraction_confidence" text;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "review_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "ambiguity_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD COLUMN "raw_source_text" text;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "content_standard_id" uuid;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "release_id" uuid;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "display_text" text;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "pdf_page" integer;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "printed_page" text;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "source_reference" text;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "extraction_confidence" text;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "review_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "ambiguity_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "raw_source_text" text;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "grade_subject_id" uuid;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "pdf_page" integer;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "printed_page" text;--> statement-breakpoint
ALTER TABLE "strands" ADD COLUMN "source_reference" text;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD COLUMN "pdf_page" integer;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD COLUMN "printed_page" text;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD COLUMN "source_reference" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_sub_strand_id_sub_strands_id_fk" FOREIGN KEY ("sub_strand_id") REFERENCES "public"."sub_strands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_release_id_curriculum_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."curriculum_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_document_id_curriculum_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."curriculum_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_documents" ADD CONSTRAINT "curriculum_documents_release_id_curriculum_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."curriculum_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_guidance" ADD CONSTRAINT "curriculum_guidance_content_standard_id_content_standards_id_fk" FOREIGN KEY ("content_standard_id") REFERENCES "public"."content_standards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_guidance" ADD CONSTRAINT "curriculum_guidance_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_guidance" ADD CONSTRAINT "curriculum_guidance_document_id_curriculum_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."curriculum_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_import_manifests" ADD CONSTRAINT "curriculum_import_manifests_release_id_curriculum_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."curriculum_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_releases" ADD CONSTRAINT "curriculum_releases_curriculum_id_curriculum_frameworks_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curriculum_frameworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_aliases" ADD CONSTRAINT "grade_aliases_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_aliases" ADD CONSTRAINT "grade_aliases_education_level_id_education_levels_id_fk" FOREIGN KEY ("education_level_id") REFERENCES "public"."education_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_release_id_curriculum_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."curriculum_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_document_id_curriculum_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."curriculum_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_standards_grade_sub_strand_release_code_unique" ON "content_standards" USING btree ("grade_id","sub_strand_id","release_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_documents_release_sha256_unique" ON "curriculum_documents" USING btree ("release_id","sha256");--> statement-breakpoint
CREATE INDEX "curriculum_guidance_indicator_order_idx" ON "curriculum_guidance" USING btree ("indicator_id","kind","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_import_manifests_release_checksum_unique" ON "curriculum_import_manifests" USING btree ("release_id","checksum");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_releases_curriculum_version_unique" ON "curriculum_releases" USING btree ("curriculum_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_aliases_level_alias_unique" ON "grade_aliases" USING btree ("education_level_id","alias");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_subjects_grade_subject_release_unique" ON "grade_subjects" USING btree ("grade_id","subject_id","release_id");--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD CONSTRAINT "indicator_exemplars_document_id_curriculum_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."curriculum_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_content_standard_id_content_standards_id_fk" FOREIGN KEY ("content_standard_id") REFERENCES "public"."content_standards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_release_id_curriculum_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."curriculum_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_document_id_curriculum_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."curriculum_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strands" ADD CONSTRAINT "strands_grade_subject_id_grade_subjects_id_fk" FOREIGN KEY ("grade_subject_id") REFERENCES "public"."grade_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strands" ADD CONSTRAINT "strands_document_id_curriculum_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."curriculum_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD CONSTRAINT "sub_strands_document_id_curriculum_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."curriculum_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "indicators_legacy_grade_sub_strand_code_unique" ON "indicators" USING btree ("grade_id","sub_strand_id","code") WHERE "indicators"."release_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "indicators_grade_sub_strand_release_code_unique" ON "indicators" USING btree ("grade_id","sub_strand_id","release_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "strands_legacy_subject_name_unique" ON "strands" USING btree ("subject_id","name") WHERE "strands"."grade_subject_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "strands_grade_subject_code_unique" ON "strands" USING btree ("grade_subject_id","code") WHERE "strands"."grade_subject_id" is not null;
--> statement-breakpoint
UPDATE "grades"
SET
	"code" = 'B' || substring("grades"."code" from 2),
	"name" = 'Basic ' || substring("grades"."code" from 2)
FROM "education_levels"
WHERE "grades"."education_level_id" = "education_levels"."id"
	AND "education_levels"."code" = 'PRIMARY'
	AND "grades"."code" ~ '^P[1-6]$';
--> statement-breakpoint
INSERT INTO "grade_aliases" ("grade_id", "education_level_id", "alias", "kind")
SELECT "grades"."id", "grades"."education_level_id", 'P' || substring("grades"."code" from 2), 'legacy'
FROM "grades"
INNER JOIN "education_levels" ON "grades"."education_level_id" = "education_levels"."id"
WHERE "education_levels"."code" = 'PRIMARY'
	AND "grades"."code" ~ '^B[1-6]$'
ON CONFLICT ("education_level_id", "alias") DO NOTHING;