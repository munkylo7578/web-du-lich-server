import type { ServiceTranslationSnapshot } from '@/domains/service/domain';
import type { ServiceCategory } from '@service-category';

export type AdminServiceImage = {
  imageId: string;
  url: string;
  altText?: string;
  sortOrder: number;
};

export type AdminService = {
  serviceId: string;
  category: ServiceCategory;
  translations: ServiceTranslationSnapshot[];
  images: AdminServiceImage[];
  sortOrder: number;
  tourCount: number;
  createdAt: string;
  updatedAt: string;
};
