import "server-only";

import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

function getUploadConfig() {
  const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
  const publicBaseUrl = (process.env.UPLOAD_PUBLIC_BASE_URL || "/uploads").replace(/\/$/, "");
  const maxMb = Number(process.env.MAX_UPLOAD_IMAGE_MB || "8");

  return { uploadDir, publicBaseUrl, maxBytes: maxMb * 1024 * 1024 };
}

function logUploadInfo(scope: string, message: string, context?: Record<string, unknown>) {
  console.info(`[${scope}] ${message}`, context ?? {});
}

function logUploadError(scope: string, message: string, context?: Record<string, unknown>) {
  console.error(`[${scope}] ${message}`, context ?? {});
}

export async function saveImageFile(
  file: File,
  options: { subdirectory: string; logScope?: string },
) {
  const config = getUploadConfig();
  const extension = MIME_EXTENSIONS[file.type];
  const logScope = options.logScope ?? "ImageUpload";

  logUploadInfo(logScope, "saveImageFile:start", {
    uploadDir: config.uploadDir,
    publicBaseUrl: config.publicBaseUrl,
    maxBytes: config.maxBytes,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    subdirectory: options.subdirectory,
  });

  if (!extension) {
    logUploadError(logScope, "saveImageFile:unsupported_mime", {
      fileName: file.name,
      fileType: file.type,
      supportedTypes: Object.keys(MIME_EXTENSIONS),
    });
    throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.");
  }

  if (file.size <= 0 || file.size > config.maxBytes) {
    logUploadError(logScope, "saveImageFile:invalid_size", {
      fileName: file.name,
      fileSize: file.size,
      maxBytes: config.maxBytes,
    });
    throw new Error("Dung lượng ảnh không hợp lệ hoặc vượt quá giới hạn.");
  }

  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const directory = `${config.uploadDir.replace(/[\\/]+$/, "")}/${options.subdirectory}`;
  const physicalPath = `${directory}/${fileName}`;
  const url = `${config.publicBaseUrl}/${options.subdirectory}/${fileName}`;

  try {
    logUploadInfo(logScope, "saveImageFile:mkdir", { directory });
    await mkdir(directory, { recursive: true });
    await access(directory);

    logUploadInfo(logScope, "saveImageFile:write:start", { physicalPath });
    await writeFile(physicalPath, Buffer.from(await file.arrayBuffer()));
    await access(physicalPath);

    logUploadInfo(logScope, "saveImageFile:write:success", {
      physicalPath,
      url,
      fileName,
      mimeType: file.type,
      sizeInBytes: file.size,
    });
  } catch (error) {
    logUploadError(logScope, "saveImageFile:write:failed", {
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
    url,
    fileName,
    mimeType: file.type,
    sizeInBytes: file.size,
  };
}

export async function removeUploadedFiles(paths: string[], logScope = "ImageUpload") {
  if (paths.length) logUploadInfo(logScope, "removeUploadedFiles:start", { paths });

  await Promise.all(paths.map((filePath) => unlink(filePath).catch((error) => {
    logUploadError(logScope, "removeUploadedFiles:failed", {
      filePath,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  })));
}
