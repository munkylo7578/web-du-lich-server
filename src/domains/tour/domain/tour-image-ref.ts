import { ImageId } from "@/domains/image/domain";

export type TourImageRole = "cover" | "gallery";

export type TourImageRefProps = {
  imageId: ImageId;
  role: TourImageRole;
  sortOrder: number;
};

export type TourImageRefSnapshot = {
  imageId: string;
  role: TourImageRole;
  sortOrder: number;
};

export class TourImageRef {
  private constructor(
    public readonly imageId: ImageId,
    public readonly role: TourImageRole,
    public readonly sortOrder: number,
  ) {}

  static create(props: TourImageRefProps): TourImageRef {
    if (!Number.isInteger(props.sortOrder) || props.sortOrder < 0) {
      throw new Error("Tour image sort order must be a positive integer or zero.");
    }

    return new TourImageRef(props.imageId, props.role, props.sortOrder);
  }

  static fromSnapshot(snapshot: TourImageRefSnapshot): TourImageRef {
    return TourImageRef.create({
      imageId: ImageId.create(snapshot.imageId),
      role: snapshot.role,
      sortOrder: snapshot.sortOrder,
    });
  }

  toSnapshot(): TourImageRefSnapshot {
    return {
      imageId: this.imageId.value,
      role: this.role,
      sortOrder: this.sortOrder,
    };
  }
}
