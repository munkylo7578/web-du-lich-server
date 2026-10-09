import { relations, sql } from 'drizzle-orm';
import { check, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { DESTINATION_COUNTRIES } from '../contracts/destination-country';
import { images, tourLocale } from './tour-media';

export const countryImageRole = pgEnum('country_image_role', ['cover', 'gallery']);

// Codes intentionally match the existing destination contract (including CB).
export const countries = pgTable('countries', {
  code: varchar('code', { length: 2, enum: DESTINATION_COUNTRIES }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check('countries_code_check', sql`${table.code} in ('LA', 'CB', 'VN')`)]);

export const countryTranslations = pgTable('country_translations', {
  countryCode: varchar('country_code', { length: 2 }).notNull().references(() => countries.code, { onDelete: 'cascade' }),
  locale: tourLocale('locale').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  visa: text('visa'),
  weather: text('weather'),
}, (table) => [
  primaryKey({ columns: [table.countryCode, table.locale] }),
  check('country_translations_name_check', sql`char_length(trim(${table.name})) >= 2`),
]);

export const countryImages = pgTable('country_images', {
  countryCode: varchar('country_code', { length: 2 }).notNull().references(() => countries.code, { onDelete: 'cascade' }),
  imageId: uuid('image_id').notNull().references(() => images.id, { onDelete: 'restrict' }),
  role: countryImageRole('role').notNull(),
  sortOrder: integer('sort_order').notNull(),
}, (table) => [
  primaryKey({ columns: [table.countryCode, table.imageId] }),
  check('country_images_sort_order_check', sql`${table.sortOrder} >= 0`),
  uniqueIndex('country_images_order_idx').on(table.countryCode, table.sortOrder),
  uniqueIndex('country_images_cover_idx').on(table.countryCode).where(sql`${table.role} = 'cover'`),
]);

export const countriesRelations = relations(countries, ({ many }) => ({
  translations: many(countryTranslations),
  imageLinks: many(countryImages),
}));
export const countryTranslationsRelations = relations(countryTranslations, ({ one }) => ({
  country: one(countries, { fields: [countryTranslations.countryCode], references: [countries.code] }),
}));
export const countryImagesRelations = relations(countryImages, ({ one }) => ({
  country: one(countries, { fields: [countryImages.countryCode], references: [countries.code] }),
  image: one(images, { fields: [countryImages.imageId], references: [images.id] }),
}));
