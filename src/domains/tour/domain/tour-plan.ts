import { DEFAULT_TOUR_LOCALE, type LocalizedText } from "./tour-locale";

export type TourPlanProps = {
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
};

export type TourPlanSnapshot = TourPlanProps;

export class TourPlan {
  private constructor(
    public readonly name: LocalizedText,
    public readonly description: LocalizedText,
    public readonly sortOrder: number,
  ) {}

  static create(props: TourPlanProps): TourPlan {
    const name = TourPlan.normalizeLocalizedText(props.name);
    const description = TourPlan.normalizeLocalizedText(props.description);

    if (!name[DEFAULT_TOUR_LOCALE]) {
      throw new Error("Tour plan name is required in the default locale.");
    }

    if (!description[DEFAULT_TOUR_LOCALE]) {
      throw new Error("Tour plan description is required in the default locale.");
    }

    if (!Number.isInteger(props.sortOrder) || props.sortOrder < 0) {
      throw new Error("Tour plan sort order must be a positive integer or zero.");
    }

    return new TourPlan(name, description, props.sortOrder);
  }

  static fromSnapshot(snapshot: TourPlanSnapshot): TourPlan {
    return TourPlan.create(snapshot);
  }

  toSnapshot(): TourPlanSnapshot {
    return {
      name: this.name,
      description: this.description,
      sortOrder: this.sortOrder,
    };
  }

  private static normalizeLocalizedText(value: LocalizedText): LocalizedText {
    return Object.fromEntries(
      Object.entries(value)
        .map(([locale, text]) => [locale, text?.trim()])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
  }
}
