ALTER TABLE "site_settings" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "description" DROP DEFAULT;
