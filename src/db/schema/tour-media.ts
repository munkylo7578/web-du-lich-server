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

import type { TourPlanSnapshot } from "@/domains/tour/domain";

export const tourImageRole = pgEnum("tour_image_role", ["cover", "gallery"]);

export const tours = pgTable(
  "tours",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    plans: jsonb("plans").$type<TourPlanSnapshot[]>().default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("tours_name_length_check", sql`char_length(trim(${table.name})) >= 2`),
    check(
      "tours_description_length_check",
      sql`${table.description} is null or char_length(trim(${table.description})) >= 10`,
    ),
    check(
      "tours_location_pair_check",
      sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null)`,
    ),
    check(
      "tours_latitude_check",
      sql`${table.latitude} is null or ${table.latitude} between -90 and 90`,
    ),
    check(
      "tours_longitude_check",
      sql`${table.longitude} is null or ${table.longitude} between -180 and 180`,
    ),
    check("tours_plans_array_check", sql`jsonb_typeof(${table.plans}) = 'array'`),
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
