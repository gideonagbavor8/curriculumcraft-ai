CREATE TABLE "indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub_strand_id" uuid NOT NULL,
	"code" text NOT NULL,
	"text" text NOT NULL,
	"blooms_level" text NOT NULL,
	"grade" text NOT NULL,
	CONSTRAINT "indicators_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "saved_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_code" text NOT NULL,
	"subject" text NOT NULL,
	"grade" text NOT NULL,
	"strand" text NOT NULL,
	"sub_strand" text NOT NULL,
	"teacher_notes" text NOT NULL,
	"visual_prompts" text NOT NULL,
	"student_reading" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_strands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strand_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_sub_strand_id_sub_strands_id_fk" FOREIGN KEY ("sub_strand_id") REFERENCES "public"."sub_strands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strands" ADD CONSTRAINT "strands_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_strands" ADD CONSTRAINT "sub_strands_strand_id_strands_id_fk" FOREIGN KEY ("strand_id") REFERENCES "public"."strands"("id") ON DELETE cascade ON UPDATE no action;