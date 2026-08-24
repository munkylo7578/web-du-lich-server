import { removeUploadedFiles, saveImageFile } from "@/features/shared/image-upload";

export function saveServiceImage(file: File) {
  return saveImageFile(file, { subdirectory: "services", logScope: "ServiceUpload" });
}

export { removeUploadedFiles };
