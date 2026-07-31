import type { TourPlanSnapshot, TourTranslationSnapshot } from "@/domains/tour/domain";

export type AdminLocation = {
  id: string;
  name: string;
  searchName: string;
  latitude: number;
  longitude: number;
  country: string;
};

export type AdminTourImage = {
  imageId: string;
  url: string;
  altText?: string;
  role: "cover" | "gallery";
  sortOrder: number;
};

export type AdminTour = {
  id: string;
  translations: TourTranslationSnapshot[];
  locationId: string | null;
  location: AdminLocation | null;
  plans: TourPlanSnapshot[];
  images: AdminTourImage[];
  createdAt: string;
  updatedAt: string;
};
