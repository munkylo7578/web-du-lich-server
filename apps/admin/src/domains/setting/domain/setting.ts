export const SETTING_TYPES = ["text", "image"] as const;
export const SETTING_LOCALES = ["vi", "en"] as const;

export type SettingType = (typeof SETTING_TYPES)[number];
export type SettingLocale = (typeof SETTING_LOCALES)[number];
export type SettingTranslations = { vi: string; en?: string };

export type SettingSnapshot = {
  key: string;
  description?: string;
  value?: string;
  translations: SettingTranslations;
  type: SettingType;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSettingProps = {
  key: string;
  description?: string;
  value?: string;
  translations?: SettingTranslations;
  type: SettingType;
  canDelete: boolean;
};

export type UpdateSettingProps = {
  description?: string;
  value?: string;
  translations?: SettingTranslations;
};

export class Setting {
  private constructor(
    private readonly key: string,
    private description: string | undefined,
    private value: string | undefined,
    private translations: SettingTranslations,
    private type: SettingType,
    private readonly canDelete: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: CreateSettingProps): Setting {
    const now = new Date();
    const type = Setting.validateType(props.type);
    const content = Setting.validateContent(type, props.value, props.translations);

    return new Setting(
      Setting.validateKey(props.key),
      Setting.validateDescription(props.description),
      content.value,
      content.translations,
      type,
      props.canDelete,
      now,
      now,
    );
  }

  static rehydrate(snapshot: SettingSnapshot): Setting {
    const type = Setting.validateType(snapshot.type);
    const content = Setting.validateContent(type, snapshot.value, snapshot.translations);

    return new Setting(
      Setting.validateKey(snapshot.key),
      Setting.validateDescription(snapshot.description),
      content.value,
      content.translations,
      type,
      snapshot.canDelete,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  getKey(): string {
    return this.key;
  }

  update(props: UpdateSettingProps): void {
    const content = Setting.validateContent(this.type, props.value, props.translations);
    this.description = Setting.validateDescription(props.description);
    this.value = content.value;
    this.translations = content.translations;
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
      translations: { ...this.translations },
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
    if (!value) throw new Error("Setting key is required.");
    return value;
  }

  private static validateDescription(description?: string): string | undefined {
    const value = description?.trim();
    return value || undefined;
  }

  private static validateType(type: SettingType): SettingType {
    if (!SETTING_TYPES.includes(type)) throw new Error(`Unsupported setting type: ${type}.`);
    return type;
  }

  private static validateContent(type: SettingType, value?: string, translations?: SettingTranslations) {
    if (type === "image") {
      const normalized = value?.trim();
      if (!normalized) throw new Error("Setting value is required.");
      if (!isImageUrl(normalized)) throw new Error("Image setting value must be a local upload path or an absolute URL.");
      return { value: normalized, translations: { vi: "" } as SettingTranslations };
    }

    const vi = normalizeRichText(translations?.vi);
    const en = normalizeRichText(translations?.en);
    if (!hasTextContent(vi)) throw new Error("Giá trị tiếng Việt là bắt buộc.");

    return {
      value: undefined,
      translations: { vi, ...(hasTextContent(en) ? { en } : {}) },
    };
  }
}

function normalizeRichText(value?: string): string {
  return value?.trim() ?? "";
}

function hasTextContent(value?: string): boolean {
  return Boolean(value?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim());
}

function isImageUrl(value: string): boolean {
  return value.startsWith("/uploads/") || value.startsWith("http://") || value.startsWith("https://");
}
