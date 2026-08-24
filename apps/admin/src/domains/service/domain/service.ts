import { ServiceId } from "./service-id";
import { DEFAULT_TOUR_LOCALE, isTourLocale, type TourLocale } from "@/domains/tour/domain";

export type ServiceTranslationSnapshot = {
  locale: TourLocale;
  name: string;
  description?: string;
};

export type ServiceImageRefSnapshot = {
  imageId: string;
  sortOrder: number;
};

export type ServiceSnapshot = {
  id: string;
  translations: ServiceTranslationSnapshot[];
  images: ServiceImageRefSnapshot[];
  createdAt: Date;
  updatedAt: Date;
};

export class Service {
  private constructor(
    private readonly id: ServiceId,
    private translations: ServiceTranslationSnapshot[],
    private images: ServiceImageRefSnapshot[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(translations: ServiceTranslationSnapshot[]): Service {
    const now = new Date();
    return new Service(ServiceId.create(), Service.validateTranslations(translations), [], now, now);
  }

  static rehydrate(snapshot: ServiceSnapshot): Service {
    return new Service(
      ServiceId.create(snapshot.id),
      Service.validateTranslations(snapshot.translations),
      Service.validateImages(snapshot.images),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  getId(): ServiceId {
    return this.id;
  }

  replaceTranslations(translations: ServiceTranslationSnapshot[]): void {
    this.translations = Service.validateTranslations(translations);
    this.touch();
  }

  replaceImages(images: ServiceImageRefSnapshot[]): void {
    this.images = Service.validateImages(images);
    this.touch();
  }

  toSnapshot(): ServiceSnapshot {
    return {
      id: this.id.value,
      translations: this.translations.map((translation) => ({ ...translation })),
      images: this.images.map((image) => ({ ...image })),
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static validateTranslations(translations: ServiceTranslationSnapshot[]) {
    const locales = new Set<TourLocale>();
    const normalized = translations.map((translation) => {
      if (!isTourLocale(translation.locale) || locales.has(translation.locale)) {
        throw new Error("Service translation locales must be supported and unique.");
      }
      locales.add(translation.locale);
      const name = translation.name.trim();
      const description = translation.description?.trim();
      if (name.length < 2) throw new Error("Service name must have at least 2 characters.");
      if (description && description.replace(/<[^>]*>/g, "").trim().length < 10) {
        throw new Error("Service description must have at least 10 characters.");
      }
      return { locale: translation.locale, name, description: description || undefined };
    });
    if (!locales.has(DEFAULT_TOUR_LOCALE)) throw new Error("Vietnamese service content is required.");
    return normalized;
  }

  private static validateImages(images: ServiceImageRefSnapshot[]) {
    const ids = new Set<string>();
    const orders = new Set<number>();
    for (const image of images) {
      if (!image.imageId || ids.has(image.imageId)) throw new Error("Service image ids must be unique.");
      if (!Number.isInteger(image.sortOrder) || image.sortOrder < 0 || orders.has(image.sortOrder)) {
        throw new Error("Service image sort orders must be unique positive integers or zero.");
      }
      ids.add(image.imageId);
      orders.add(image.sortOrder);
    }
    return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
