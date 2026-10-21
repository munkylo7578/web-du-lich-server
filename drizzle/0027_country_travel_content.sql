ALTER TABLE "country_translations" RENAME COLUMN "weather" TO "travel_regions";--> statement-breakpoint
ALTER TABLE "country_translations" ADD COLUMN "currency_money_exchange" text;
