import { relations, sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { wards } from "./geo-location";

export const TOUR_LOCALES = ["vi", "en"] as const;

export type TourLocale = (typeof TOUR_LOCALES)[number];

export type LocalizedText = Partial<Record<TourLocale, string>>;

export type TourPlanSnapshot = {
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
};

export const tourImageRole = pgEnum("tour_image_role", ["cover", "gallery"]);

export const tours = pgTable(
  "tours",
  {
    id: uuid("id").primaryKey(),
    plans: jsonb("plans").$type<TourPlanSnapshot[]>().default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("tours_plans_array_check", sql`jsonb_typeof(${table.plans}) = 'array'`),
  ],
);

export const tourLocale = pgEnum("tour_locale", ["vi", "en"]);

export const tourTranslations = pgTable(
  "tour_translations",
  {
    tourId: uuid("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade", onUpdate: "cascade" }),
    locale: tourLocale("locale").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tourId, table.locale] }),
    check(
      "tour_translations_name_length_check",
      sql`char_length(trim(${table.name})) >= 2`,
    ),
    check(
      "tour_translations_description_length_check",
      sql`${table.description} is null or char_length(trim(${table.description})) >= 10`,
    ),
    index("tour_translations_locale_name_idx").on(table.locale, table.name),
  ],
);

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const destinationTranslations = pgTable(
  "destination_translations",
  {
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    locale: tourLocale("locale").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.destinationId, table.locale] }),
    check(
      "destination_translations_name_length_check",
      sql`char_length(trim(${table.name})) >= 2`,
    ),
    index("destination_translations_locale_name_idx").on(table.locale, table.name),
  ],
);

export const destinationWards = pgTable(
  "destination_wards",
  {
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    wardCode: varchar("ward_code", { length: 20 })
      .notNull()
      .references(() => wards.code, { onDelete: "restrict", onUpdate: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.destinationId, table.wardCode] }),
    index("destination_wards_ward_code_idx").on(table.wardCode),
  ],
);

export const tourDestinations = pgTable(
  "tour_destinations",
  {
    tourId: uuid("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade", onUpdate: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "restrict", onUpdate: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tourId, table.destinationId] }),
    check("tour_destinations_sort_order_check", sql`${table.sortOrder} >= 0`),
    uniqueIndex("tour_destinations_tour_sort_order_idx").on(table.tourId, table.sortOrder),
    index("tour_destinations_destination_id_idx").on(table.destinationId),
  ],
);

export const images = pgTable(
  "images",
  {
    id: uuid("id").primaryKey(),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 500 }),
    fileName: varchar("file_name", { length: 255 }),
    mimeType: varchar("mime_type", { length: 127 }),
    sizeInBytes: bigint("size_in_bytes", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("images_url_not_blank_check", sql`char_length(trim(${table.url})) > 0`),
    check(
      "images_alt_text_length_check",
      sql`${table.altText} is null or char_length(trim(${table.altText})) >= 2`,
    ),
    check(
      "images_size_in_bytes_check",
      sql`${table.sizeInBytes} is null or ${table.sizeInBytes} > 0`,
    ),
  ],
);

export const tourImages = pgTable(
  "tour_images",
  {
    tourId: uuid("tour_id")
      .notNull()
      .references(() => tours.id, { onDelete: "cascade", onUpdate: "cascade" }),
    imageId: uuid("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "restrict", onUpdate: "cascade" }),
    role: tourImageRole("role").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tourId, table.imageId] }),
    check("tour_images_sort_order_check", sql`${table.sortOrder} >= 0`),
    uniqueIndex("tour_images_one_cover_per_tour_idx")
      .on(table.tourId)
      .where(sql`${table.role} = 'cover'`),
    uniqueIndex("tour_images_tour_sort_order_idx").on(table.tourId, table.sortOrder),
    index("tour_images_image_id_idx").on(table.imageId),
  ],
);

export const toursRelations = relations(tours, ({ many }) => ({
  imageLinks: many(tourImages),
  translations: many(tourTranslations),
  destinationLinks: many(tourDestinations),
}));

export const tourTranslationsRelations = relations(tourTranslations, ({ one }) => ({
  tour: one(tours, {
    fields: [tourTranslations.tourId],
    references: [tours.id],
  }),
}));

export const destinationsRelations = relations(destinations, ({ many }) => ({
  translations: many(destinationTranslations),
  wardLinks: many(destinationWards),
  tourLinks: many(tourDestinations),
}));

export const destinationTranslationsRelations = relations(destinationTranslations, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationTranslations.destinationId],
    references: [destinations.id],
  }),
}));

export const destinationWardsRelations = relations(destinationWards, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationWards.destinationId],
    references: [destinations.id],
  }),
  ward: one(wards, {
    fields: [destinationWards.wardCode],
    references: [wards.code],
  }),
}));

export const tourDestinationsRelations = relations(tourDestinations, ({ one }) => ({
  tour: one(tours, {
    fields: [tourDestinations.tourId],
    references: [tours.id],
  }),
  destination: one(destinations, {
    fields: [tourDestinations.destinationId],
    references: [destinations.id],
  }),
}));

export const imagesRelations = relations(images, ({ many }) => ({
  tourLinks: many(tourImages),
}));

export const tourImagesRelations = relations(tourImages, ({ one }) => ({
  tour: one(tours, {
    fields: [tourImages.tourId],
    references: [tours.id],
  }),
  image: one(images, {
    fields: [tourImages.imageId],
    references: [images.id],
  }),
}));
