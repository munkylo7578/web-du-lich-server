export type TourLocationProps = {
  lat: number;
  lng: number;
};

export class TourLocation {
  private constructor(
    public readonly lat: number,
    public readonly lng: number,
  ) {}

  static create(props: TourLocationProps): TourLocation {
    if (!Number.isFinite(props.lat) || props.lat < -90 || props.lat > 90) {
      throw new Error("Tour latitude must be between -90 and 90.");
    }

    if (!Number.isFinite(props.lng) || props.lng < -180 || props.lng > 180) {
      throw new Error("Tour longitude must be between -180 and 180.");
    }

    return new TourLocation(props.lat, props.lng);
  }
}
