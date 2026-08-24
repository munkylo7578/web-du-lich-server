import { z } from "zod";

const optionalDescription = z.string().trim().optional().default("").refine(
  (value) => !value || value.replace(/<[^>]*>/g, "").trim().length >= 10,
  "Mô tả cần ít nhất 10 ký tự.",
);

export const serviceFormSchema = z.object({
  serviceId: z.string().uuid().optional(),
  translations: z.object({
    vi: z.object({
      name: z.string().trim().min(2, "Tên dịch vụ cần ít nhất 2 ký tự."),
      description: optionalDescription,
    }),
    en: z.object({
      name: z.string().trim().optional().default(""),
      description: optionalDescription,
    }),
  }),
  existingImages: z.array(z.object({
    imageId: z.string().uuid(),
    url: z.string(),
    altText: z.string().optional().default(""),
    sortOrder: z.number().int().min(0),
  })),
});

export type ServiceFormValues = z.input<typeof serviceFormSchema>;
export type PendingServiceImageMeta = { clientId: string; altText: string; sortOrder: number };
