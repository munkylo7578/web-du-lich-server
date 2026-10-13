import { countryEditorSchema, type CountryFormValues } from "./country-form-schema";

function values(): CountryFormValues {
  return { code: "VN", translations: { en: { name: "Vietnam" }, vi: { name: "" } }, existingImages: [] };
}

describe("countryEditorSchema", () => {
  it.each(["LA", "CB", "VN"])("accepts seeded code %s and an English-only translation", (code) => {
    expect(countryEditorSchema.safeParse({ ...values(), code }).success).toBe(true);
  });

  it.each(["KH", "US", "", "vn"])("rejects unsupported code %s", (code) => {
    expect(countryEditorSchema.safeParse({ ...values(), code }).success).toBe(false);
  });

  it.each(["", " ", "V", "a".repeat(256)])("rejects invalid English names", (name) => {
    const input = values();
    input.translations.en.name = name;
    const result = countryEditorSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["translations", "en", "name"]);
  });

  it("trims names and normalizes visually empty optional rich text", () => {
    const input = values();
    input.translations.en.name = " Vietnam ";
    input.translations.vi = { name: " ", description: "<p><br></p>", visa: "<p>&nbsp;</p>", weather: "<p>\u200B</p>" };
    expect(countryEditorSchema.parse(input).translations).toEqual({
      en: { name: "Vietnam", description: "", visa: "", weather: "" },
      vi: { name: "", description: "", visa: "", weather: "" },
    });
  });

  it.each(["description", "visa", "weather"] as const)("requires a Vietnamese name when %s has content", (field) => {
    const input = values();
    input.translations.vi[field] = "<p>Nội dung</p>";
    const result = countryEditorSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["translations", "vi", "name"]);
    input.translations.vi.name = "Việt Nam";
    expect(countryEditorSchema.parse(input).translations.vi[field]).toBe("<p>Nội dung</p>");
  });

  it("rejects duplicate image IDs and multiple covers", () => {
    const image = { imageId: "11111111-1111-4111-8111-111111111111", url: "/uploads/countries/a.webp", role: "cover" as const, sortOrder: 0 };
    expect(countryEditorSchema.safeParse({ ...values(), existingImages: [image, { ...image, role: "gallery", sortOrder: 1 }] }).success).toBe(false);
    expect(countryEditorSchema.safeParse({ ...values(), existingImages: [image, { ...image, imageId: "22222222-2222-4222-8222-222222222222", sortOrder: 1 }] }).success).toBe(false);
    expect(countryEditorSchema.parse({ ...values(), existingImages: [image] }).existingImages[0].altText).toBe("");
  });
});
