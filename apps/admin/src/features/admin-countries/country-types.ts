import type { DestinationCountry } from "@destination-country";
import type { AdminDestinationTranslation, AdminTourImage } from "@/features/admin-tours/tour-types";

export type AdminCountry = {
  code: DestinationCountry;
  translations: AdminDestinationTranslation[];
  images: AdminTourImage[];
  createdAt: string;
  updatedAt: string;
};
