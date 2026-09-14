ALTER TABLE "tour_translations" ADD COLUMN "inclusions" text;--> statement-breakpoint
ALTER TABLE "tour_translations" ADD COLUMN "exclusions" text;--> statement-breakpoint
ALTER TABLE "tour_translations" ADD CONSTRAINT "tour_translations_inclusions_length_check" CHECK ("tour_translations"."inclusions" is null or char_length(trim("tour_translations"."inclusions")) >= 10);--> statement-breakpoint
ALTER TABLE "tour_translations" ADD CONSTRAINT "tour_translations_exclusions_length_check" CHECK ("tour_translations"."exclusions" is null or char_length(trim("tour_translations"."exclusions")) >= 10);