CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "location_districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"capital" text,
	"is_regional_capital" boolean DEFAULT false NOT NULL,
	"source_reference" text
);
--> statement-breakpoint
CREATE TABLE "location_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"capital" text,
	"source_reference" text
);
--> statement-breakpoint
CREATE TABLE "location_schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"town_id" uuid,
	"district_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"ownership" text,
	"level_band" text,
	"source_reference" text
);
--> statement-breakpoint
CREATE TABLE "location_towns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_district_capital" boolean DEFAULT false NOT NULL,
	"source_reference" text
);
--> statement-breakpoint
ALTER TABLE "location_districts" ADD CONSTRAINT "location_districts_region_id_location_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."location_regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_regions" ADD CONSTRAINT "location_regions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_schools" ADD CONSTRAINT "location_schools_town_id_location_towns_id_fk" FOREIGN KEY ("town_id") REFERENCES "public"."location_towns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_schools" ADD CONSTRAINT "location_schools_district_id_location_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."location_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_towns" ADD CONSTRAINT "location_towns_district_id_location_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."location_districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "location_districts_region_slug_unique" ON "location_districts" USING btree ("region_id","slug");--> statement-breakpoint
CREATE INDEX "location_districts_name_search_idx" ON "location_districts" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "location_regions_country_slug_unique" ON "location_regions" USING btree ("country_id","slug");--> statement-breakpoint
CREATE INDEX "location_regions_name_search_idx" ON "location_regions" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "location_schools_district_slug_unique" ON "location_schools" USING btree ("district_id","slug");--> statement-breakpoint
CREATE INDEX "location_schools_name_search_idx" ON "location_schools" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "location_towns_district_slug_unique" ON "location_towns" USING btree ("district_id","slug");--> statement-breakpoint
CREATE INDEX "location_towns_name_search_idx" ON "location_towns" USING btree ("name");