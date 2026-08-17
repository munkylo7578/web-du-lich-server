DO $$ BEGIN
 CREATE TYPE "public"."site_setting_type" AS ENUM('text', 'image');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "type" "site_setting_type" DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_key_not_blank_check" CHECK (char_length(trim("site_settings"."key")) > 0);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_value_not_blank_check" CHECK (char_length(trim("site_settings"."value")) > 0);
