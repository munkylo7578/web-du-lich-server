import { EntityId } from "@/shared/domain/entity-id";

export class TourId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value?: string): TourId {
    return new TourId(EntityId.createValue(value, "Tour id"));
  }
}
