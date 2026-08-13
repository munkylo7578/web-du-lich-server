CREATE TYPE "public"."tour_image_role" AS ENUM('cover', 'gallery');--> statement-breakpoint
CREATE TYPE "public"."tour_locale" AS ENUM('vi', 'en');--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"alt_text" varchar(500),
	"file_name" varchar(255),
	"mime_type" varchar(127),
	"size_in_bytes" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_url_not_blank_check" CHECK (char_length(trim("images"."url")) > 0),
	CONSTRAINT "images_alt_text_length_check" CHECK ("images"."alt_text" is null or char_length(trim("images"."alt_text")) >= 2),
	CONSTRAINT "images_size_in_bytes_check" CHECK ("images"."size_in_bytes" is null or "images"."size_in_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"search_name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"country" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_name_not_blank_check" CHECK (char_length(trim("locations"."name")) > 0),
	CONSTRAINT "locations_search_name_not_blank_check" CHECK (char_length(trim("locations"."search_name")) > 0),
	CONSTRAINT "locations_country_not_blank_check" CHECK (char_length(trim("locations"."country")) > 0),
	CONSTRAINT "locations_latitude_check" CHECK ("locations"."latitude" between -90 and 90),
	CONSTRAINT "locations_longitude_check" CHECK ("locations"."longitude" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "tour_images" (
	"tour_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"role" "tour_image_role" NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "tour_images_tour_id_image_id_pk" PRIMARY KEY("tour_id","image_id"),
	CONSTRAINT "tour_images_sort_order_check" CHECK ("tour_images"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tour_translations" (
	"tour_id" uuid NOT NULL,
	"locale" "tour_locale" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_translations_tour_id_locale_pk" PRIMARY KEY("tour_id","locale"),
	CONSTRAINT "tour_translations_name_length_check" CHECK (char_length(trim("tour_translations"."name")) >= 2),
	CONSTRAINT "tour_translations_description_length_check" CHECK ("tour_translations"."description" is null or char_length(trim("tour_translations"."description")) >= 10)
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" uuid PRIMARY KEY NOT NULL,
	"location_id" uuid,
	"plans" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tours_plans_array_check" CHECK (jsonb_typeof("tours"."plans") = 'array')
);
--> statement-breakpoint
CREATE TABLE "administrative_regions" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"code_name" varchar(255),
	"code_name_en" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "administrative_units" (
	"id" integer PRIMARY KEY NOT NULL,
	"full_name" varchar(255),
	"full_name_en" varchar(255),
	"short_name" varchar(255),
	"short_name_en" varchar(255),
	"code_name" varchar(255),
	"code_name_en" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "gis_provinces" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gis_provinces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"province_code" varchar(20) NOT NULL,
	"gis_server_id" varchar(50),
	"area_km2" numeric(12, 5),
	"bbox" geometry(Polygon,4326),
	"geom" geometry(MultiPolygon,4326)
);
--> statement-breakpoint
CREATE TABLE "gis_wards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gis_wards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ward_code" varchar(20) NOT NULL,
	"gis_server_id" varchar(50),
	"area_km2" numeric(12, 5),
	"bbox" geometry(Polygon,4326),
	"geom" geometry(MultiPolygon,4326)
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"code" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_en" varchar(255),
	"full_name" varchar(255) NOT NULL,
	"full_name_en" varchar(255),
	"code_name" varchar(255),
	"administrative_unit_id" integer
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"code" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_en" varchar(255),
	"full_name" varchar(255),
	"full_name_en" varchar(255),
	"code_name" varchar(255),
	"province_code" varchar(20),
	"administrative_unit_id" integer
);
--> statement-breakpoint
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_translations" ADD CONSTRAINT "tour_translations_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gis_provinces" ADD CONSTRAINT "gis_provinces_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gis_wards" ADD CONSTRAINT "gis_wards_ward_code_fkey" FOREIGN KEY ("ward_code") REFERENCES "public"."wards"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_administrative_unit_id_fkey" FOREIGN KEY ("administrative_unit_id") REFERENCES "public"."administrative_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_administrative_unit_id_fkey" FOREIGN KEY ("administrative_unit_id") REFERENCES "public"."administrative_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "locations_name_country_idx" ON "locations" USING btree ("name","country");--> statement-breakpoint
CREATE INDEX "locations_search_name_trgm_idx" ON "locations" USING gin ("search_name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tour_images_one_cover_per_tour_idx" ON "tour_images" USING btree ("tour_id") WHERE "tour_images"."role" = 'cover';--> statement-breakpoint
CREATE UNIQUE INDEX "tour_images_tour_sort_order_idx" ON "tour_images" USING btree ("tour_id","sort_order");--> statement-breakpoint
CREATE INDEX "tour_images_image_id_idx" ON "tour_images" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "tour_translations_locale_name_idx" ON "tour_translations" USING btree ("locale","name");--> statement-breakpoint
CREATE INDEX "tours_location_id_idx" ON "tours" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_gis_provinces_bbox" ON "gis_provinces" USING gist ("bbox");--> statement-breakpoint
CREATE INDEX "idx_gis_provinces_geom" ON "gis_provinces" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "idx_gis_provinces_province_code" ON "gis_provinces" USING btree ("province_code");--> statement-breakpoint
CREATE INDEX "idx_gis_wards_bbox" ON "gis_wards" USING gist ("bbox");--> statement-breakpoint
CREATE INDEX "idx_gis_wards_geom" ON "gis_wards" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "idx_gis_wards_ward_code" ON "gis_wards" USING btree ("ward_code");--> statement-breakpoint
CREATE INDEX "idx_provinces_unit" ON "provinces" USING btree ("administrative_unit_id");--> statement-breakpoint
CREATE INDEX "idx_wards_province" ON "wards" USING btree ("province_code");--> statement-breakpoint
CREATE INDEX "idx_wards_unit" ON "wards" USING btree ("administrative_unit_id");