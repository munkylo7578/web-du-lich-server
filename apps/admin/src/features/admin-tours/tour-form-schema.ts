import { z } from "zod";
import { DESTINATION_COUNTRIES } from "@destination-country";

const optionalHtml = z.string().trim().optional().default("");
const optionalVietnameseTourHtml = (message: string) => optionalHtml.refine(
  (value) => !value || value.replace(/<[^>]*>/g, "").trim().length >= 10,
  message,
);

export const imageNameSchema = z.string().trim()
  .max(500, "Tên ảnh không được vượt quá 500 ký tự.")
  .refine((value) => !value || value.length >= 2, "Tên ảnh cần ít nhất 2 ký tự.")
  .optional().default("");

export const pendingImagesSchema = z.array(z.object({
  clientId: z.string().uuid(),
  altText: imageNameSchema,
  role: z.enum(["cover", "gallery"]),
  sortOrder: z.number().int().min(0),
})).refine(
  (items) => new Set(items.map((item) => item.clientId)).size === items.length,
  "Danh sách ảnh mới chứa mã ảnh trùng lặp.",
);

export const pendingPlanImagesSchema = z.array(z.object({
  clientId: z.string().uuid(),
  planId: z.string().uuid(),
  altText: imageNameSchema,
  sortOrder: z.number().int().min(0),
})).refine(
  (items) => new Set(items.map((item) => item.clientId)).size === items.length,
  "Danh sách ảnh chặng mới chứa mã ảnh trùng lặp.",
);

const existingPlanImageSchema = z.object({
  imageId: z.string().uuid(),
  url: z.string(),
  altText: imageNameSchema,
  sortOrder: z.number().int().min(0),
});

export function imageFieldErrors(issues: readonly z.core.$ZodIssue[], prefix = ""): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = [prefix, ...issue.path].filter((part) => part !== "").join(".");
    (errors[path] ??= []).push(issue.message);
  }
  return errors;
}

export const destinationEditorSchema = z.object({
  destinationId: z.string().uuid().optional(),
  country: z.enum(DESTINATION_COUNTRIES, { error: "Vui lòng chọn quốc gia hợp lệ." }),
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
  departureStartMonth: z.number({ error: "Vui lòng chọn tháng từ 1 đến 12." })
    .int("Tháng khởi hành phải là số nguyên.")
    .min(1, "Tháng khởi hành phải từ 1 đến 12.")
    .max(12, "Tháng khởi hành phải từ 1 đến 12.")
    .nullish(),
  serviceDescription: optionalVietnameseTourHtml("Mô tả dịch vụ chung cần ít nhất 10 ký tự."),
  serviceDescriptions: z.object({
    accommodation: optionalVietnameseTourHtml("Mô tả nơi lưu trú cần ít nhất 10 ký tự."),
    transportation: optionalVietnameseTourHtml("Mô tả phương tiện di chuyển cần ít nhất 10 ký tự."),
    tourguide: optionalVietnameseTourHtml("Mô tả hướng dẫn viên cần ít nhất 10 ký tự."),
  }),
  translations: z.object({
    vi: z.object({
      name: z.string().trim().min(2, "Tên tour cần ít nhất 2 ký tự."),
      description: optionalVietnameseTourHtml("Mô tả cần ít nhất 10 ký tự."),
      inclusions: optionalVietnameseTourHtml("Dịch vụ bao gồm cần ít nhất 10 ký tự."),
      exclusions: optionalVietnameseTourHtml("Dịch vụ không bao gồm cần ít nhất 10 ký tự."),
    }),
    en: z.object({
      name: z.string().trim().optional().default(""),
      description: optionalHtml,
      inclusions: optionalHtml,
      exclusions: optionalHtml,
    }),
  }),
  destinations: z.array(
    z.object({
      destinationId: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
  services: z.array(z.object({ serviceId: z.string().uuid(), sortOrder: z.number().int().min(0) })),
  plans: z.array(
    z.object({
      planId: z.string().uuid(),
      sortOrder: z.number().int().min(0),
      name: localizedTextSchema,
      description: localizedTextSchema,
      images: z.array(existingPlanImageSchema),
    }),
  ),
  existingImages: z.array(
    z.object({
      imageId: z.string().uuid(),
      url: z.string(),
      altText: imageNameSchema,
      role: z.enum(["cover", "gallery"]),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

export type TourFormValues = z.input<typeof tourFormSchema>;

export type DestinationFormValue = TourFormValues["destinations"][number];

export type DestinationEditorFormValues = z.input<typeof destinationEditorSchema>;

export type DestinationEditorValues = z.output<typeof destinationEditorSchema>;

export type PendingImageMeta = z.output<typeof pendingImagesSchema>[number];

export type PendingPlanImageMeta = z.output<typeof pendingPlanImagesSchema>[number];
