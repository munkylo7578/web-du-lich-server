import { Tour, type TourSnapshot } from "@/domains/tour/domain";

export class TourMapper {
  static toDomain(snapshot: TourSnapshot): Tour {
    return Tour.rehydrate(snapshot);
  }

  static toPersistence(tour: Tour): TourSnapshot {
    return tour.toSnapshot();
  }
}
