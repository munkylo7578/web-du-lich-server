import type { Image } from "@/domains/image/domain";
import type { Tour } from "./tour";

export type TourSaveImage = {
  image: Image;
  physicalPath: string;
};

export interface TourRepository {
  findById(id: string): Promise<Tour | null>;
  save(tour: Tour, newImages?: TourSaveImage[]): Promise<void>;
  delete(id: string): Promise<void>;
}
