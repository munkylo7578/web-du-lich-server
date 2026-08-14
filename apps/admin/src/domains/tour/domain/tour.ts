import { TourId } from "./tour-id";
import { TourDestination, type TourDestinationSnapshot } from "./tour-destination";
import { TourImageRef, type TourImageRefSnapshot } from "./tour-image-ref";
import {
  DEFAULT_TOUR_LOCALE,
  isTourLocale,
  type TourLocale,
} from "./tour-locale";
import { TourPlan, type TourPlanSnapshot } from "./tour-plan";

export type TourTranslationSnapshot = {
  locale: TourLocale;
  name: string;
  description?: string;
};

export type TourSnapshot = {
  id: string;
  translations: TourTranslationSnapshot[];
  destinations: TourDestinationSnapshot[];
  plans: TourPlanSnapshot[];
  images: TourImageRefSnapshot[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTourProps = {
  translations: TourTranslationSnapshot[];
  destinations?: TourDestination[];
  plans?: TourPlan[];
  images?: TourImageRef[];
};

export class Tour {
  private constructor(
    private readonly id: TourId,
    private translations: TourTranslationSnapshot[],
    private destinations: TourDestination[],
    private plans: TourPlan[],
    private images: TourImageRef[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: CreateTourProps): Tour {
    const now = new Date();

    return new Tour(
      TourId.create(),
      Tour.validateTranslations(props.translations),
      Tour.validateDestinations(props.destinations ?? []),
      Tour.validatePlans(props.plans ?? []),
      Tour.validateImages(props.images ?? []),
      now,
      now,
    );
  }

  static rehydrate(snapshot: TourSnapshot): Tour {
    return new Tour(
      TourId.create(snapshot.id),
      Tour.validateTranslations(snapshot.translations),
      Tour.validateDestinations(snapshot.destinations.map(TourDestination.fromSnapshot)),
      Tour.validatePlans(snapshot.plans.map(TourPlan.fromSnapshot)),
      Tour.validateImages(snapshot.images.map(TourImageRef.fromSnapshot)),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  getId(): TourId {
    return this.id;
  }

  upsertTranslation(translation: TourTranslationSnapshot): void {
    const next = this.translations.filter((item) => item.locale !== translation.locale);
    this.translations = Tour.validateTranslations([...next, translation]);
    this.touch();
  }

  replaceTranslations(translations: TourTranslationSnapshot[]): void {
    this.translations = Tour.validateTranslations(translations);
    this.touch();
  }

  replaceDestinations(destinations: TourDestination[]): void {
    this.destinations = Tour.validateDestinations(destinations);
    this.touch();
  }

  replacePlans(plans: TourPlan[]): void {
    this.plans = Tour.validatePlans(plans);
    this.touch();
  }

  attachImage(image: TourImageRef): void {
    const exists = this.images.some((item) => item.imageId.equals(image.imageId));

    if (exists) {
      throw new Error("Image is already attached to this tour.");
    }

    this.images = Tour.validateImages([...this.images, image]);
    this.touch();
  }

  replaceImages(images: TourImageRef[]): void {
    this.images = Tour.validateImages(images);
    this.touch();
  }

  removeImage(imageId: string): void {
    this.images = this.images.filter((item) => item.imageId.value !== imageId);
    this.touch();
  }

  toSnapshot(): TourSnapshot {
    return {
      id: this.id.value,
      translations: this.translations.map((translation) => ({ ...translation })),
      destinations: this.destinations.map((destination) => destination.toSnapshot()),
      plans: this.plans.map((plan) => plan.toSnapshot()),
      images: this.images.map((image) => image.toSnapshot()),
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static validateName(name: string): string {
    const value = name.trim();

    if (value.length < 2) {
      throw new Error("Tour name must have at least 2 characters.");
    }

    return value;
  }

  private static validateDescription(description?: string): string | undefined {
    const value = description?.trim();

    if (!value) {
      return undefined;
    }

    if (value.length < 10) {
      throw new Error("Tour description must have at least 10 characters.");
    }

    return value;
  }

  private static validateTranslations(
    translations: TourTranslationSnapshot[],
  ): TourTranslationSnapshot[] {
    const locales = new Set<TourLocale>();
    const normalized = translations.map((translation) => {
      if (!isTourLocale(translation.locale)) {
        throw new Error(`Unsupported tour locale: ${translation.locale}.`);
      }

      if (locales.has(translation.locale)) {
        throw new Error(`Tour translation locale ${translation.locale} must be unique.`);
      }

      locales.add(translation.locale);
      return {
        locale: translation.locale,
        name: Tour.validateName(translation.name),
        description: Tour.validateDescription(translation.description),
      };
    });

    if (!locales.has(DEFAULT_TOUR_LOCALE)) {
      throw new Error("Tour translation is required in the default locale.");
    }

    return normalized;
  }

  private static validatePlans(plans: TourPlan[]): TourPlan[] {
    const sortOrders = new Set<number>();

    for (const plan of plans) {
      if (sortOrders.has(plan.sortOrder)) {
        throw new Error("Tour plan sort orders must be unique.");
      }

      sortOrders.add(plan.sortOrder);
    }

    return [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private static validateDestinations(destinations: TourDestination[]): TourDestination[] {
    const destinationIds = new Set<string>();
    const sortOrders = new Set<number>();

    for (const destination of destinations) {
      if (destinationIds.has(destination.destinationId)) {
        throw new Error("Tour destination ids must be unique.");
      }

      if (sortOrders.has(destination.sortOrder)) {
        throw new Error("Tour destination sort orders must be unique.");
      }

      destinationIds.add(destination.destinationId);
      sortOrders.add(destination.sortOrder);
    }

    return [...destinations].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private static validateImages(images: TourImageRef[]): TourImageRef[] {
    const coverImages = images.filter((image) => image.role === "cover");

    if (coverImages.length > 1) {
      throw new Error("Tour can only have one cover image.");
    }

    return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
