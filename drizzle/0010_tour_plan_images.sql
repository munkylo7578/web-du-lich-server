CREATE TABLE "tour_plan_images" (
	"plan_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "tour_plan_images_plan_id_image_id_pk" PRIMARY KEY("plan_id","image_id"),
	CONSTRAINT "tour_plan_images_sort_order_check" CHECK ("tour_plan_images"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tour_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tour_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_plans_sort_order_check" CHECK ("tour_plans"."sort_order" >= 0),
	CONSTRAINT "tour_plans_name_check" CHECK ((jsonb_typeof("tour_plans"."name") = 'object' and jsonb_typeof("tour_plans"."name"->'vi') = 'string' and length(btrim("tour_plans"."name"->>'vi')) > 0) is true),
	CONSTRAINT "tour_plans_description_check" CHECK ((jsonb_typeof("tour_plans"."description") = 'object' and jsonb_typeof("tour_plans"."description"->'vi') = 'string' and length(btrim("tour_plans"."description"->>'vi')) > 0) is true)
);
--> statement-breakpoint
ALTER TABLE "tour_plan_images" ADD CONSTRAINT "tour_plan_images_plan_id_tour_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."tour_plans"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_plan_images" ADD CONSTRAINT "tour_plan_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_plans" ADD CONSTRAINT "tour_plans_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "tour_plan_images_plan_sort_order_idx" ON "tour_plan_images" USING btree ("plan_id","sort_order");--> statement-breakpoint
CREATE INDEX "tour_plan_images_image_id_idx" ON "tour_plan_images" USING btree ("image_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_plans_tour_sort_order_idx" ON "tour_plans" USING btree ("tour_id","sort_order");