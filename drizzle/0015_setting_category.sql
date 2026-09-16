CREATE TYPE "public"."site_setting_category" AS ENUM('general', 'home');--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "category" "site_setting_category" DEFAULT 'general' NOT NULL;