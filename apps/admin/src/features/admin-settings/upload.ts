import "server-only";

import { removeUploadedFiles as removeFiles, saveImageFile } from "@/features/shared/image-upload";

export async function saveSettingImage(file: File) {
  return saveImageFile(file, { subdirectory: "settings", logScope: "SettingUpload" });
}

export async function removeUploadedSettingFiles(paths: string[]) {
  return removeFiles(paths, "SettingUpload");
}
