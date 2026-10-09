CREATE TYPE "public"."country_image_role" AS ENUM('cover', 'gallery');--> statement-breakpoint
CREATE TABLE "countries" (
	"code" varchar(2) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_check" CHECK ("countries"."code" in ('LA', 'CB', 'VN'))
);
--> statement-breakpoint
CREATE TABLE "country_images" (
	"country_code" varchar(2) NOT NULL,
	"image_id" uuid NOT NULL,
	"role" "country_image_role" NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "country_images_country_code_image_id_pk" PRIMARY KEY("country_code","image_id"),
	CONSTRAINT "country_images_sort_order_check" CHECK ("country_images"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "country_translations" (
	"country_code" varchar(2) NOT NULL,
	"locale" "tour_locale" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"visa" text,
	"weather" text,
	CONSTRAINT "country_translations_country_code_locale_pk" PRIMARY KEY("country_code","locale"),
	CONSTRAINT "country_translations_name_check" CHECK (char_length(trim("country_translations"."name")) >= 2)
);
--> statement-breakpoint
ALTER TABLE "country_images" ADD CONSTRAINT "country_images_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_images" ADD CONSTRAINT "country_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_translations" ADD CONSTRAINT "country_translations_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "country_images_order_idx" ON "country_images" USING btree ("country_code","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "country_images_cover_idx" ON "country_images" USING btree ("country_code") WHERE "country_images"."role" = 'cover';
--> statement-breakpoint
INSERT INTO "countries" ("code") VALUES ('LA'), ('CB'), ('VN') ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "country_translations" ("country_code", "locale", "name") VALUES
('LA', 'en', 'Laos'), ('LA', 'vi', 'Lào'),
('CB', 'en', 'Cambodia'), ('CB', 'vi', 'Campuchia'),
('VN', 'en', 'Vietnam'), ('VN', 'vi', 'Việt Nam')
ON CONFLICT DO NOTHING;
