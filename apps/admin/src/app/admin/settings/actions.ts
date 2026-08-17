"use server";

import { revalidatePath } from "next/cache";

import { Setting } from "@/domains/setting/domain";
import { settingKeySchema, settingFormSchema } from "@/features/admin-settings/settings-form-schema";
import { settingRepository } from "@/features/admin-settings/repository";
import { removeUploadedSettingFiles, saveSettingImage } from "@/features/admin-settings/upload";
import { requireSession } from "@/lib/auth/session";

export type SettingActionState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

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

  const uploadedPaths: string[] = [];
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

    const setting = existing ?? Setting.create({
      key: data.key,
      description: data.description,
      type: data.type,
      value,
    });

    if (existing) {
      setting.update({
        description: data.description,
        type: data.type,
        value,
      });
    }

    await settingRepository.save(setting);
    revalidatePath("/admin/settings");

    return { success: true, message: isUpdate ? "Đã cập nhật setting." : "Đã tạo setting." };
  } catch (error) {
    await removeUploadedSettingFiles(uploadedPaths);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể lưu setting.",
    };
  }
}

export async function deleteSettingAction(key: string): Promise<SettingActionState> {
  await requireSession();

  const parsedKey = settingKeySchema.safeParse(key);
  if (!parsedKey.success) {
    return { success: false, message: "Key không hợp lệ." };
  }

  try {
    await settingRepository.delete(parsedKey.data);
    revalidatePath("/admin/settings");
    return { success: true, message: "Đã xóa setting." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa setting.",
    };
  }
}
