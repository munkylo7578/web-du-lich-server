ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "can_delete" boolean DEFAULT true NOT NULL;
