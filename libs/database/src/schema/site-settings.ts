import { relations, sql } from "drizzle-orm";
import { boolean, check, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { tourLocale } from "./tour-media";
import { SETTING_CATEGORIES } from "../contracts/setting-category";

export const SITE_SETTING_TYPES = ["text", "image", "video", "plain_text"] as const;

export type SiteSettingType = (typeof SITE_SETTING_TYPES)[number];

export const siteSettingType = pgEnum("site_setting_type", SITE_SETTING_TYPES);
export const siteSettingCategory = pgEnum("site_setting_category", SETTING_CATEGORIES);

export const siteSettings = pgTable(
  "site_settings",
  {
    key: text("key").primaryKey(),
    category: siteSettingCategory("category").default("general").notNull(),
    description: text("description"),
    value: text("value"),
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
    check(
      "site_settings_value_by_type_check",
      sql`(${table.type} in ('image', 'video') and ${table.value} is not null and char_length(trim(${table.value})) > 0) or (${table.type}::text in ('text', 'plain_text') and ${table.value} is null)`,
    ),
  ],
);

export const siteSettingTranslations = pgTable(
  "site_setting_translations",
  {
    settingKey: text("setting_key")
      .notNull()
      .references(() => siteSettings.key, { onDelete: "cascade", onUpdate: "cascade" }),
    locale: tourLocale("locale").notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.settingKey, table.locale] }),
    check(
      "site_setting_translations_value_not_blank_check",
      sql`char_length(trim(${table.value})) > 0`,
    ),
  ],
);

export const siteSettingsRelations = relations(siteSettings, ({ many }) => ({
  translations: many(siteSettingTranslations),
}));

export const siteSettingTranslationsRelations = relations(siteSettingTranslations, ({ one }) => ({
  setting: one(siteSettings, {
    fields: [siteSettingTranslations.settingKey],
    references: [siteSettings.key],
  }),
}));
