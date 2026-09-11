export type TourPlanImageRefSnapshot = { imageId: string; sortOrder: number };

export class TourPlanImageRef {
  private constructor(public readonly imageId: string, public readonly sortOrder: number) {}

  static create(props: TourPlanImageRefSnapshot): TourPlanImageRef {
    if (typeof props.imageId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(props.imageId)) {
      throw new Error("Tour plan image id must be a UUID.");
    }
    if (!Number.isInteger(props.sortOrder) || props.sortOrder < 0 || props.sortOrder > 2147483647) {
      throw new Error("Tour plan image sort order must be a non-negative database integer.");
    }
    return new TourPlanImageRef(props.imageId.toLowerCase(), props.sortOrder);
  }

  static fromSnapshot(snapshot: TourPlanImageRefSnapshot): TourPlanImageRef {
    return TourPlanImageRef.create(snapshot);
  }

  toSnapshot(): TourPlanImageRefSnapshot {
    return { imageId: this.imageId, sortOrder: this.sortOrder };
  }
}
