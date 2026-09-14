CREATE TYPE "public"."service_category" AS ENUM('accommodation', 'transportation', 'tourguide');--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "category" "service_category" NOT NULL;