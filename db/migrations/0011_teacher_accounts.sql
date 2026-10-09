CREATE TABLE "auth_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"resource_type" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "teacher_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_lessons" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "scheme_uploads" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "saved_resources" ADD CONSTRAINT "saved_resources_user_id_teacher_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."teacher_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_sessions" ADD CONSTRAINT "teacher_sessions_user_id_teacher_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."teacher_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_resources_user_idx" ON "saved_resources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teacher_sessions_user_idx" ON "teacher_sessions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "saved_lessons" ADD CONSTRAINT "saved_lessons_user_id_teacher_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."teacher_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheme_uploads" ADD CONSTRAINT "scheme_uploads_user_id_teacher_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."teacher_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_lessons_user_idx" ON "saved_lessons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheme_uploads_user_idx" ON "scheme_uploads" USING btree ("user_id");