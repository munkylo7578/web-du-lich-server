import { z } from "zod";
import { DESTINATION_COUNTRIES } from "@destination-country";
import { imageNameSchema } from "@/features/admin-tours/tour-form-schema";

const hasContent = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;|&#xA0;/gi, " ").replace(/[\s\u200B-\u200D\uFEFF]/g, "").length > 0;
const html = z.string().trim().optional().default("").transform((value) => hasContent(value) ? value : "");
const translation = z.object({
  name: z.string().trim().max(255, "Tên không được vượt quá 255 ký tự."),
  description: html,
  visa: html,
  weather: html,
});
export const countryEditorSchema = z.object({
  code: z.enum(DESTINATION_COUNTRIES),
  translations: z.object({
    en: translation.extend({ name: translation.shape.name.min(2, "Tên tiếng Anh cần ít nhất 2 ký tự.") }),
    vi: translation,
  }),
  existingImages: z.array(z.object({
    imageId: z.string().uuid(), url: z.string(), altText: imageNameSchema,
    role: z.enum(["cover", "gallery"]), sortOrder: z.number().int().min(0),
  })).refine((items) => new Set(items.map((image) => image.imageId)).size === items.length, "Mã ảnh bị trùng lặp."),
}).superRefine(({ translations, existingImages }, ctx) => {
  const vi = translations.vi;
  if ((vi.name || vi.description || vi.visa || vi.weather) && vi.name.length < 2) {
    ctx.addIssue({ code: "custom", path: ["translations", "vi", "name"], message: "Nhập tên tiếng Việt (ít nhất 2 ký tự) để lưu bản dịch." });
  }
  if (existingImages.filter((image) => image.role === "cover").length > 1) {
    ctx.addIssue({ code: "custom", path: ["existingImages"], message: "Chỉ được chọn một ảnh bìa." });
  }
});
export type CountryFormValues = z.input<typeof countryEditorSchema>;
export type CountryEditorValues = z.output<typeof countryEditorSchema>;
