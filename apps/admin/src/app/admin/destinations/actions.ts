"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { destinationProvinceCodes } from "@destination-country";

import { requireSession } from "@/lib/auth/session";
import {
  deleteDestinationRecord,
  listAdminDestinations,
  findAdminDestination,
  persistDestinationRecord,
  type DestinationImageSave,
  searchProvinces,
} from "@/features/admin-tours/repository";
import {
  destinationEditorSchema,
  imageFieldErrors,
  pendingImagesSchema,
} from "@/features/admin-tours/tour-form-schema";
import { saveImageFile, removeUploadedFiles } from "@/features/shared/image-upload";
import type { AdminDestination, AdminProvince } from "@/features/admin-tours/tour-types";
import type { AdminListQuery, AdminListResult } from "@/features/shared/admin-list";

export type DestinationActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const destinationIdSchema = z.string().uuid();

export async function listAdminDestinationsAction(input: AdminListQuery): Promise<AdminListResult<AdminDestination>> {
  await requireSession();
  return listAdminDestinations(input);
}

export async function searchDestinationProvincesAction(query: string): Promise<AdminProvince[]> {
  await requireSession();
  return searchProvinces(query);
}

export async function saveAdminDestinationAction(
  formData: FormData,
): Promise<DestinationActionState & { destination?: AdminDestination }> {
  const requestedId = z.string().uuid().safeParse(formData.get("saveRequestId"));
  const requestId = requestedId.success ? requestedId.data : crypto.randomUUID();
  const startedAt = Date.now();
  console.info("[DestinationSave] server:received", { requestId });
  try {
    await requireSession();
    console.info("[DestinationSave] server:authenticated", { requestId });
  } catch (error) {
    console.warn("[DestinationSave] server:authentication_interrupted", { requestId });
    throw error;
  }

  let payload: unknown;
  let pendingPayload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
    pendingPayload = JSON.parse(String(formData.get("pendingImages") || "[]"));
  } catch {
    console.warn("[DestinationSave] server:json_invalid", { requestId });
    return { success: false, message: "Dữ liệu biểu mẫu không hợp lệ." };
  }
  const parsed = destinationEditorSchema.safeParse(payload);
  if (!parsed.success) {
    console.warn("[DestinationSave] server:validation_failed", {
      requestId, fieldErrors: imageFieldErrors(parsed.error.issues),
    });
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin điểm đến.",
      fieldErrors: imageFieldErrors(parsed.error.issues),
    };
  }

  const pending = pendingImagesSchema.safeParse(pendingPayload);
  if (!pending.success) {
    console.warn("[DestinationSave] server:pending_images_invalid", {
      requestId, fieldErrors: imageFieldErrors(pending.error.issues, "pendingImages"),
    });
    return {
      success: false, message: "Vui lòng kiểm tra thông tin ảnh mới.",
      fieldErrors: imageFieldErrors(pending.error.issues, "pendingImages"),
    };
  }
  const data = parsed.data;
  const existing = data.existingImages ?? [];
  if ([...existing, ...pending.data].filter((image) => image.role === "cover").length > 1) {
    console.warn("[DestinationSave] server:multiple_covers", { requestId });
    return { success: false, message: "Chỉ được chọn một ảnh bìa." };
  }
  const paths: string[] = [];
  let committed = false;
  let stage = "load_existing";
  console.info("[DestinationSave] server:validated", {
    requestId, mode: data.destinationId ? "edit" : "create", country: data.country,
    provinceCount: data.provinceCodes.length, existingImageCount: existing.length,
    pendingImageCount: pending.data.length,
  });
  try {
    const stored = data.destinationId ? await findAdminDestination(data.destinationId) : null;
    if (data.destinationId && !stored) {
      console.warn("[DestinationSave] server:destination_not_found", { requestId });
      return { success: false, message: "Không tìm thấy điểm đến." };
    }
    const allowed = new Set(stored?.images.map((image) => image.imageId) ?? []);
    if (existing.some((image) => !allowed.has(image.imageId))) {
      console.warn("[DestinationSave] server:image_ownership_failed", { requestId });
      return { success: false, message: "Ảnh không thuộc điểm đến đang chỉnh sửa." };
    }
    const maxBytes = Number(process.env.MAX_UPLOAD_IMAGE_MB || "50") * 1024 * 1024;
    for (const meta of pending.data) {
      const file = formData.get(`file:${meta.clientId}`);
      if (!(file instanceof File) || !file.size || file.size > maxBytes
        || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
        console.warn("[DestinationSave] server:file_invalid", {
          requestId, hasFile: file instanceof File,
          size: file instanceof File ? file.size : null, type: file instanceof File ? file.type : null, maxBytes,
        });
        return { success: false, message: "Tệp ảnh bị thiếu, không hợp lệ hoặc vượt quá dung lượng cho phép." };
      }
    }
    const media: DestinationImageSave = { refs: [...existing], newImages: [] };
    stage = "upload_images";
    console.info("[DestinationSave] server:upload_start", { requestId, count: pending.data.length });
    for (const meta of pending.data) {
      const file = formData.get(`file:${meta.clientId}`) as File;
      const uploaded = await saveImageFile(file, { subdirectory: "destinations", logScope: "DestinationUpload" });
      paths.push(uploaded.physicalPath);
      const imageId = crypto.randomUUID();
      media.newImages.push({ id: imageId, url: uploaded.url, altText: meta.altText || null,
        fileName: uploaded.fileName, mimeType: uploaded.mimeType, sizeInBytes: uploaded.sizeInBytes });
      media.refs.push({ imageId, altText: meta.altText, role: meta.role, sortOrder: media.refs.length });
    }
    const destinationId = data.destinationId ?? crypto.randomUUID();
    stage = "persist_destination";
    console.info("[DestinationSave] server:persist_start", { requestId, destinationId });
    await persistDestinationRecord({
    destinationId,
    country: data.country,
    provinceCodes: destinationProvinceCodes(data.country, data.provinceCodes),
    translations: [
      {
        locale: "en",
        name: data.translations.en.name,
        description: data.translations.en.description,
        visa: data.translations.en.visa,
        weather: data.translations.en.weather,
      },
      ...(data.translations.vi.name
        ? [{
            locale: "vi" as const,
            name: data.translations.vi.name,
            description: data.translations.vi.description || undefined,
            visa: data.translations.vi.visa,
            weather: data.translations.vi.weather,
          }]
        : []),
    ],
    }, data.existingImages !== undefined || pending.data.length ? media : undefined, Boolean(data.destinationId));
    committed = true;
    console.info("[DestinationSave] server:persist_complete", { requestId, destinationId });

    stage = "revalidate";
    revalidatePath("/admin/destinations");
    revalidatePath("/admin/tours");

    console.info("[DestinationSave] server:success", { requestId, elapsedMs: Date.now() - startedAt });
    return { success: true, message: "Đã lưu điểm đến." };
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    // Do not log the complete ORM error: it can include SQL parameters and form content.
    const databaseError = cause && typeof cause === "object" ? cause : error;
    const detail = databaseError && typeof databaseError === "object" ? databaseError as Record<string, unknown> : {};
    console.error("[DestinationSave] server:failed", {
      requestId, stage, committed, elapsedMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
      databaseCode: typeof detail.code === "string" ? detail.code : undefined,
      table: typeof detail.table_name === "string" ? detail.table_name : undefined,
      constraint: typeof detail.constraint_name === "string" ? detail.constraint_name : undefined,
      missingProvinceRelation: databaseError instanceof Error && databaseError.message.includes("destination_provinces"),
    });
    if (committed) return { success: true, message: "Đã lưu điểm đến. Vui lòng tải lại trang để xem thay đổi." };
    await removeUploadedFiles(paths, "DestinationUpload");
    return { success: false, message: error instanceof Error ? error.message : "Không thể lưu điểm đến." };
  }
}

export async function deleteAdminDestinationAction(id: string): Promise<DestinationActionState> {
  await requireSession();

  const parsedId = destinationIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false, message: "Mã điểm đến không hợp lệ." };
  }

  try {
    await deleteDestinationRecord(parsedId.data);
    revalidatePath("/admin/destinations");
    revalidatePath("/admin/tours");
    return { success: true, message: "Đã xóa điểm đến." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa điểm đến.",
    };
  }
}
