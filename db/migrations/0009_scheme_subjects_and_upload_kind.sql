CREATE TABLE "scheme_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheme_upload_id" uuid NOT NULL,
	"subject_slug" text,
	"subject_label" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheme_weeks" DROP CONSTRAINT "scheme_weeks_scheme_upload_id_scheme_uploads_id_fk";
--> statement-breakpoint
DROP INDEX "scheme_weeks_upload_week_unique";--> statement-breakpoint
DROP INDEX "scheme_weeks_upload_idx";--> statement-breakpoint
ALTER TABLE "scheme_uploads" ADD COLUMN "upload_kind" text DEFAULT 'single_subject' NOT NULL;--> statement-breakpoint
ALTER TABLE "scheme_weeks" ADD COLUMN "scheme_subject_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "scheme_subjects" ADD CONSTRAINT "scheme_subjects_scheme_upload_id_scheme_uploads_id_fk" FOREIGN KEY ("scheme_upload_id") REFERENCES "public"."scheme_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheme_subjects_upload_idx" ON "scheme_subjects" USING btree ("scheme_upload_id");--> statement-breakpoint
ALTER TABLE "scheme_weeks" ADD CONSTRAINT "scheme_weeks_scheme_subject_id_scheme_subjects_id_fk" FOREIGN KEY ("scheme_subject_id") REFERENCES "public"."scheme_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scheme_weeks_subject_week_unique" ON "scheme_weeks" USING btree ("scheme_subject_id","week_number");--> statement-breakpoint
CREATE INDEX "scheme_weeks_subject_idx" ON "scheme_weeks" USING btree ("scheme_subject_id");--> statement-breakpoint
ALTER TABLE "scheme_uploads" DROP COLUMN "subject_slug";--> statement-breakpoint
ALTER TABLE "scheme_weeks" DROP COLUMN "scheme_upload_id";