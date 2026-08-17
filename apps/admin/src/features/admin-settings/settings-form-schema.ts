import { z } from "zod";

export const settingTypeSchema = z.enum(["text", "image"]);

export const settingKeySchema = z
  .string()
  .trim()
  .min(1, "Key là bắt buộc.");

export const settingFormSchema = z.object({
  originalKey: z.string().trim().optional().default(""),
  key: settingKeySchema,
  description: z.string().trim().optional().default(""),
  type: settingTypeSchema,
  value: z.string().trim().optional().default(""),
}).superRefine((value, context) => {
  if (value.originalKey && value.originalKey !== value.key) {
    context.addIssue({
      code: "custom",
      path: ["key"],
      message: "Key không thể thay đổi sau khi tạo.",
    });
  }

  if (value.type === "text" && !value.value) {
    context.addIssue({
      code: "custom",
      path: ["value"],
      message: "Giá trị text là bắt buộc.",
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

function isImageUrl(value: string): boolean {
  return value.startsWith("/uploads/") || value.startsWith("http://") || value.startsWith("https://");
}
