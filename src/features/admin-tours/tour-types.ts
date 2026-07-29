import type { TourPlanSnapshot, TourTranslationSnapshot } from "@/domains/tour/domain";

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
  latitude: number | null;
  longitude: number | null;
  plans: TourPlanSnapshot[];
  images: AdminTourImage[];
  createdAt: string;
  updatedAt: string;
};
