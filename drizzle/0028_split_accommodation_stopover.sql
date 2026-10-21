ALTER TYPE "public"."service_category" ADD VALUE 'stopover' BEFORE 'transportation';--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "stopover_description" text;