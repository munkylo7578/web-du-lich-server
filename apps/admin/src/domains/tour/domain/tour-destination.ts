export type TourDestinationProps = {
  destinationId: string;
  sortOrder: number;
};

export type TourDestinationSnapshot = TourDestinationProps;

export class TourDestination {
  private constructor(
    public readonly destinationId: string,
    public readonly sortOrder: number,
  ) {}

  static create(props: TourDestinationProps): TourDestination {
    if (!TourDestination.isUuid(props.destinationId)) {
      throw new Error("Tour destination id must be a valid UUID.");
    }

    if (!Number.isInteger(props.sortOrder) || props.sortOrder < 0) {
      throw new Error("Tour destination sort order must be a positive integer or zero.");
    }

    return new TourDestination(props.destinationId, props.sortOrder);
  }

  static fromSnapshot(snapshot: TourDestinationSnapshot): TourDestination {
    return TourDestination.create(snapshot);
  }

  toSnapshot(): TourDestinationSnapshot {
    return {
      destinationId: this.destinationId,
      sortOrder: this.sortOrder,
    };
  }

  private static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
