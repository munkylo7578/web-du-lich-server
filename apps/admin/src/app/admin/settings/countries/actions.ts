"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { countryEditorSchema } from "@/features/admin-countries/country-form-schema";
import { findAdminCountry, updateCountryRecord, type CountryMediaSave } from "@/features/admin-countries/repository";
import { imageFieldErrors, pendingImagesSchema } from "@/features/admin-tours/tour-form-schema";
import { saveImageFile, removeUploadedFiles } from "@/features/shared/image-upload";

export type CountryActionState = { success: boolean; message: string; fieldErrors?: Record<string, string[]> };

export async function updateAdminCountryAction(body: FormData): Promise<CountryActionState> {
  await requireSession();
  let payload: unknown;
  let pendingPayload: unknown;
  try {
    payload = JSON.parse(String(body.get("payload") || "{}"));
    pendingPayload = JSON.parse(String(body.get("pendingImages") || "[]"));
  } catch {
    return { success: false, message: "Dữ liệu biểu mẫu không hợp lệ." };
  }
  const parsed = countryEditorSchema.safeParse(payload);
  const pending = pendingImagesSchema.safeParse(pendingPayload);
  if (!parsed.success) return { success: false, message: "Vui lòng kiểm tra thông tin quốc gia.", fieldErrors: imageFieldErrors(parsed.error.issues) };
  if (!pending.success) return { success: false, message: "Vui lòng kiểm tra thông tin ảnh.", fieldErrors: imageFieldErrors(pending.error.issues, "pendingImages") };
  const data = parsed.data;
  if ([...data.existingImages, ...pending.data].filter((image) => image.role === "cover").length > 1) {
    return { success: false, message: "Chỉ được chọn một ảnh bìa." };
  }
  const paths: string[] = [];
  let committed = false;
  try {
    const stored = await findAdminCountry(data.code);
    if (!stored) return { success: false, message: "Không tìm thấy quốc gia. Vui lòng chạy migration." };
    const allowed = new Set(stored.images.map((image) => image.imageId));
    if (data.existingImages.some((image) => !allowed.has(image.imageId))) return { success: false, message: "Ảnh không thuộc quốc gia đang chỉnh sửa." };
    const maxBytes = Number(process.env.MAX_UPLOAD_IMAGE_MB || "50") * 1024 * 1024;
    for (const meta of pending.data) {
      const file = body.get(`file:${meta.clientId}`);
      if (!(file instanceof File) || !file.size || file.size > maxBytes || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
        return { success: false, message: "Tệp ảnh không hợp lệ hoặc vượt quá dung lượng cho phép." };
      }
    }
    const media: CountryMediaSave = { refs: [...data.existingImages], newImages: [] };
    for (const meta of pending.data) {
      const uploaded = await saveImageFile(body.get(`file:${meta.clientId}`) as File, { subdirectory: "countries", logScope: "CountryUpload" });
      paths.push(uploaded.physicalPath);
      const imageId = crypto.randomUUID();
      media.newImages.push({ id: imageId, url: uploaded.url, altText: meta.altText || null,
        fileName: uploaded.fileName, mimeType: uploaded.mimeType, sizeInBytes: uploaded.sizeInBytes });
      media.refs.push({ imageId, url: uploaded.url, altText: meta.altText, role: meta.role, sortOrder: media.refs.length });
    }
    await updateCountryRecord(data, media);
    committed = true;
    revalidatePath("/admin/settings/countries");
    return { success: true, message: "Đã lưu quốc gia." };
  } catch {
    if (committed) return { success: true, message: "Đã lưu quốc gia. Vui lòng tải lại trang." };
    await removeUploadedFiles(paths, "CountryUpload");
    return { success: false, message: "Không thể lưu quốc gia. Vui lòng tải lại trang và thử lại." };
  }
}
