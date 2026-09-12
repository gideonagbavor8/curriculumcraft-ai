ALTER TABLE "indicators" DROP CONSTRAINT "indicators_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "indicators_grade_sub_strand_code_unique" ON "indicators" USING btree ("grade_id","sub_strand_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "strands_subject_name_unique" ON "strands" USING btree ("subject_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_strands_strand_name_unique" ON "sub_strands" USING btree ("strand_id","name");