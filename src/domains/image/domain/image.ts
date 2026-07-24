import { ImageId } from "./image-id";

export type ImageSnapshot = {
  id: string;
  url: string;
  altText: string;
  fileName?: string;
  mimeType?: string;
  sizeInBytes?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateImageProps = {
  url: string;
  altText: string;
  fileName?: string;
  mimeType?: string;
  sizeInBytes?: number;
};

export class Image {
  private constructor(
    private readonly id: ImageId,
    private url: string,
    private altText: string,
    private readonly fileName: string | undefined,
    private readonly mimeType: string | undefined,
    private readonly sizeInBytes: number | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: CreateImageProps): Image {
    const now = new Date();

    return new Image(
      ImageId.create(),
      Image.validateUrl(props.url),
      Image.validateAltText(props.altText),
      props.fileName?.trim() || undefined,
      props.mimeType?.trim() || undefined,
      Image.validateSize(props.sizeInBytes),
      now,
      now,
    );
  }

  static rehydrate(snapshot: ImageSnapshot): Image {
    return new Image(
      ImageId.create(snapshot.id),
      Image.validateUrl(snapshot.url),
      Image.validateAltText(snapshot.altText),
      snapshot.fileName,
      snapshot.mimeType,
      Image.validateSize(snapshot.sizeInBytes),
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  getId(): ImageId {
    return this.id;
  }

  changeAltText(altText: string): void {
    this.altText = Image.validateAltText(altText);
    this.touch();
  }

  replaceUrl(url: string): void {
    this.url = Image.validateUrl(url);
    this.touch();
  }

  toSnapshot(): ImageSnapshot {
    return {
      id: this.id.value,
      url: this.url,
      altText: this.altText,
      fileName: this.fileName,
      mimeType: this.mimeType,
      sizeInBytes: this.sizeInBytes,
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static validateUrl(url: string): string {
    const value = url.trim();

    if (!value) {
      throw new Error("Image url is required.");
    }

    if (!value.startsWith("/uploads/") && !value.startsWith("http://") && !value.startsWith("https://")) {
      throw new Error("Image url must be a local upload path or an absolute URL.");
    }

    return value;
  }

  private static validateAltText(altText: string): string {
    const value = altText.trim();

    if (value.length < 2) {
      throw new Error("Image alt text must have at least 2 characters.");
    }

    return value;
  }

  private static validateSize(sizeInBytes?: number): number | undefined {
    if (sizeInBytes === undefined) {
      return undefined;
    }

    if (!Number.isInteger(sizeInBytes) || sizeInBytes <= 0) {
      throw new Error("Image size must be a positive integer.");
    }

    return sizeInBytes;
  }
}
