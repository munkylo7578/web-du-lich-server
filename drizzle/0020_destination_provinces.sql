CREATE TABLE "destination_provinces" (
	"destination_id" uuid NOT NULL,
	"province_code" varchar(20) NOT NULL,
	CONSTRAINT "destination_provinces_destination_id_province_code_pk" PRIMARY KEY("destination_id","province_code")
);
--> statement-breakpoint
DROP TABLE "destination_wards" CASCADE;--> statement-breakpoint
ALTER TABLE "destination_provinces" ADD CONSTRAINT "destination_provinces_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "destination_provinces" ADD CONSTRAINT "destination_provinces_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "destination_provinces_province_code_idx" ON "destination_provinces" USING btree ("province_code");