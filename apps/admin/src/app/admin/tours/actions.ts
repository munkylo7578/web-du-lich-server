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

  const requestId = crypto.randomUUID();
  console.info("[TourUpload] saveTourAction:start", {
    requestId,
    formDataKeys: Array.from(formData.keys()),
  });

  let payload: unknown;
  let pendingMeta: PendingImageMeta[];
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
    pendingMeta = JSON.parse(String(formData.get("pendingImages") || "[]"));
  } catch {
    console.error("[TourUpload] saveTourAction:parse_failed", { requestId });
    return { success: false, message: "Dữ liệu biểu mẫu không hợp lệ." };
  }

  console.info("[TourUpload] saveTourAction:parsed", {
    requestId,
    pendingMetaCount: pendingMeta.length,
    pendingClientIds: pendingMeta.map((meta) => meta.clientId),
  });

  const parsed = tourFormSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("[TourUpload] saveTourAction:validation_failed", {
      requestId,
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
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

      console.info("[TourUpload] saveTourAction:pending_file", {
        requestId,
        index,
        clientId: meta.clientId,
        hasFile: file instanceof File,
        fileName: file instanceof File ? file.name : undefined,
        fileType: file instanceof File ? file.type : undefined,
        fileSize: file instanceof File ? file.size : undefined,
      });

      if (!(file instanceof File)) {
        console.error("[TourUpload] saveTourAction:missing_file", {
          requestId,
          index,
          clientId: meta.clientId,
          availableFormDataKeys: Array.from(formData.keys()),
        });
        continue;
      }

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
    console.info("[TourUpload] saveTourAction:success", {
      requestId,
      tourId: aggregate.getId().toString(),
      pendingMetaCount: pendingMeta.length,
      savedNewImages: newImages.length,
      uploadedPaths,
    });
    revalidatePath("/admin/tours");
    return { success: true, message: data.id ? "Đã cập nhật tour." : "Đã tạo tour." };
  } catch (error) {
    console.error("[TourUpload] saveTourAction:failed", {
      requestId,
      uploadedPaths,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
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
