"use server";

import { revalidatePath } from "next/cache";

import { Image } from "@/domains/image/domain";
import {
  Tour,
  TourImageRef,
  TourLocation,
  TourPlan,
  type TourTranslationSnapshot,
} from "@/domains/tour/domain";
import { requireSession } from "@/lib/auth/session";
import { searchLocations, tourRepository } from "@/features/admin-tours/repository";
import { type PendingImageMeta, tourFormSchema } from "@/features/admin-tours/tour-form-schema";
import type { AdminLocation } from "@/features/admin-tours/tour-types";
import { removeUploadedFiles, saveTourImage } from "@/features/admin-tours/upload";

export type TourActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function searchLocationsAction(query: string): Promise<AdminLocation[]> {
  await requireSession();
  return searchLocations(query);
}

export async function saveTourAction(formData: FormData): Promise<TourActionState> {
  await requireSession();

  let payload: unknown;
  let pendingMeta: PendingImageMeta[];
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
    pendingMeta = JSON.parse(String(formData.get("pendingImages") || "[]"));
  } catch {
    return { success: false, message: "Dữ liệu biểu mẫu không hợp lệ." };
  }

  const parsed = tourFormSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại các trường thông tin.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const uploadedPaths: string[] = [];
  try {
    const data = parsed.data;
    const translations: TourTranslationSnapshot[] = [
      {
        locale: "vi",
        name: data.translations.vi.name,
        description: data.translations.vi.description || undefined,
      },
      ...(data.translations.en.name
        ? [{
            locale: "en" as const,
            name: data.translations.en.name,
            description: data.translations.en.description || undefined,
          }]
        : []),
    ];
    const location = data.locationId ? TourLocation.create({ id: data.locationId }) : undefined;
    const plans = data.plans.map((plan, index) =>
      TourPlan.create({ ...plan, sortOrder: index }),
    );

    const tour = data.id ? await tourRepository.findById(data.id) : null;
    if (data.id && !tour) return { success: false, message: "Không tìm thấy tour." };

    const aggregate = tour || Tour.create({ translations, location, plans });
    if (tour) {
      aggregate.replaceTranslations(translations);
      aggregate.updateLocation(location);
      aggregate.replacePlans(plans);
    }

    const existingRefs = data.existingImages.map((image, index) =>
      TourImageRef.fromSnapshot({
        imageId: image.imageId,
        role: image.role,
        sortOrder: index,
      }),
    );
    const newImages = [];
    const newRefs = [];

    for (let index = 0; index < pendingMeta.length; index += 1) {
      const meta = pendingMeta[index];
      const file = formData.get(`file:${meta.clientId}`);
      if (!(file instanceof File)) continue;

      const stored = await saveTourImage(file);
      uploadedPaths.push(stored.physicalPath);
      const image = Image.create({
        url: stored.url,
        altText: meta.altText || undefined,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeInBytes: stored.sizeInBytes,
      });
      const ref = TourImageRef.create({
        imageId: image.getId(),
        role: meta.role,
        sortOrder: existingRefs.length + index,
      });
      newImages.push({ image, physicalPath: stored.physicalPath });
      newRefs.push(ref);
    }

    aggregate.replaceImages([...existingRefs, ...newRefs]);
    await tourRepository.save(aggregate, newImages);
    revalidatePath("/admin/tours");
    return { success: true, message: data.id ? "Đã cập nhật tour." : "Đã tạo tour." };
  } catch (error) {
    await removeUploadedFiles(uploadedPaths);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể lưu tour.",
    };
  }
}

export async function deleteTourAction(id: string): Promise<TourActionState> {
  await requireSession();
  try {
    await tourRepository.delete(id);
    revalidatePath("/admin/tours");
    return { success: true, message: "Đã xóa tour." };
  } catch {
    return { success: false, message: "Không thể xóa tour." };
  }
}
