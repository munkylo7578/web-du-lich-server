import {
  getImageFileError,
  getUploadFormError,
  submitUpload,
  UPLOAD_FAILED_ERROR,
  UPLOAD_REQUEST_SIZE_ERROR,
} from "./upload-validation";

const MB = 1024 * 1024;

// Use metadata only: boundary tests must not allocate 500 MB of image data.
function image(size: number, type = "image/jpeg") {
  return { name: "photo.jpg", size, type } as File;
}

function formData(entries: [string, FormDataEntryValue][]) {
  return { entries: () => entries[Symbol.iterator]() } as FormData;
}

describe("upload validation", () => {
  it("accepts an image exactly at 50 MB and rejects one byte over", () => {
    expect(getImageFileError(image(50 * MB))).toBeUndefined();
    expect(getImageFileError(image(50 * MB + 1))).toBe("Mỗi ảnh không được vượt quá 50 MB.");
  });

  it("validates custom picker limits, empty images, and unsupported pasted types", () => {
    expect(getImageFileError(image(2 * MB), 1)).toBe("Mỗi ảnh không được vượt quá 1 MB.");
    expect(getImageFileError(image(0))).toBe("Ảnh không hợp lệ.");
    expect(getImageFileError(image(100, "image/gif"))).toBe("Chỉ hỗ trợ ảnh JPEG, PNG, WebP, AVIF.");
  });

  it("allows two 50 MB images in one submission", () => {
    expect(getUploadFormError(formData([
      ["payload", '{"name":"Tour"}'],
      ["file:1", image(50 * MB)],
      ["file:2", image(50 * MB)],
    ]))).toBeUndefined();
  });

  it("rejects totals over 500 MB and reserves room for request overhead", () => {
    for (const count of [10, 11]) {
      const entries: [string, FormDataEntryValue][] = Array.from(
        { length: count }, (_, index) => [`file:${index}`, image(50 * MB)],
      );
      expect(getUploadFormError(formData(entries))).toBe(UPLOAD_REQUEST_SIZE_ERROR);
    }
  });

  it("includes text metadata and video files in the request size", () => {
    const entries: [string, FormDataEntryValue][] = Array.from(
      { length: 9 }, (_, index) => [`file:${index}`, image(50 * MB)],
    );
    entries.push(["videoFile", image(48 * MB, "video/mp4")]);
    expect(getUploadFormError(formData(entries))).toBeUndefined();
    entries.push(["payload", "x".repeat(MB)]);
    expect(getUploadFormError(formData(entries))).toBe(UPLOAD_REQUEST_SIZE_ERROR);
  });

  it("does not call the server action when an image is too large", async () => {
    const action = jest.fn();
    const result = await submitUpload(formData([["file:1", image(51 * MB)]]), action);
    expect(result).toEqual({ success: false, message: "Mỗi ảnh không được vượt quá 50 MB." });
    expect(action).not.toHaveBeenCalled();
  });

  it("does not call the server action when the combined request is too large", async () => {
    const action = jest.fn();
    const entries: [string, FormDataEntryValue][] = Array.from(
      { length: 11 }, (_, index) => [`file:${index}`, image(50 * MB)],
    );
    expect(await submitUpload(formData(entries), action)).toEqual({
      success: false, message: UPLOAD_REQUEST_SIZE_ERROR,
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("returns action results, including field errors, unchanged", async () => {
    const body = new FormData();
    body.set("payload", "{}");
    const result = { success: false, message: "Kiểm tra lại thông tin.", fieldErrors: { name: ["Bắt buộc"] } };
    const action = jest.fn().mockResolvedValue(result);
    expect(await submitUpload(body, action)).toBe(result);
    expect(action).toHaveBeenCalledWith(body);
  });

  it.each([new Error("Body exceeded 500mb limit"), new TypeError("Failed to fetch")])(
    "turns request failures into a simple error without throwing",
    async (error) => {
      const action = jest.fn().mockRejectedValue(error);
      await expect(submitUpload(new FormData(), action)).resolves.toEqual({
        success: false, message: UPLOAD_FAILED_ERROR,
      });
    },
  );
});
