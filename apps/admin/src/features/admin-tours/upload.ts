import "server-only";

import { access, mkdir, unlink, writeFile } from "node:fs/promises";
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

function logUploadInfo(message: string, context?: Record<string, unknown>) {
  console.info(`[TourUpload] ${message}`, context ?? {});
}

function logUploadError(message: string, context?: Record<string, unknown>) {
  console.error(`[TourUpload] ${message}`, context ?? {});
}

export async function saveTourImage(file: File) {
  const config = getUploadConfig();
  const extension = MIME_EXTENSIONS[file.type];

  logUploadInfo("saveTourImage:start", {
    cwd: process.cwd(),
    uploadDir: config.uploadDir,
    publicBaseUrl: config.publicBaseUrl,
    maxBytes: config.maxBytes,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  if (!extension) {
    logUploadError("saveTourImage:unsupported_mime", {
      fileName: file.name,
      fileType: file.type,
      supportedTypes: Object.keys(MIME_EXTENSIONS),
    });
    throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.");
  }

  if (file.size <= 0 || file.size > config.maxBytes) {
    logUploadError("saveTourImage:invalid_size", {
      fileName: file.name,
      fileSize: file.size,
      maxBytes: config.maxBytes,
    });
    throw new Error("Dung lượng ảnh không hợp lệ hoặc vượt quá giới hạn.");
  }

  const subdirectory = "tours";
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const directory = path.join(config.uploadDir, subdirectory);
  const physicalPath = path.join(directory, fileName);

  try {
    logUploadInfo("saveTourImage:mkdir", { directory });
    await mkdir(directory, { recursive: true });
    await access(directory);

    logUploadInfo("saveTourImage:write:start", { physicalPath });
    await writeFile(physicalPath, Buffer.from(await file.arrayBuffer()));
    await access(physicalPath);

    logUploadInfo("saveTourImage:write:success", {
      physicalPath,
      url: `${config.publicBaseUrl}/${subdirectory}/${fileName}`,
      fileName,
      mimeType: file.type,
      sizeInBytes: file.size,
    });
  } catch (error) {
    logUploadError("saveTourImage:write:failed", {
      cwd: process.cwd(),
      uploadDir: config.uploadDir,
      directory,
      physicalPath,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  return {
    physicalPath,
    url: `${config.publicBaseUrl}/${subdirectory}/${fileName}`,
    fileName,
    mimeType: file.type,
    sizeInBytes: file.size,
  };
}

export async function removeUploadedFiles(paths: string[]) {
  if (paths.length) logUploadInfo("removeUploadedFiles:start", { paths });

  await Promise.all(paths.map((filePath) => unlink(filePath).catch((error) => {
    logUploadError("removeUploadedFiles:failed", {
      filePath,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  })));
}
