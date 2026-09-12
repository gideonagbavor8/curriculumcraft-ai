CREATE TABLE "curriculum_frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country_code" text NOT NULL,
	"authority" text NOT NULL,
	"version" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_frameworks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "education_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"education_level_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"typical_age_min" integer,
	"typical_age_max" integer
);
--> statement-breakpoint
INSERT INTO "curriculum_frameworks" ("name", "slug", "country_code", "authority", "version")
VALUES ('Ghana NaCCA Standards-Based Curriculum', 'ghana-nacca-sbc', 'GH', 'NaCCA', 'SBC');
--> statement-breakpoint
INSERT INTO "education_levels" ("curriculum_id", "code", "name", "sort_order")
SELECT "id", 'PRIMARY', 'Primary', 1 FROM "curriculum_frameworks" WHERE "slug" = 'ghana-nacca-sbc'
UNION ALL
SELECT "id", 'JHS', 'JHS', 2 FROM "curriculum_frameworks" WHERE "slug" = 'ghana-nacca-sbc';
--> statement-breakpoint
INSERT INTO "grades" ("education_level_id", "code", "name", "sort_order", "typical_age_min", "typical_age_max")
SELECT levels."id", seed."code", seed."name", seed."sort_order", seed."age_min", seed."age_max"
FROM "education_levels" levels
JOIN (VALUES
	('PRIMARY', 'P1', 'Primary 1', 1, 6, 7),
	('PRIMARY', 'P2', 'Primary 2', 2, 7, 8),
	('PRIMARY', 'P3', 'Primary 3', 3, 8, 9),
	('PRIMARY', 'P4', 'Primary 4', 4, 9, 10),
	('PRIMARY', 'P5', 'Primary 5', 5, 10, 11),
	('PRIMARY', 'P6', 'Primary 6', 6, 11, 12),
	('JHS', 'B7', 'JHS 1', 1, 12, 13),
	('JHS', 'B8', 'JHS 2', 2, 13, 14),
	('JHS', 'B9', 'JHS 3', 3, 14, 15)
) AS seed("level_code", "code", "name", "sort_order", "age_min", "age_max")
	ON seed."level_code" = levels."code";
--> statement-breakpoint
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_slug_unique";--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "grade_id" uuid;--> statement-breakpoint
ALTER TABLE "saved_lessons" ADD COLUMN "curriculum_slug" text DEFAULT 'ghana-nacca-sbc' NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_lessons" ADD COLUMN "level_code" text DEFAULT 'JHS' NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "curriculum_id" uuid;--> statement-breakpoint
UPDATE "subjects"
SET "curriculum_id" = (SELECT "id" FROM "curriculum_frameworks" WHERE "slug" = 'ghana-nacca-sbc');
--> statement-breakpoint
UPDATE "indicators"
SET "grade_id" = "grades"."id"
FROM "grades"
WHERE "grades"."code" = "indicators"."grade";
--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "curriculum_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ALTER COLUMN "grade_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "education_levels" ADD CONSTRAINT "education_levels_curriculum_id_curriculum_frameworks_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curriculum_frameworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_education_level_id_education_levels_id_fk" FOREIGN KEY ("education_level_id") REFERENCES "public"."education_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "education_levels_curriculum_code_unique" ON "education_levels" USING btree ("curriculum_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "grades_level_code_unique" ON "grades" USING btree ("education_level_id","code");--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_curriculum_id_curriculum_frameworks_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curriculum_frameworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_curriculum_slug_unique" ON "subjects" USING btree ("curriculum_id","slug");