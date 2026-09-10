import type { Image } from "@/domains/image/domain";
import type { DestinationCountry } from "@destination-country";
import type { TourLocale } from "./tour-locale";
import type { Tour } from "./tour";

export type TourSaveImage = {
  image: Image;
  physicalPath: string;
};

export type TourImageMetadataUpdate = {
  imageId: string;
  altText?: string;
};

export type TourSaveDestinationTranslation = {
  locale: TourLocale;
  name: string;
  description?: string;
};

export type TourSaveDestination = {
  destinationId: string;
  country: DestinationCountry;
  translations: TourSaveDestinationTranslation[];
  wardCodes: string[];
};

export interface TourRepository {
  findById(id: string): Promise<Tour | null>;
  save(tour: Tour, newImages?: TourSaveImage[], saveDestinations?: TourSaveDestination[], imageUpdates?: TourImageMetadataUpdate[]): Promise<void>;
  delete(id: string): Promise<void>;
}
