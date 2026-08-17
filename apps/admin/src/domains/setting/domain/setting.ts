export const SETTING_TYPES = ["text", "image"] as const;

export type SettingType = (typeof SETTING_TYPES)[number];

export type SettingSnapshot = {
  key: string;
  description?: string;
  value: string;
  type: SettingType;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSettingProps = {
  key: string;
  description?: string;
  value: string;
  type: SettingType;
};

export type UpdateSettingProps = {
  description?: string;
  value: string;
  type: SettingType;
};

export class Setting {
  private constructor(
    private readonly key: string,
    private description: string | undefined,
    private value: string,
    private type: SettingType,
    private readonly canDelete: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: CreateSettingProps): Setting {
    const now = new Date();

    return new Setting(
      Setting.validateKey(props.key),
      Setting.validateDescription(props.description),
      Setting.validateValue(props.value, props.type),
      Setting.validateType(props.type),
      true,
      now,
      now,
    );
  }

  static rehydrate(snapshot: SettingSnapshot): Setting {
    return new Setting(
      Setting.validateKey(snapshot.key),
      Setting.validateDescription(snapshot.description),
      Setting.validateValue(snapshot.value, snapshot.type),
      Setting.validateType(snapshot.type),
      snapshot.canDelete,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  getKey(): string {
    return this.key;
  }

  update(props: UpdateSettingProps): void {
    this.description = Setting.validateDescription(props.description);
    this.type = Setting.validateType(props.type);
    this.value = Setting.validateValue(props.value, this.type);
    this.touch();
  }

  assertCanDelete(): void {
    if (!this.canDelete) {
      throw new Error("Setting quan trọng không thể xóa từ admin. Vui lòng thao tác trực tiếp trong database nếu thật sự cần.");
    }
  }

  toSnapshot(): SettingSnapshot {
    return {
      key: this.key,
      description: this.description,
      value: this.value,
      type: this.type,
      canDelete: this.canDelete,
      createdAt: new Date(this.createdAt),
      updatedAt: new Date(this.updatedAt),
    };
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static validateKey(key: string): string {
    const value = key.trim();

    if (!value) {
      throw new Error("Setting key is required.");
    }

    return value;
  }

  private static validateDescription(description?: string): string | undefined {
    const value = description?.trim();

    if (!value) {
      return undefined;
    }

    return value;
  }

  private static validateType(type: SettingType): SettingType {
    if (!SETTING_TYPES.includes(type)) {
      throw new Error(`Unsupported setting type: ${type}.`);
    }

    return type;
  }

  private static validateValue(value: string, type: SettingType): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error("Setting value is required.");
    }

    if (type === "image" && !isImageUrl(normalized)) {
      throw new Error("Image setting value must be a local upload path or an absolute URL.");
    }

    return normalized;
  }
}

function isImageUrl(value: string): boolean {
  return value.startsWith("/uploads/") || value.startsWith("http://") || value.startsWith("https://");
}
