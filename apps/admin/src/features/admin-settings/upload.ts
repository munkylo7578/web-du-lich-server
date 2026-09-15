import "server-only";

import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";

import { removeUploadedFiles as removeFiles, saveImageFile } from "@/features/shared/image-upload";

export async function saveSettingImage(file: File) {
  return saveImageFile(file, { subdirectory: "settings", logScope: "SettingUpload" });
}

export async function saveSettingVideo(file: File) {
  const uploadDir = (process.env.UPLOAD_DIR || "public/uploads").replace(/[\\/]+$/, "");
  const maxMb = Number(process.env.MAX_UPLOAD_VIDEO_MB || "50");
  const maxBytes = maxMb * 1024 * 1024;

  if (file.type !== "video/mp4") {
    throw new Error("Chỉ hỗ trợ video MP4.");
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`Dung lượng video không hợp lệ hoặc vượt quá ${maxMb} MB.`);
  }

  const fileName = `${Date.now()}-${randomUUID()}.mp4`;
  const directory = `${uploadDir}/settings/videos`;
  const physicalPath = `${directory}/${fileName}`;
  const url = `/uploads/settings/videos/${fileName}`;

  await mkdir(directory, { recursive: true });
  await writeFile(physicalPath, Buffer.from(await file.arrayBuffer()));
  await access(physicalPath);

  return { physicalPath, url };
}

export async function removeUploadedSettingFiles(paths: string[]) {
  return removeFiles(paths, "SettingUpload");
}
