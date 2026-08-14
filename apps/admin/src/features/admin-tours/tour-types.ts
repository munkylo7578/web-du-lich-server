import type { TourPlanSnapshot, TourTranslationSnapshot } from "@/domains/tour/domain";

export type AdminWard = {
  code: string;
  name: string;
  fullName?: string;
  provinceCode?: string;
  provinceName?: string;
};

export type AdminDestinationTranslation = {
  locale: "vi" | "en";
  name: string;
  description?: string;
};

export type AdminDestination = {
  destinationId: string;
  translations: AdminDestinationTranslation[];
  wards: AdminWard[];
  sortOrder: number;
  tourCount?: number;
  createdAt?: string;
  updatedAt?: string;
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
  destinations: AdminDestination[];
  plans: TourPlanSnapshot[];
  images: AdminTourImage[];
  createdAt: string;
  updatedAt: string;
};
