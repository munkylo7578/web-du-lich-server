import type { DestinationCountry } from "@destination-country";
import type { AdminTourImage } from "@/features/admin-tours/tour-types";

export type AdminCountryTranslation = {
  locale: "vi" | "en";
  name: string;
  description?: string;
  visa?: string;
  travelRegions?: string;
  currencyMoneyExchange?: string;
};

export type AdminCountry = {
  code: DestinationCountry;
  translations: AdminCountryTranslation[];
  images: AdminTourImage[];
  createdAt: string;
  updatedAt: string;
};
