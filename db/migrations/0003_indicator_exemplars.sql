CREATE TABLE "indicator_exemplars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"code" text NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer NOT NULL,
	"revision" text NOT NULL,
	"source_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "indicator_exemplars" ADD CONSTRAINT "indicator_exemplars_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_exemplars_indicator_revision_code_unique" ON "indicator_exemplars" USING btree ("indicator_id","revision","code");--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_exemplars_indicator_revision_order_unique" ON "indicator_exemplars" USING btree ("indicator_id","revision","sort_order");--> statement-breakpoint
CREATE INDEX "indicator_exemplars_lookup_idx" ON "indicator_exemplars" USING btree ("indicator_id","revision","sort_order");