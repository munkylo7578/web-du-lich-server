import { TourId } from "./tour-id";
import { TourDestination, type TourDestinationSnapshot } from "./tour-destination";
import { TourImageRef, type TourImageRefSnapshot } from "./tour-image-ref";
import {
  DEFAULT_TOUR_LOCALE,
  isTourLocale,
  type TourLocale,
} from "./tour-locale";
import { TourPlan, type TourPlanSnapshot } from "./tour-plan";
import { TourService, type TourServiceSnapshot } from "./tour-service";

export type TourTranslationSnapshot = {
  locale: TourLocale;
  name: string;
  description?: string;
};

export type TourSnapshot = {
  id: string;
  departureStartMonth?: number;
  translations: TourTranslationSnapshot[];
  destinations: TourDestinationSnapshot[];
  services: TourServiceSnapshot[];
  plans: TourPlanSnapshot[];
  images: TourImageRefSnapshot[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTourProps = {
  departureStartMonth?: number;
  translations: TourTranslationSnapshot[];
  destinations?: TourDestination[];
  services?: TourService[];
  plans?: TourPlan[];
  images?: TourImageRef[];
};

export class Tour {
  private constructor(
    private readonly id: TourId,
    private translations: TourTranslationSnapshot[],
    private destinations: TourDestination[],
    private services: TourService[],
    private plans: TourPlan[],
    private images: TourImageRef[],
    private readonly createdAt: Date,
    private updatedAt: Date,
    private departureStartMonth: number | undefined,
  ) {}

  static create(props: CreateTourProps): Tour {
    const now = new Date();

    return new Tour(
      TourId.create(),
      Tour.validateTranslations(props.translations),
      Tour.validateDestinations(props.destinations ?? []),
      Tour.validateServices(props.services ?? []),
      Tour.validatePlans(props.plans ?? []),
      Tour.validateImages(props.images ?? []),
      now,
      now,
      Tour.validateDepartureStartMonth(props.departureStartMonth),
    );
  }

  static rehydrate(snapshot: TourSnapshot): Tour {
    return new Tour(
      TourId.create(snapshot.id),
      Tour.validateTranslations(snapshot.translations),
      Tour.validateDestinations(snapshot.destinations.map(TourDestination.fromSnapshot)),
      Tour.validateServices(snapshot.services.map(TourService.fromSnapshot)),
      Tour.validatePlans(snapshot.plans.map(TourPlan.fromSnapshot)),
      Tour.validateImages(snapshot.images.map(TourImageRef.fromSnapshot)),
      snapshot.createdAt,
      snapshot.updatedAt,
      Tour.validateDepartureStartMonth(snapshot.departureStartMonth),
    );
  }

  getId(): TourId {
    return this.id;
  }

  updateDepartureStartMonth(month?: number): void {
    this.departureStartMonth = Tour.validateDepartureStartMonth(month);
    this.touch();
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

  replaceServices(services: TourService[]): void {
    this.services = Tour.validateServices(services);
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
      departureStartMonth: this.departureStartMonth,
      translations: this.translations.map((translation) => ({ ...translation })),
      destinations: this.destinations.map((destination) => destination.toSnapshot()),
      services: this.services.map((service) => service.toSnapshot()),
      plans: this.plans.map((plan) => plan.toSnapshot()),
      images: this.images.map((image) => image.toSnapshot()),
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static validateDepartureStartMonth(month?: number): number | undefined {
    if (month === undefined) return undefined;

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Tour departure start month must be an integer from 1 to 12.");
    }

    return month;
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

  private static validateServices(services: TourService[]): TourService[] {
    const ids = new Set<string>();
    const orders = new Set<number>();
    for (const service of services) {
      if (ids.has(service.serviceId) || orders.has(service.sortOrder)) throw new Error("Tour services and their orders must be unique.");
      ids.add(service.serviceId);
      orders.add(service.sortOrder);
    }
    return [...services].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private static validateImages(images: TourImageRef[]): TourImageRef[] {
    const coverImages = images.filter((image) => image.role === "cover");

    if (coverImages.length > 1) {
      throw new Error("Tour can only have one cover image.");
    }

    return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
