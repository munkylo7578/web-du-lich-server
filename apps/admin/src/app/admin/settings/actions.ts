"use server";

import { revalidatePath } from "next/cache";

import { Setting } from "@/domains/setting/domain";
import { settingKeySchema, settingFormSchema, settingCategorySchema } from "@/features/admin-settings/settings-form-schema";
import { settingRepository } from "@/features/admin-settings/repository";
import { listAdminSettings } from "@/features/admin-settings/repository";
import type { AdminSetting } from "@/features/admin-settings/settings-types";
import type { AdminListQuery, AdminListResult } from "@/features/shared/admin-list";
import type { SettingCategory } from "@setting-category";
import { removeUploadedSettingFiles, saveSettingImage, saveSettingVideo } from "@/features/admin-settings/upload";
import { requireSession } from "@/lib/auth/session";

export type SettingActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function listAdminSettingsAction(
  category: SettingCategory,
  input: AdminListQuery,
): Promise<AdminListResult<AdminSetting>> {
  await requireSession();
  const parsedCategory = settingCategorySchema.parse(category);
  return listAdminSettings(parsedCategory, input);
}

export async function saveSettingAction(formData: FormData): Promise<SettingActionState> {
  await requireSession();

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
  } catch {
    return { success: false, message: "Dữ liệu biểu mẫu không hợp lệ." };
  }

  const parsed = settingFormSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin setting.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const existing = await settingRepository.findByKey(data.key);
  const isUpdate = Boolean(data.originalKey);

  if (!isUpdate && existing) {
    return { success: false, message: "Key này đã tồn tại.", fieldErrors: { key: ["Key này đã tồn tại."] } };
  }

  if (isUpdate && !existing) {
    return { success: false, message: "Không tìm thấy setting." };
  }

  if (existing && data.category !== existing.toSnapshot().category) {
    return { success: false, message: "Nhóm setting không thể thay đổi sau khi tạo." };
  }

  if (existing && data.type !== existing.toSnapshot().type) {
    return {
      success: false,
      message: "Loại setting không thể thay đổi sau khi tạo.",
      fieldErrors: { type: ["Loại setting không thể thay đổi sau khi tạo."] },
    };
  }

  const uploadedPaths: string[] = [];
  let committed = false;
  try {
    let value = data.value;

    if (data.type === "image") {
      const pendingClientId = String(formData.get("pendingImageClientId") || "");
      const file = pendingClientId ? formData.get(`file:${pendingClientId}`) : null;

      if (file instanceof File && file.size > 0) {
        const stored = await saveSettingImage(file);
        uploadedPaths.push(stored.physicalPath);
        value = stored.url;
      }
    }

    if (data.type === "video") {
      const file = formData.get("videoFile");
      if (file instanceof File && file.size > 0) {
        const stored = await saveSettingVideo(file);
        uploadedPaths.push(stored.physicalPath);
        value = stored.url;
      } else if (existing) {
        value = existing.toSnapshot().value as string;
      } else {
        throw new Error("Vui lòng chọn video MP4 cho setting loại Video.");
      }
    }

    const setting = existing ?? Setting.create({
      key: data.key,
      category: data.category,
      description: data.description,
      type: data.type,
      value: data.type === "image" || data.type === "video" ? value : undefined,
      translations: data.type === "text" || data.type === "plain_text" ? data.translations : undefined,
      canDelete: data.canDelete,
    });

    if (existing) {
      setting.update({
        description: data.description,
        value: data.type === "image" || data.type === "video" ? value : undefined,
        translations: data.type === "text" || data.type === "plain_text" ? data.translations : undefined,
      });
    }

    await settingRepository.save(setting);
    committed = true;
    revalidatePath(`/admin/settings/${data.category}`);

    return { success: true, message: isUpdate ? "Đã cập nhật setting." : "Đã tạo setting." };
  } catch (error) {
    if (committed) {
      console.error("[SettingUpload] Post-commit refresh failed", { error });
      return { success: true, message: "Đã lưu setting. Vui lòng tải lại trang để xem dữ liệu mới nhất." };
    }
    await removeUploadedSettingFiles(uploadedPaths);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể lưu setting.",
    };
  }
}

export async function deleteSettingAction(key: string, category: string): Promise<SettingActionState> {
  await requireSession();

  const parsedKey = settingKeySchema.safeParse(key);
  if (!parsedKey.success) {
    return { success: false, message: "Key không hợp lệ." };
  }

  const parsedCategory = settingCategorySchema.safeParse(category);
  if (!parsedCategory.success) {
    return { success: false, message: "Nhóm setting không hợp lệ." };
  }

  try {
    const existing = await settingRepository.findByKey(parsedKey.data);
    if (!existing || existing.toSnapshot().category !== parsedCategory.data) {
      return { success: false, message: "Không tìm thấy setting trong nhóm này." };
    }
    await settingRepository.delete(parsedKey.data);
    revalidatePath(`/admin/settings/${parsedCategory.data}`);
    return { success: true, message: "Đã xóa setting." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa setting.",
    };
  }
}
