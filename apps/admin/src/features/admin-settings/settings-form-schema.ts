import { z } from "zod";

export const settingTypeSchema = z.enum(["text", "image"]);

export const settingKeySchema = z.string().trim().min(1, "Key là bắt buộc.");

const localizedValueSchema = z.object({
  vi: z.string().trim().default(""),
  en: z.string().trim().default(""),
});

export const settingFormSchema = z.object({
  originalKey: z.string().trim().optional().default(""),
  key: settingKeySchema,
  description: z.string().trim().optional().default(""),
  type: settingTypeSchema,
  canDelete: z.boolean().default(true),
  value: z.string().trim().optional().default(""),
  translations: localizedValueSchema.default({ vi: "", en: "" }),
}).superRefine((value, context) => {
  if (value.originalKey && value.originalKey !== value.key) {
    context.addIssue({ code: "custom", path: ["key"], message: "Key không thể thay đổi sau khi tạo." });
  }

  if (value.type === "text" && !hasTextContent(value.translations.vi)) {
    context.addIssue({
      code: "custom",
      path: ["translations", "vi"],
      message: "Giá trị tiếng Việt là bắt buộc.",
    });
  }

  if (value.type === "image" && value.value && !isImageUrl(value.value)) {
    context.addIssue({
      code: "custom",
      path: ["value"],
      message: "Giá trị ảnh phải là URL upload nội bộ hoặc URL tuyệt đối.",
    });
  }
});

export type SettingFormValues = z.input<typeof settingFormSchema>;
export type SettingFormData = z.output<typeof settingFormSchema>;

function hasTextContent(value: string): boolean {
  return Boolean(value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim());
}

function isImageUrl(value: string): boolean {
  return value.startsWith("/uploads/") || value.startsWith("http://") || value.startsWith("https://");
}
