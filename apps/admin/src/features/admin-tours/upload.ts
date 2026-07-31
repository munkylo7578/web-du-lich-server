import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

function getUploadConfig() {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  const publicBaseUrl = (process.env.UPLOAD_PUBLIC_BASE_URL || "/uploads").replace(/\/$/, "");
  const maxMb = Number(process.env.MAX_UPLOAD_IMAGE_MB || "8");

  return { uploadDir, publicBaseUrl, maxBytes: maxMb * 1024 * 1024 };
}

export async function saveTourImage(file: File) {
  const config = getUploadConfig();
  const extension = MIME_EXTENSIONS[file.type];

  if (!extension) {
    throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.");
  }

  if (file.size <= 0 || file.size > config.maxBytes) {
    throw new Error("Dung lượng ảnh không hợp lệ hoặc vượt quá giới hạn.");
  }

  const subdirectory = "tours";
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const directory = path.join(config.uploadDir, subdirectory);
  const physicalPath = path.join(directory, fileName);

  await mkdir(directory, { recursive: true });
  await writeFile(physicalPath, Buffer.from(await file.arrayBuffer()));

  return {
    physicalPath,
    url: `${config.publicBaseUrl}/${subdirectory}/${fileName}`,
    fileName,
    mimeType: file.type,
    sizeInBytes: file.size,
  };
}

export async function removeUploadedFiles(paths: string[]) {
  await Promise.all(paths.map((filePath) => unlink(filePath).catch(() => undefined)));
}
