import { z } from "zod";

const optionalHtml = z.string().trim().optional().default("");

export const destinationEditorSchema = z.object({
  destinationId: z.string().uuid().optional(),
  wardCodes: z.array(z.string().trim().min(1)).default([]),
  translations: z.object({
    vi: z.object({
      name: z.string().trim().min(2, "Tên điểm đến cần ít nhất 2 ký tự."),
      description: optionalHtml,
    }),
    en: z.object({
      name: z.string().trim().optional().default(""),
      description: optionalHtml,
    }),
  }),
});

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
  destinations: z.array(
    z.object({
      destinationId: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
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

export type DestinationFormValue = TourFormValues["destinations"][number];

export type DestinationEditorFormValues = z.input<typeof destinationEditorSchema>;

export type DestinationEditorValues = z.output<typeof destinationEditorSchema>;

export type PendingImageMeta = {
  clientId: string;
  altText: string;
  role: "cover" | "gallery";
  sortOrder: number;
};
