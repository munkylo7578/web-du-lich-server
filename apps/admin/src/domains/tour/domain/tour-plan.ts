import { DEFAULT_TOUR_LOCALE, type LocalizedText } from "./tour-locale";
import { TourPlanId } from "./tour-plan-id";
import { TourPlanImageRef, type TourPlanImageRefSnapshot } from "./tour-plan-image-ref";

export type TourPlanProps = {
  planId?: string;
  images?: TourPlanImageRefSnapshot[];
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
};

export type TourPlanSnapshot = Omit<TourPlanProps, "planId" | "images"> & {
  planId: string;
  images: TourPlanImageRefSnapshot[];
};

export class TourPlan {
  private constructor(
    public readonly planId: string,
    private readonly localizedName: LocalizedText,
    private readonly localizedDescription: LocalizedText,
    public readonly sortOrder: number,
    private readonly imageRefs: TourPlanImageRef[],
  ) {}

  get name(): LocalizedText { return { ...this.localizedName }; }
  get description(): LocalizedText { return { ...this.localizedDescription }; }
  get images(): TourPlanImageRefSnapshot[] { return this.imageRefs.map((image) => image.toSnapshot()); }

  static create(props: TourPlanProps): TourPlan {
    const name = TourPlan.normalizeLocalizedText(props.name);
    const description = TourPlan.normalizeLocalizedText(props.description);

    if (!name[DEFAULT_TOUR_LOCALE]) {
      throw new Error("Tour plan name is required in the default locale.");
    }

    if (!description[DEFAULT_TOUR_LOCALE]) {
      throw new Error("Tour plan description is required in the default locale.");
    }

    if (!Number.isInteger(props.sortOrder) || props.sortOrder < 0 || props.sortOrder > 2147483647) {
      throw new Error("Tour plan sort order must be a positive integer or zero.");
    }

    const images = (props.images ?? []).map(TourPlanImageRef.fromSnapshot);
    if (new Set(images.map((image) => image.imageId)).size !== images.length) {
      throw new Error("Tour plan image ids must be unique within a plan.");
    }
    if (new Set(images.map((image) => image.sortOrder)).size !== images.length) {
      throw new Error("Tour plan image sort orders must be unique within a plan.");
    }
    return new TourPlan(TourPlanId.create(props.planId).value, name, description, props.sortOrder,
      images.sort((a, b) => a.sortOrder - b.sortOrder));
  }

  static fromSnapshot(snapshot: TourPlanSnapshot): TourPlan {
    TourPlanId.fromStored(snapshot.planId);
    if (!Array.isArray(snapshot.images)) throw new Error("Stored tour plan images are required.");
    return TourPlan.create(snapshot);
  }

  toSnapshot(): TourPlanSnapshot {
    return {
      planId: this.planId,
      images: this.images,
      name: this.name,
      description: this.description,
      sortOrder: this.sortOrder,
    };
  }

  private static normalizeLocalizedText(value: LocalizedText): LocalizedText {
    if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.values(value).some((text) => text !== undefined && typeof text !== "string")) {
      throw new Error("Tour plan localized text must be an object of strings.");
    }
    return Object.fromEntries(
      Object.entries(value)
        .map(([locale, text]) => [locale, text?.trim()])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
  }
}
