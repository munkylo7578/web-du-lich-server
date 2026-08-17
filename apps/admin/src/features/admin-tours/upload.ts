import "server-only";

import { removeUploadedFiles as removeFiles, saveImageFile } from "@/features/shared/image-upload";

export async function saveTourImage(file: File) {
  return saveImageFile(file, { subdirectory: "tours", logScope: "TourUpload" });
}

export async function removeUploadedFiles(paths: string[]) {
  return removeFiles(paths, "TourUpload");
}
