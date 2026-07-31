export type TourLocationProps = {
  id: string;
};

export class TourLocation {
  private constructor(public readonly id: string) {}

  static create(props: TourLocationProps): TourLocation {
    if (!TourLocation.isUuid(props.id)) {
      throw new Error("Tour location id must be a valid UUID.");
    }

    return new TourLocation(props.id);
  }

  private static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
