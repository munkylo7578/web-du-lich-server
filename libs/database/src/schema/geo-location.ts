import { relations } from "drizzle-orm";
import {
  customType,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  varchar,
} from "drizzle-orm/pg-core";

const postgisGeometry = customType<{
  data: unknown;
  driverData: unknown;
  config: { type: string; srid: number };
  configRequired: true;
}>({
  dataType: (config) => `geometry(${config.type},${config.srid})`,
});

export const administrativeRegions = pgTable("administrative_regions", {
  id: integer("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  codeName: varchar("code_name", { length: 255 }),
  codeNameEn: varchar("code_name_en", { length: 255 }),
});

export const administrativeUnits = pgTable("administrative_units", {
  id: integer("id").primaryKey().notNull(),
  fullName: varchar("full_name", { length: 255 }),
  fullNameEn: varchar("full_name_en", { length: 255 }),
  shortName: varchar("short_name", { length: 255 }),
  shortNameEn: varchar("short_name_en", { length: 255 }),
  codeName: varchar("code_name", { length: 255 }),
  codeNameEn: varchar("code_name_en", { length: 255 }),
});

export const provinces = pgTable(
  "provinces",
  {
    code: varchar("code", { length: 20 }).primaryKey().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameEn: varchar("name_en", { length: 255 }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    fullNameEn: varchar("full_name_en", { length: 255 }),
    codeName: varchar("code_name", { length: 255 }),
    administrativeUnitId: integer("administrative_unit_id"),
  },
  (table) => [
    index("idx_provinces_unit").on(table.administrativeUnitId),
    foreignKey({
      columns: [table.administrativeUnitId],
      foreignColumns: [administrativeUnits.id],
      name: "provinces_administrative_unit_id_fkey",
    }),
  ],
);

export const wards = pgTable(
  "wards",
  {
    code: varchar("code", { length: 20 }).primaryKey().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameEn: varchar("name_en", { length: 255 }),
    fullName: varchar("full_name", { length: 255 }),
    fullNameEn: varchar("full_name_en", { length: 255 }),
    codeName: varchar("code_name", { length: 255 }),
    provinceCode: varchar("province_code", { length: 20 }),
    administrativeUnitId: integer("administrative_unit_id"),
  },
  (table) => [
    index("idx_wards_province").on(table.provinceCode),
    index("idx_wards_unit").on(table.administrativeUnitId),
    foreignKey({
      columns: [table.administrativeUnitId],
      foreignColumns: [administrativeUnits.id],
      name: "wards_administrative_unit_id_fkey",
    }),
    foreignKey({
      columns: [table.provinceCode],
      foreignColumns: [provinces.code],
      name: "wards_province_code_fkey",
    }),
  ],
);

export const gisProvinces = pgTable(
  "gis_provinces",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({
      name: "gis_provinces_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    provinceCode: varchar("province_code", { length: 20 }).notNull(),
    gisServerId: varchar("gis_server_id", { length: 50 }),
    areaKm2: numeric("area_km2", { precision: 12, scale: 5 }),
    bbox: postgisGeometry("bbox", { type: "Polygon", srid: 4326 }),
    geom: postgisGeometry("geom", { type: "MultiPolygon", srid: 4326 }),
  },
  (table) => [
    index("idx_gis_provinces_bbox").using("gist", table.bbox.asc().nullsLast()),
    index("idx_gis_provinces_geom").using("gist", table.geom.asc().nullsLast()),
    index("idx_gis_provinces_province_code").on(table.provinceCode),
    foreignKey({
      columns: [table.provinceCode],
      foreignColumns: [provinces.code],
      name: "gis_provinces_province_code_fkey",
    }),
  ],
);

export const gisWards = pgTable(
  "gis_wards",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({
      name: "gis_wards_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    wardCode: varchar("ward_code", { length: 20 }).notNull(),
    gisServerId: varchar("gis_server_id", { length: 50 }),
    areaKm2: numeric("area_km2", { precision: 12, scale: 5 }),
    bbox: postgisGeometry("bbox", { type: "Polygon", srid: 4326 }),
    geom: postgisGeometry("geom", { type: "MultiPolygon", srid: 4326 }),
  },
  (table) => [
    index("idx_gis_wards_bbox").using("gist", table.bbox.asc().nullsLast()),
    index("idx_gis_wards_geom").using("gist", table.geom.asc().nullsLast()),
    index("idx_gis_wards_ward_code").on(table.wardCode),
    foreignKey({
      columns: [table.wardCode],
      foreignColumns: [wards.code],
      name: "gis_wards_ward_code_fkey",
    }),
  ],
);

export const administrativeUnitsRelations = relations(administrativeUnits, ({ many }) => ({
  provinces: many(provinces),
  wards: many(wards),
}));

export const provincesRelations = relations(provinces, ({ many, one }) => ({
  administrativeUnit: one(administrativeUnits, {
    fields: [provinces.administrativeUnitId],
    references: [administrativeUnits.id],
  }),
  gisProvinces: many(gisProvinces),
  wards: many(wards),
}));

export const wardsRelations = relations(wards, ({ many, one }) => ({
  administrativeUnit: one(administrativeUnits, {
    fields: [wards.administrativeUnitId],
    references: [administrativeUnits.id],
  }),
  province: one(provinces, {
    fields: [wards.provinceCode],
    references: [provinces.code],
  }),
  gisWards: many(gisWards),
}));

export const gisProvincesRelations = relations(gisProvinces, ({ one }) => ({
  province: one(provinces, {
    fields: [gisProvinces.provinceCode],
    references: [provinces.code],
  }),
}));

export const gisWardsRelations = relations(gisWards, ({ one }) => ({
  ward: one(wards, {
    fields: [gisWards.wardCode],
    references: [wards.code],
  }),
}));
