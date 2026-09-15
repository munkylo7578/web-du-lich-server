import { getOptimizedDimensions, optimizeImage } from "./image-optimization";
import compression from "browser-image-compression";

jest.mock("browser-image-compression", () => ({
  __esModule: true,
  default: { canvasToFile: jest.fn() },
}));

const MB = 1024 * 1024;
const encode = jest.mocked(compression.canvasToFile);
let inputWidth = 6000;
let inputHeight = 4000;
let verificationMismatch = false;
let decodeError = false;
let canvas: { width: number; height: number; getContext: jest.Mock };
let context: { drawImage: jest.Mock; imageSmoothingEnabled: boolean; imageSmoothingQuality: string };
let imageLoads = 0;
let revoke: jest.Mock;

class MockImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload?: () => void;
  onerror?: () => void;
  set src(value: string) {
    if (!value) return;
    const verification = imageLoads++ % 2 === 1;
    this.naturalWidth = verification ? canvas.width + Number(verificationMismatch) : inputWidth;
    this.naturalHeight = verification ? canvas.height : inputHeight;
    queueMicrotask(() => decodeError ? this.onerror?.() : this.onload?.());
  }
}

function file(size = 3 * MB, type = "image/jpeg") {
  return new File([new Uint8Array(size)], "holiday.jpg", { type, lastModified: 123 });
}

beforeEach(() => {
  inputWidth = 6000;
  inputHeight = 4000;
  verificationMismatch = false;
  decodeError = false;
  imageLoads = 0;
  context = { drawImage: jest.fn(), imageSmoothingEnabled: false, imageSmoothingQuality: "low" };
  canvas = { width: 0, height: 0, getContext: jest.fn(() => context) };
  revoke = jest.fn();
  jest.replaceProperty(globalThis, "URL", { createObjectURL: jest.fn(() => "blob:local"), revokeObjectURL: revoke } as unknown as typeof URL);
  Object.defineProperty(globalThis, "Image", { configurable: true, value: MockImage });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: jest.fn(() => canvas) } });
  encode.mockReset();
  encode.mockImplementation(async (_canvas, type, name) => new File([new Uint8Array(3 * MB)], name, { type }));
});

afterEach(() => {
  jest.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "Image");
  Reflect.deleteProperty(globalThis, "document");
});

describe("resolution-first image optimization", () => {
  it.each([
    [6000, 4000, 2560, 1707],
    [4000, 6000, 1707, 2560],
    [1600, 1200, 1600, 1200],
    [2560, 2560, 2560, 2560],
    [9000, 1000, 2560, 284],
  ])("resizes %i x %i without upscaling", (w, h, width, height) => {
    expect(getOptimizedDimensions(w, h)).toEqual({ width, height });
  });

  it.each([[0, 100], [NaN, 100], [10001, 10000]])("rejects unsafe dimensions %i x %i", (w, h) => {
    expect(() => getOptimizedDimensions(w, h)).toThrow();
  });

  it("preserves small images byte-for-byte, including the 2 MB / 2560px boundary", async () => {
    inputWidth = 2560;
    inputHeight = 1440;
    const original = file(2 * MB);
    expect(await optimizeImage(original, new AbortController().signal)).toBe(original);
    expect(encode).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it("encodes once at quality 0.9, accepting output over 2 MB and larger than the source", async () => {
    const output = await optimizeImage(file(1000), new AbortController().signal);
    expect(output.size).toBe(3 * MB);
    expect(output.type).toBe("image/webp");
    expect(output.name).toBe("holiday.webp");
    expect(output.lastModified).toBe(123);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledWith(canvas, "image/webp", "holiday.webp", 123, 0.9);
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(MockImage), 0, 0, 2560, 1707);
    expect(context.imageSmoothingQuality).toBe("high");
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it.each(["image/jpeg", "image/png", "image/webp", "image/avif"])("handles browser-decodable %s input without upscaling", async (type) => {
    inputWidth = 1600;
    inputHeight = 1200;
    await optimizeImage(file(3 * MB, type), new AbortController().signal);
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(MockImage), 0, 0, 1600, 1200);
  });

  it("rejects corrupt or unsupported browser decoding without uploading the original", async () => {
    decodeError = true;
    await expect(optimizeImage(file(), new AbortController().signal)).rejects.toThrow("Không đọc được ảnh");
    expect(encode).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it("rejects an encoder falling back to PNG", async () => {
    encode.mockResolvedValue(file(1000, "image/png"));
    await expect(optimizeImage(file(), new AbortController().signal)).rejects.toThrow("WebP");
    expect(canvas.width).toBe(0);
  });

  it("rejects silent dimension changes", async () => {
    verificationMismatch = true;
    await expect(optimizeImage(file(), new AbortController().signal)).rejects.toThrow("Kích thước ảnh");
  });

  it("keeps existing input and output safety limits", async () => {
    await expect(optimizeImage(file(1, "image/gif"), new AbortController().signal)).rejects.toThrow("Chỉ hỗ trợ");
    await expect(optimizeImage(file(3 * MB), new AbortController().signal, 1)).rejects.toThrow("1 MB");
    encode.mockResolvedValue(file(4 * MB, "image/webp"));
    await expect(optimizeImage(file(1000), new AbortController().signal, 1)).rejects.toThrow("1 MB");
  });

  it("cancels queued work before decoding and permits subsequent work", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(optimizeImage(file(), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(imageLoads).toBe(0);
    await expect(optimizeImage(file(), new AbortController().signal)).resolves.toHaveProperty("type", "image/webp");
  });

  it("discards results canceled during encoding and serializes jobs", async () => {
    const controller = new AbortController();
    let release!: (output: File) => void;
    let started!: () => void;
    const encoding = new Promise<void>((resolve) => { started = resolve; });
    encode.mockImplementationOnce(() => {
      started();
      return new Promise<File>((resolve) => { release = resolve; });
    });
    const first = optimizeImage(file(), controller.signal);
    const secondController = new AbortController();
    const second = optimizeImage(file(), secondController.signal);
    await encoding;
    expect(imageLoads).toBe(1);
    controller.abort();
    secondController.abort();
    release(file(1000, "image/webp"));
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(second).rejects.toMatchObject({ name: "AbortError" });
    expect(encode).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(0);
  });
});
