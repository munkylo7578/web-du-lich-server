import { z } from "zod";

const optionalHtml = z.string().trim().optional().default("");

export const localizedTextSchema = z.object({
  vi: z.string().trim().min(1, "Nội dung tiếng Việt là bắt buộc."),
  en: z.string().trim().optional().default(""),
});

export const tourFormSchema = z.object({
  id: z.string().uuid().optional(),
  translations: z.object({
    vi: z.object({
      name: z.string().trim().min(2, "Tên tour cần ít nhất 2 ký tự."),
      description: optionalHtml.refine(
        (value) => !value || value.replace(/<[^>]*>/g, "").trim().length >= 10,
        "Mô tả cần ít nhất 10 ký tự.",
      ),
    }),
    en: z.object({
      name: z.string().trim().optional().default(""),
      description: optionalHtml,
    }),
  }),
  latitude: z.union([z.number().min(-90).max(90), z.null()]),
  longitude: z.union([z.number().min(-180).max(180), z.null()]),
  plans: z.array(
    z.object({
      sortOrder: z.number().int().min(0),
      name: localizedTextSchema,
      description: localizedTextSchema,
    }),
  ),
  existingImages: z.array(
    z.object({
      imageId: z.string().uuid(),
      url: z.string(),
      altText: z.string().optional().default(""),
      role: z.enum(["cover", "gallery"]),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

export type TourFormValues = z.input<typeof tourFormSchema>;

export type PendingImageMeta = {
  clientId: string;
  altText: string;
  role: "cover" | "gallery";
  sortOrder: number;
};
