ALTER TABLE "tours" ADD COLUMN "before_discount_price_usd" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "before_discount_price_vnd" numeric(14, 0);--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "listed_price_usd" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "listed_price_vnd" numeric(14, 0);--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_before_discount_price_usd_check" CHECK ("tours"."before_discount_price_usd" between 0 and 999999999999.99);--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_before_discount_price_vnd_check" CHECK ("tours"."before_discount_price_vnd" between 0 and 99999999999999);--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_listed_price_usd_check" CHECK ("tours"."listed_price_usd" between 0 and 999999999999.99);--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_listed_price_vnd_check" CHECK ("tours"."listed_price_vnd" between 0 and 99999999999999);