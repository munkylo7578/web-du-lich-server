"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Image } from "@/domains/image/domain";
import { Service, type ServiceTranslationSnapshot } from "@/domains/service/domain";
import { serviceFormSchema, type PendingServiceImageMeta } from "@/features/admin-services/service-form-schema";
import { searchServices, serviceRepository } from "@/features/admin-services/repository";
import type { AdminService } from "@/features/admin-services/service-types";
import { removeUploadedFiles, saveServiceImage } from "@/features/admin-services/upload";
import { requireSession } from "@/lib/auth/session";

export type ServiceActionState = { success: boolean; message: string; fieldErrors?: Record<string, string[]> };

export async function searchServicesAction(query: string): Promise<AdminService[]> {
  await requireSession();
  return searchServices(query);
}

export async function saveServiceAction(formData: FormData): Promise<ServiceActionState> {
  await requireSession();
  let payload: unknown;
  let pendingMeta: PendingServiceImageMeta[];
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
    pendingMeta = JSON.parse(String(formData.get("pendingImages") || "[]"));
  } catch {
    return { success: false, message: "Dữ liệu biểu mẫu không hợp lệ." };
  }
  const parsed = serviceFormSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: "Vui lòng kiểm tra lại thông tin dịch vụ.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const paths: string[] = [];
  try {
    const data = parsed.data;
    const translations: ServiceTranslationSnapshot[] = [
      { locale: "vi", name: data.translations.vi.name, description: data.translations.vi.description || undefined },
      ...(data.translations.en.name ? [{ locale: "en" as const, name: data.translations.en.name, description: data.translations.en.description || undefined }] : []),
    ];
    const existing = data.serviceId ? await serviceRepository.findById(data.serviceId) : null;
    if (data.serviceId && !existing) return { success: false, message: "Không tìm thấy dịch vụ." };
    const aggregate = existing ?? Service.create(translations);
    if (existing) aggregate.replaceTranslations(translations);
    const refs = data.existingImages.map((item, index) => ({ imageId: item.imageId, sortOrder: index }));
    const newImages = [];
    for (let index = 0; index < pendingMeta.length; index += 1) {
      const meta = pendingMeta[index];
      const file = formData.get(`file:${meta.clientId}`);
      if (!(file instanceof File)) throw new Error("Thiếu tệp ảnh dịch vụ.");
      const stored = await saveServiceImage(file);
      paths.push(stored.physicalPath);
      const image = Image.create({ url: stored.url, altText: meta.altText || undefined, fileName: stored.fileName, mimeType: stored.mimeType, sizeInBytes: stored.sizeInBytes });
      refs.push({ imageId: image.getId().value, sortOrder: refs.length });
      newImages.push({ image, physicalPath: stored.physicalPath });
    }
    aggregate.replaceImages(refs.map((item, index) => ({ ...item, sortOrder: index })));
    await serviceRepository.save(aggregate, newImages);
    revalidatePath("/admin/services");
    revalidatePath("/admin/tours");
    return { success: true, message: data.serviceId ? "Đã cập nhật dịch vụ." : "Đã tạo dịch vụ." };
  } catch (error) {
    await removeUploadedFiles(paths, "ServiceUpload");
    return { success: false, message: error instanceof Error ? error.message : "Không thể lưu dịch vụ." };
  }
}

export async function deleteServiceAction(id: string): Promise<ServiceActionState> {
  await requireSession();
  if (!z.string().uuid().safeParse(id).success) return { success: false, message: "Mã dịch vụ không hợp lệ." };
  try {
    await serviceRepository.delete(id);
    revalidatePath("/admin/services");
    revalidatePath("/admin/tours");
    return { success: true, message: "Đã xóa dịch vụ." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Không thể xóa dịch vụ." };
  }
}
