import { getImageFileError, MAX_IMAGE_SIZE_MB } from "./upload-validation";

export const IMAGE_OPTIMIZATION_THRESHOLD_BYTES = 2 * 1024 * 1024;
export const IMAGE_MAX_EDGE = 2560;
export const IMAGE_WEBP_QUALITY = 0.9;
// Compressed bytes are not a reliable measure of decoded memory requirements.
export const IMAGE_MAX_INPUT_PIXELS = 100_000_000;
export const IMAGE_OPTIMIZATION_HELP = "Ảnh trên 2MB hoặc 2560px được tối ưu WebP chất lượng cao, cạnh dài tối đa 2560px. Không ép dung lượng xuống 2MB.";

export function getOptimizedDimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Không đọc được kích thước ảnh.");
  }
  if (width * height > IMAGE_MAX_INPUT_PIXELS) {
    throw new Error("Ảnh vượt quá 100 triệu điểm ảnh. Vui lòng giảm kích thước ảnh trước khi chọn.");
  }
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadLocalImage(file: Blob, signal: AbortSignal): Promise<HTMLImageElement> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => {
      URL.revokeObjectURL(url);
      signal.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
    };
    const abort = () => {
      cleanup();
      image.src = "";
      reject(signal.reason);
    };
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => {
      cleanup();
      reject(new Error("Không đọc được ảnh. Tệp có thể bị hỏng hoặc trình duyệt không hỗ trợ định dạng này. Vui lòng chọn JPEG, PNG hoặc WebP khác."));
    };
    signal.addEventListener("abort", abort, { once: true });
    // Modern browsers apply EXIF orientation when decoding HTML images.
    image.src = url;
  });
}

async function optimize(file: File, signal: AbortSignal, maxSizeMb: number): Promise<File> {
  signal.throwIfAborted();
  const inputError = getImageFileError(file, maxSizeMb);
  if (inputError) throw new Error(inputError);
  const image = await loadLocalImage(file, signal);
  let canvas: HTMLCanvasElement | undefined;
  try {
    signal.throwIfAborted();
    const dimensions = getOptimizedDimensions(image.naturalWidth, image.naturalHeight);
    if (file.size <= IMAGE_OPTIMIZATION_THRESHOLD_BYTES &&
      image.naturalWidth <= IMAGE_MAX_EDGE && image.naturalHeight <= IMAGE_MAX_EDGE) return file;

    const { default: compression } = await import("browser-image-compression");
    signal.throwIfAborted();
    canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ tối ưu ảnh. Vui lòng thử trình duyệt khác.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    // Keep the transparent canvas background (do not flatten PNG/WebP alpha).
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
    // Use only the encoder helper: the main compression API retries at lower
    // quality even with maxSizeMB=Infinity when the result exceeds source size.
    const blob = await compression.canvasToFile(canvas, "image/webp", name, file.lastModified, IMAGE_WEBP_QUALITY);
    signal.throwIfAborted();
    if (blob.type !== "image/webp" || !blob.size) {
      throw new Error("Trình duyệt không hỗ trợ xuất WebP. Vui lòng thử trình duyệt khác.");
    }
    const output = new File([blob], name, { type: "image/webp", lastModified: file.lastModified });
    const outputError = getImageFileError(output, maxSizeMb);
    if (outputError) throw new Error(outputError);
    const verified = await loadLocalImage(output, signal);
    try {
      if (verified.naturalWidth !== dimensions.width || verified.naturalHeight !== dimensions.height) {
        throw new Error("Kích thước ảnh sau tối ưu không đúng. Vui lòng chọn lại ảnh hoặc thử trình duyệt khác.");
      }
    } finally {
      verified.src = "";
    }
    signal.throwIfAborted();
    return output;
  } finally {
    image.src = "";
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

// Serialize processing across pickers to avoid decoding many large files at once.
// Only local image work is queued; no network upload occurs here.
let processingTail: Promise<unknown> = Promise.resolve();
export function optimizeImage(file: File, signal: AbortSignal, maxSizeMb = MAX_IMAGE_SIZE_MB): Promise<File> {
  const result = processingTail.then(() => optimize(file, signal, maxSizeMb));
  processingTail = result.catch(() => undefined);
  return result;
}
