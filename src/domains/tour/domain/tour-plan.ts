export type TourPlanProps = {
  name: string;
  description: string;
  sortOrder: number;
};

export type TourPlanSnapshot = TourPlanProps;

export class TourPlan {
  private constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly sortOrder: number,
  ) {}

  static create(props: TourPlanProps): TourPlan {
    const name = props.name.trim();
    const description = props.description.trim();

    if (!name) {
      throw new Error("Tour plan name is required.");
    }

    if (!description) {
      throw new Error("Tour plan description is required.");
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
}
