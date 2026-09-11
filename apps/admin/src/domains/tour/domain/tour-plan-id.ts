import { EntityId } from "@/shared/domain/entity-id";

export class TourPlanId extends EntityId {
  static create(value?: string): TourPlanId {
    return TourPlanId.fromStored(value === undefined ? crypto.randomUUID() : value);
  }

  static fromStored(value: string): TourPlanId {
    if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      throw new Error("Tour plan id must be a stored UUID.");
    }
    return new TourPlanId(value.toLowerCase());
  }
}
