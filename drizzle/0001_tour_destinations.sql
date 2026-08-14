CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destination_translations" (
	"destination_id" uuid NOT NULL,
	"locale" "tour_locale" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destination_translations_destination_id_locale_pk" PRIMARY KEY("destination_id","locale"),
	CONSTRAINT "destination_translations_name_length_check" CHECK (char_length(trim("destination_translations"."name")) >= 2),
	CONSTRAINT "destination_translations_description_length_check" CHECK ("destination_translations"."description" is null or char_length(trim("destination_translations"."description")) >= 10)
);
--> statement-breakpoint
CREATE TABLE "destination_wards" (
	"destination_id" uuid NOT NULL,
	"ward_code" varchar(20) NOT NULL,
	CONSTRAINT "destination_wards_destination_id_ward_code_pk" PRIMARY KEY("destination_id","ward_code")
);
--> statement-breakpoint
CREATE TABLE "tour_destinations" (
	"tour_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "tour_destinations_tour_id_destination_id_pk" PRIMARY KEY("tour_id","destination_id"),
	CONSTRAINT "tour_destinations_sort_order_check" CHECK ("tour_destinations"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "destination_translations" ADD CONSTRAINT "destination_translations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "destination_wards" ADD CONSTRAINT "destination_wards_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "destination_wards" ADD CONSTRAINT "destination_wards_ward_code_wards_code_fk" FOREIGN KEY ("ward_code") REFERENCES "public"."wards"("code") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "tour_destinations" ADD CONSTRAINT "tour_destinations_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "tour_destinations" ADD CONSTRAINT "tour_destinations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "destination_translations_locale_name_idx" ON "destination_translations" USING btree ("locale","name");
--> statement-breakpoint
CREATE INDEX "destination_wards_ward_code_idx" ON "destination_wards" USING btree ("ward_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "tour_destinations_tour_sort_order_idx" ON "tour_destinations" USING btree ("tour_id","sort_order");
--> statement-breakpoint
CREATE INDEX "tour_destinations_destination_id_idx" ON "tour_destinations" USING btree ("destination_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "tours_location_id_idx";
--> statement-breakpoint
ALTER TABLE "tours" DROP CONSTRAINT IF EXISTS "tours_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "tours" DROP COLUMN IF EXISTS "location_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "locations";
