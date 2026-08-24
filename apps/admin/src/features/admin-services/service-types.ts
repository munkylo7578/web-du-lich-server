import type { ServiceTranslationSnapshot } from "@/domains/service/domain";

export type AdminServiceImage = {
  imageId: string;
  url: string;
  altText?: string;
  sortOrder: number;
};

export type AdminService = {
  serviceId: string;
  translations: ServiceTranslationSnapshot[];
  images: AdminServiceImage[];
  sortOrder: number;
  tourCount: number;
  createdAt: string;
  updatedAt: string;
};
