jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ requireSession: jest.fn() }));
jest.mock("@/features/admin-countries/repository", () => ({ findAdminCountry: jest.fn(), updateCountryRecord: jest.fn() }));
jest.mock("@/features/shared/image-upload", () => ({ saveImageFile: jest.fn(), removeUploadedFiles: jest.fn() }));

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { findAdminCountry, updateCountryRecord } from "@/features/admin-countries/repository";
import { saveImageFile, removeUploadedFiles } from "@/features/shared/image-upload";
import { updateAdminCountryAction } from "./actions";

const existing = { imageId: "11111111-1111-4111-8111-111111111111", url: "/uploads/countries/old.webp", altText: "", role: "cover" as const, sortOrder: 0 };
const pending = { clientId: "22222222-2222-4222-8222-222222222222", altText: "", role: "gallery" as const, sortOrder: 1 };
const payload = () => ({ code: "VN", translations: { en: { name: "Vietnam" }, vi: { name: "" } }, existingImages: [existing] });

function body(data: unknown = payload(), newImages: unknown = []): FormData {
  const form = new FormData();
  form.set("payload", JSON.stringify(data));
  form.set("pendingImages", JSON.stringify(newImages));
  return form;
}

describe("updateAdminCountryAction", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(findAdminCountry).mockResolvedValue({
      code: "VN", translations: [{ locale: "en", name: "Vietnam" }], images: [existing],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    });
    jest.mocked(saveImageFile).mockResolvedValue({
      physicalPath: "uploads/countries/new.webp", url: "/uploads/countries/new.webp",
      fileName: "new.webp", mimeType: "image/webp", sizeInBytes: 5,
    });
  });

  it("authenticates, preserves existing images and refreshes the country route", async () => {
    expect((await updateAdminCountryAction(body())).success).toBe(true);
    expect(requireSession).toHaveBeenCalledTimes(1);
    expect(updateCountryRecord).toHaveBeenCalledWith(expect.objectContaining({ code: "VN" }), { refs: [existing], newImages: [] });
    expect(saveImageFile).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/countries");
  });

  it("does not read or write data if authentication fails", async () => {
    jest.mocked(requireSession).mockRejectedValue(new Error("Unauthorized"));
    await expect(updateAdminCountryAction(body())).rejects.toThrow("Unauthorized");
    expect(findAdminCountry).not.toHaveBeenCalled();
    expect(updateCountryRecord).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and returns translation field errors", async () => {
    const invalid = body();
    invalid.set("payload", "{");
    expect((await updateAdminCountryAction(invalid)).success).toBe(false);
    const data = payload();
    data.translations.en.name = "";
    expect((await updateAdminCountryAction(body(data))).fieldErrors?.["translations.en.name"]).toEqual(["Tên tiếng Anh cần ít nhất 2 ký tự."]);
    expect(updateCountryRecord).not.toHaveBeenCalled();
  });

  it("does not implicitly create missing seeded countries", async () => {
    jest.mocked(findAdminCountry).mockResolvedValue(null);
    expect(await updateAdminCountryAction(body())).toEqual({ success: false, message: "Không tìm thấy quốc gia. Vui lòng chạy migration." });
    expect(updateCountryRecord).not.toHaveBeenCalled();
  });

  it("rejects images belonging to another country", async () => {
    const data = payload();
    data.existingImages[0] = { ...existing, imageId: pending.clientId };
    expect((await updateAdminCountryAction(body(data))).success).toBe(false);
    expect(updateCountryRecord).not.toHaveBeenCalled();
  });

  it("rejects combined existing and pending cover conflicts before upload", async () => {
    expect((await updateAdminCountryAction(body(payload(), [{ ...pending, role: "cover" }]))).success).toBe(false);
    expect(saveImageFile).not.toHaveBeenCalled();
    expect(updateCountryRecord).not.toHaveBeenCalled();
  });

  it.each(["missing", "empty", "unsupported", "oversized"])("rejects %s files before upload", async (kind) => {
    const form = body(payload(), [pending]);
    if (kind !== "missing") {
      const file = new File([kind === "empty" ? "" : "image"], "test.webp", { type: kind === "unsupported" ? "text/plain" : "image/webp" });
      // Use a lightweight FormData mock for the oversized case to avoid allocating 51 MB.
      if (kind === "oversized") {
        Object.defineProperty(file, "size", { value: 51 * 1024 * 1024 });
        const get = form.get.bind(form);
        jest.spyOn(form, "get").mockImplementation((key) => key === `file:${pending.clientId}` ? file : get(key));
      } else form.set(`file:${pending.clientId}`, file);
    }
    expect((await updateAdminCountryAction(form)).success).toBe(false);
    expect(saveImageFile).not.toHaveBeenCalled();
    expect(updateCountryRecord).not.toHaveBeenCalled();
  });

  it("uploads new images only on save and passes their references to persistence", async () => {
    const form = body(payload(), [pending]);
    form.set(`file:${pending.clientId}`, new File(["image"], "test.webp", { type: "image/webp" }));
    expect((await updateAdminCountryAction(form)).success).toBe(true);
    expect(saveImageFile).toHaveBeenCalledWith(expect.any(File), { subdirectory: "countries", logScope: "CountryUpload" });
    expect(updateCountryRecord).toHaveBeenCalledWith(expect.anything(), {
      refs: [existing, expect.objectContaining({ url: "/uploads/countries/new.webp", role: "gallery", sortOrder: 1 })],
      newImages: [expect.objectContaining({ url: "/uploads/countries/new.webp" })],
    });
  });

  it("removes uploaded files when saving fails", async () => {
    jest.mocked(updateCountryRecord).mockRejectedValue(new Error("Database failure"));
    const form = body(payload(), [pending]);
    form.set(`file:${pending.clientId}`, new File(["image"], "test.webp", { type: "image/webp" }));
    expect((await updateAdminCountryAction(form)).success).toBe(false);
    expect(removeUploadedFiles).toHaveBeenCalledWith(["uploads/countries/new.webp"], "CountryUpload");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not remove committed uploads when revalidation fails", async () => {
    jest.mocked(revalidatePath).mockImplementation(() => { throw new Error("Revalidation failed"); });
    expect((await updateAdminCountryAction(body())).success).toBe(true);
    expect(removeUploadedFiles).not.toHaveBeenCalled();
  });
});
