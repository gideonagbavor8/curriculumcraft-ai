CREATE TABLE "scheme_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_content_base64" text NOT NULL,
	"subject_slug" text NOT NULL,
	"grade_code" text NOT NULL,
	"term_label" text,
	"parse_status" text DEFAULT 'pending' NOT NULL,
	"parse_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parse_error" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheme_week_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheme_week_id" uuid NOT NULL,
	"indicator_code" text NOT NULL,
	"indicator_text" text,
	"matched_indicator_id" uuid,
	"match_confidence" text DEFAULT 'unmatched' NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheme_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheme_upload_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"is_non_teaching_week" boolean DEFAULT false NOT NULL,
	"non_teaching_label" text,
	"strand_text" text,
	"sub_strand_text" text,
	"content_standard_code" text,
	"content_standard_text" text,
	"resources_text" text,
	"raw_row_text" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheme_week_indicators" ADD CONSTRAINT "scheme_week_indicators_scheme_week_id_scheme_weeks_id_fk" FOREIGN KEY ("scheme_week_id") REFERENCES "public"."scheme_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheme_week_indicators" ADD CONSTRAINT "scheme_week_indicators_matched_indicator_id_indicators_id_fk" FOREIGN KEY ("matched_indicator_id") REFERENCES "public"."indicators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheme_weeks" ADD CONSTRAINT "scheme_weeks_scheme_upload_id_scheme_uploads_id_fk" FOREIGN KEY ("scheme_upload_id") REFERENCES "public"."scheme_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheme_week_indicators_week_idx" ON "scheme_week_indicators" USING btree ("scheme_week_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheme_weeks_upload_week_unique" ON "scheme_weeks" USING btree ("scheme_upload_id","week_number");--> statement-breakpoint
CREATE INDEX "scheme_weeks_upload_idx" ON "scheme_weeks" USING btree ("scheme_upload_id");