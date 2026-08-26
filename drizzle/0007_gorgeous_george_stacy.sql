CREATE TABLE "site_setting_translations" (
	"setting_key" text NOT NULL,
	"locale" "tour_locale" NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_setting_translations_setting_key_locale_pk" PRIMARY KEY("setting_key","locale"),
	CONSTRAINT "site_setting_translations_value_not_blank_check" CHECK (char_length(trim("site_setting_translations"."value")) > 0)
);
--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_value_not_blank_check";--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "site_setting_translations" ADD CONSTRAINT "site_setting_translations_setting_key_site_settings_key_fk" FOREIGN KEY ("setting_key") REFERENCES "public"."site_settings"("key") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
INSERT INTO "site_setting_translations" ("setting_key", "locale", "value", "created_at", "updated_at")
SELECT "key", 'vi'::"tour_locale", "value", "created_at", "updated_at"
FROM "site_settings"
WHERE "type" = 'text';--> statement-breakpoint
UPDATE "site_settings" SET "value" = NULL WHERE "type" = 'text';--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_value_by_type_check" CHECK (("site_settings"."type" = 'image' and "site_settings"."value" is not null and char_length(trim("site_settings"."value")) > 0) or ("site_settings"."type" = 'text' and "site_settings"."value" is null));
