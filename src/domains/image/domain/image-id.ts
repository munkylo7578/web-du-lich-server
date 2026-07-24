import { EntityId } from "@/shared/domain/entity-id";

export class ImageId extends EntityId {
  private constructor(value: string) {
    super(value);
  }

  static create(value?: string): ImageId {
    return new ImageId(EntityId.createValue(value, "Image id"));
  }
}
