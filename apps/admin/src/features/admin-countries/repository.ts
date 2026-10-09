import "server-only";
import { countries, countryImages, countryTranslations, db, images } from "@database";
import { eq } from "drizzle-orm";
import { isDestinationCountry, type DestinationCountry } from "@destination-country";
import type { AdminCountry } from "./country-types";
import type { CountryEditorValues } from "./country-form-schema";
import { deleteUnreferencedImages, removeUnreferencedMediaFiles } from "@/features/shared/media-cleanup";

export async function listAdminCountries(): Promise<AdminCountry[]> {
  const rows = await db.query.countries.findMany({
    orderBy: (table, { asc }) => [asc(table.code)],
    with: { translations: true, imageLinks: { orderBy: (link, { asc }) => [asc(link.sortOrder)], with: { image: true } } },
  });
  return rows.map((row) => ({
    code: row.code, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    translations: row.translations.map((item) => ({ locale: item.locale, name: item.name,
      description: item.description ?? undefined, visa: item.visa ?? undefined, weather: item.weather ?? undefined })),
    images: row.imageLinks.map((link) => ({ imageId: link.imageId, url: link.image.url,
      altText: link.image.altText ?? undefined, role: link.role, sortOrder: link.sortOrder })),
  }));
}

export async function findAdminCountry(code: DestinationCountry) {
  return (await listAdminCountries()).find((country) => country.code === code) ?? null;
}

export type CountryMediaSave = {
  refs: CountryEditorValues["existingImages"];
  newImages: (typeof images.$inferInsert)[];
};

// Update only: a missing seed must never become an implicit create operation.
export async function updateCountryRecord(data: CountryEditorValues, media: CountryMediaSave): Promise<void> {
  if (!isDestinationCountry(data.code)) throw new Error("Mã quốc gia không hợp lệ.");
  const removed = await db.transaction(async (tx) => {
    const [stored] = await tx.select().from(countries).where(eq(countries.code, data.code)).for("update");
    if (!stored) throw new Error("Không tìm thấy quốc gia. Vui lòng chạy migration.");
    const oldLinks = await tx.select().from(countryImages).where(eq(countryImages.countryCode, data.code));
    const allowed = new Set([...oldLinks.map((link) => link.imageId), ...media.newImages.map((image) => image.id)]);
    if (media.refs.some((image) => !allowed.has(image.imageId))) throw new Error("Ảnh không thuộc quốc gia đang chỉnh sửa.");
    if (new Set(media.refs.map((image) => image.imageId)).size !== media.refs.length) throw new Error("Mã ảnh bị trùng lặp.");
    if (media.refs.filter((image) => image.role === "cover").length > 1) throw new Error("Chỉ được chọn một ảnh bìa.");
    await tx.update(countries).set({ updatedAt: new Date() }).where(eq(countries.code, data.code));
    await tx.delete(countryTranslations).where(eq(countryTranslations.countryCode, data.code));
    await tx.insert(countryTranslations).values((["en", "vi"] as const).filter((locale) => data.translations[locale].name).map((locale) => ({
      countryCode: data.code, locale, name: data.translations[locale].name,
      description: data.translations[locale].description || null,
      visa: data.translations[locale].visa || null, weather: data.translations[locale].weather || null,
    })));
    if (media.newImages.length) await tx.insert(images).values(media.newImages);
    await tx.delete(countryImages).where(eq(countryImages.countryCode, data.code));
    for (const ref of media.refs) {
      await tx.update(images).set({ altText: ref.altText || null, updatedAt: new Date() }).where(eq(images.id, ref.imageId));
    }
    const hasCover = media.refs.some((image) => image.role === "cover");
    if (media.refs.length) await tx.insert(countryImages).values(media.refs.map((ref, index) => ({
      countryCode: data.code, imageId: ref.imageId, sortOrder: index,
      role: !hasCover && index === 0 ? "cover" as const : ref.role,
    })));
    return deleteUnreferencedImages(tx, oldLinks.map((link) => link.imageId));
  });
  await removeUnreferencedMediaFiles(removed);
}
