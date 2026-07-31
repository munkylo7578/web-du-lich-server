import { relations, sql } from "drizzle-orm";
import {
  bigint,
  check,
  doublePrecision,
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

export const TOUR_LOCALES = ["vi", "en"] as const;

export type TourLocale = (typeof TOUR_LOCALES)[number];

export type LocalizedText = Partial<Record<TourLocale, string>>;

export type TourPlanSnapshot = {
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
};

export type LocationSnapshot = {
  id: string;
  name: string;
  searchName: string;
  latitude: number;
  longitude: number;
  country: string;
};

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    searchName: text("search_name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    country: varchar("country", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("locations_name_not_blank_check", sql`char_length(trim(${table.name})) > 0`),
    check(
      "locations_search_name_not_blank_check",
      sql`char_length(trim(${table.searchName})) > 0`,
    ),
    check("locations_country_not_blank_check", sql`char_length(trim(${table.country})) > 0`),
    check("locations_latitude_check", sql`${table.latitude} between -90 and 90`),
    check("locations_longitude_check", sql`${table.longitude} between -180 and 180`),
    index("locations_name_country_idx").on(table.name, table.country),
    index("locations_search_name_trgm_idx").using(
      "gin",
      sql`${table.searchName} gin_trgm_ops`,
    ),
  ],
);

export const tourImageRole = pgEnum("tour_image_role", ["cover", "gallery"]);

export const tours = pgTable(
  "tours",
  {
    id: uuid("id").primaryKey(),
    locationId: uuid("location_id").references(() => locations.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    plans: jsonb("plans").$type<TourPlanSnapshot[]>().default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tours_location_id_idx").on(table.locationId),
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

export const locationsRelations = relations(locations, ({ many }) => ({
  tours: many(tours),
}));

export const toursRelations = relations(tours, ({ many, one }) => ({
  imageLinks: many(tourImages),
  translations: many(tourTranslations),
  location: one(locations, {
    fields: [tours.locationId],
    references: [locations.id],
  }),
}));

export const tourTranslationsRelations = relations(tourTranslations, ({ one }) => ({
  tour: one(tours, {
    fields: [tourTranslations.tourId],
    references: [tours.id],
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
