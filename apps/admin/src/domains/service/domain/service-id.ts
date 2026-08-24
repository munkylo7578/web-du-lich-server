import { EntityId } from "@/shared/domain/entity-id";

export class ServiceId extends EntityId {
  static create(value?: string): ServiceId {
    return new ServiceId(EntityId.createValue(value, "Service id"));
  }
}
