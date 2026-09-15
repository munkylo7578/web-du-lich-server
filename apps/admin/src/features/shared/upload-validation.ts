const MB = 1024 * 1024;
export const MAX_IMAGE_SIZE_MB = 50;
export const MAX_UPLOAD_REQUEST_MB = 500;
export const UPLOAD_REQUEST_SIZE_ERROR = "Tổng dung lượng tải lên không được vượt quá 500 MB.";
export const UPLOAD_FAILED_ERROR = "Không thể lưu. Vui lòng thử lại.";

export function getImageFileError(file: Pick<File, "size" | "type">, maxSizeMb = MAX_IMAGE_SIZE_MB) {
  if (file.size > maxSizeMb * MB) return `Mỗi ảnh không được vượt quá ${maxSizeMb} MB.`;
  if (file.size <= 0) return "Ảnh không hợp lệ.";
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    return "Chỉ hỗ trợ ảnh JPEG, PNG, WebP, AVIF.";
  }
  return undefined;
}

export function getUploadFormError(body: FormData) {
  // Reserve space for multipart boundaries and Server Action metadata without
  // serializing/copying hundreds of MB of file data in the browser.
  let requestBytes = MB;
  for (const [name, value] of body.entries()) {
    requestBytes += new Blob([name]).size + 1024;
    if (typeof value === "string") {
      requestBytes += new Blob([value]).size;
      continue;
    }
    requestBytes += value.size + new Blob([value.name]).size;
    if (name.startsWith("file:")) {
      const error = getImageFileError(value);
      if (error) return error;
    }
  }
  return requestBytes > MAX_UPLOAD_REQUEST_MB * MB ? UPLOAD_REQUEST_SIZE_ERROR : undefined;
}

type UploadActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitUpload<T extends UploadActionResult>(
  body: FormData,
  action: (body: FormData) => Promise<T>,
): Promise<T | UploadActionResult> {
  try {
    const error = getUploadFormError(body);
    if (error) return { success: false, message: error };
    return await action(body);
  } catch {
    // Request parsing/network failures may occur before the action can return
    // its own error. Never let them escape the form's async transition.
    return { success: false, message: UPLOAD_FAILED_ERROR };
  }
}
