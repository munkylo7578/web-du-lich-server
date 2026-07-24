import { TourId } from "./tour-id";
import { TourImageRef, type TourImageRefSnapshot } from "./tour-image-ref";
import { TourLocation, type TourLocationProps } from "./tour-location";

export type TourSnapshot = {
  id: string;
  name: string;
  description: string;
  location: TourLocationProps;
  images: TourImageRefSnapshot[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTourProps = {
  name: string;
  description: string;
  location: TourLocation;
  images?: TourImageRef[];
};

export class Tour {
  private constructor(
    private readonly id: TourId,
    private name: string,
    private description: string,
    private location: TourLocation,
    private images: TourImageRef[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: CreateTourProps): Tour {
    const now = new Date();

    return new Tour(
      TourId.create(),
      Tour.validateName(props.name),
      Tour.validateDescription(props.description),
      props.location,
      Tour.validateImages(props.images ?? []),
      now,
      now,
    );
  }

  static rehydrate(snapshot: TourSnapshot): Tour {
    return new Tour(
      TourId.create(snapshot.id),
      Tour.validateName(snapshot.name),
      Tour.validateDescription(snapshot.description),
      TourLocation.create(snapshot.location),
      Tour.validateImages(snapshot.images.map(TourImageRef.fromSnapshot)),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  getId(): TourId {
    return this.id;
  }

  rename(name: string): void {
    this.name = Tour.validateName(name);
    this.touch();
  }

  updateDescription(description: string): void {
    this.description = Tour.validateDescription(description);
    this.touch();
  }

  updateLocation(location: TourLocation): void {
    this.location = location;
    this.touch();
  }

  attachImage(image: TourImageRef): void {
    const exists = this.images.some((item) => item.imageId.equals(image.imageId));

    if (exists) {
      throw new Error("Image is already attached to this tour.");
    }

    this.images = Tour.validateImages([...this.images, image]);
    this.touch();
  }

  removeImage(imageId: string): void {
    this.images = this.images.filter((item) => item.imageId.value !== imageId);
    this.touch();
  }

  toSnapshot(): TourSnapshot {
    return {
      id: this.id.value,
      name: this.name,
      description: this.description,
      location: {
        lat: this.location.lat,
        lng: this.location.lng,
      },
      images: this.images.map((image) => image.toSnapshot()),
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static validateName(name: string): string {
    const value = name.trim();

    if (value.length < 2) {
      throw new Error("Tour name must have at least 2 characters.");
    }

    return value;
  }

  private static validateDescription(description: string): string {
    const value = description.trim();

    if (value.length < 10) {
      throw new Error("Tour description must have at least 10 characters.");
    }

    return value;
  }

  private static validateImages(images: TourImageRef[]): TourImageRef[] {
    const coverImages = images.filter((image) => image.role === "cover");

    if (coverImages.length > 1) {
      throw new Error("Tour can only have one cover image.");
    }

    return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
