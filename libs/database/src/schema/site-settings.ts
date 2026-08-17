import { sql } from "drizzle-orm";
import { boolean, check, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const SITE_SETTING_TYPES = ["text", "image"] as const;

export type SiteSettingType = (typeof SITE_SETTING_TYPES)[number];

export const siteSettingType = pgEnum("site_setting_type", SITE_SETTING_TYPES);

export const siteSettings = pgTable(
  "site_settings",
  {
    key: text("key").primaryKey(),
    description: text("description"),
    value: text("value").notNull(),
    type: siteSettingType("type").default("text").notNull(),
    canDelete: boolean("can_delete").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("site_settings_key_not_blank_check", sql`char_length(trim(${table.key})) > 0`),
    check("site_settings_value_not_blank_check", sql`char_length(trim(${table.value})) > 0`),
  ],
);
