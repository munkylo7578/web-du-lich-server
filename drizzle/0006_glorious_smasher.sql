CREATE TABLE "services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_translations" (
	"service_id" uuid NOT NULL,
	"locale" "tour_locale" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_translations_service_id_locale_pk" PRIMARY KEY("service_id","locale"),
	CONSTRAINT "service_translations_name_length_check" CHECK (char_length(trim("service_translations"."name")) >= 2),
	CONSTRAINT "service_translations_description_length_check" CHECK ("service_translations"."description" is null or char_length(trim("service_translations"."description")) >= 10)
);
--> statement-breakpoint
CREATE TABLE "service_images" (
	"service_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "service_images_service_id_image_id_pk" PRIMARY KEY("service_id","image_id"),
	CONSTRAINT "service_images_sort_order_check" CHECK ("service_images"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tour_services" (
	"tour_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "tour_services_tour_id_service_id_pk" PRIMARY KEY("tour_id","service_id"),
	CONSTRAINT "tour_services_sort_order_check" CHECK ("tour_services"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "service_images" ADD CONSTRAINT "service_images_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "service_images" ADD CONSTRAINT "service_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "tour_services" ADD CONSTRAINT "tour_services_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "tour_services" ADD CONSTRAINT "tour_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "service_translations_locale_name_idx" ON "service_translations" USING btree ("locale","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "service_images_service_sort_order_idx" ON "service_images" USING btree ("service_id","sort_order");
--> statement-breakpoint
CREATE INDEX "service_images_image_id_idx" ON "service_images" USING btree ("image_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "tour_services_tour_sort_order_idx" ON "tour_services" USING btree ("tour_id","sort_order");
--> statement-breakpoint
CREATE INDEX "tour_services_service_id_idx" ON "tour_services" USING btree ("service_id");
