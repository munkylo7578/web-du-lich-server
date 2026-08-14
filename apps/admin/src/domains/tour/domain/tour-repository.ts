import type { Image } from "@/domains/image/domain";
import type { TourLocale } from "./tour-locale";
import type { Tour } from "./tour";

export type TourSaveImage = {
  image: Image;
  physicalPath: string;
};

export type TourSaveDestinationTranslation = {
  locale: TourLocale;
  name: string;
  description?: string;
};

export type TourSaveDestination = {
  destinationId: string;
  translations: TourSaveDestinationTranslation[];
  wardCodes: string[];
};

export interface TourRepository {
  findById(id: string): Promise<Tour | null>;
  save(tour: Tour, newImages?: TourSaveImage[], saveDestinations?: TourSaveDestination[]): Promise<void>;
  delete(id: string): Promise<void>;
}
