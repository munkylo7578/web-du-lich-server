CREATE TYPE "public"."destination_image_role" AS ENUM('cover', 'gallery');--> statement-breakpoint
CREATE TABLE "destination_images" (
	"destination_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"role" "destination_image_role" NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "destination_images_destination_id_image_id_pk" PRIMARY KEY("destination_id","image_id"),
	CONSTRAINT "destination_images_sort_order_check" CHECK ("destination_images"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "destination_images" ADD CONSTRAINT "destination_images_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "destination_images" ADD CONSTRAINT "destination_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "destination_images_one_cover_idx" ON "destination_images" USING btree ("destination_id") WHERE "destination_images"."role" = 'cover';--> statement-breakpoint
CREATE UNIQUE INDEX "destination_images_destination_sort_order_idx" ON "destination_images" USING btree ("destination_id","sort_order");--> statement-breakpoint
CREATE INDEX "destination_images_image_id_idx" ON "destination_images" USING btree ("image_id");