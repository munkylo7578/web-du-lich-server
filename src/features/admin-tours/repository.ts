import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { images, tourImages, tours, tourTranslations } from "@/db/schema";
import type { TourRepository, TourSaveImage } from "@/domains/tour/domain";
import { TourMapper } from "./tour-mapper";
import type { AdminTour } from "./tour-types";

export async function listAdminTours(): Promise<AdminTour[]> {
  const rows = await db.select().from(tours).orderBy(desc(tours.updatedAt));
  return hydrateAdminTours(rows);
}

export async function findAdminTour(id: string): Promise<AdminTour | null> {
  const rows = await db.select().from(tours).where(eq(tours.id, id)).limit(1);
  const hydrated = await hydrateAdminTours(rows);
  return hydrated[0] ?? null;
}

async function hydrateAdminTours(rows: (typeof tours.$inferSelect)[]): Promise<AdminTour[]> {
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const translationRows = await db
    .select()
    .from(tourTranslations)
    .where(inArray(tourTranslations.tourId, ids));
  const imageRows = await db
    .select({
      tourId: tourImages.tourId,
      imageId: tourImages.imageId,
      role: tourImages.role,
      sortOrder: tourImages.sortOrder,
      url: images.url,
      altText: images.altText,
    })
    .from(tourImages)
    .innerJoin(images, eq(tourImages.imageId, images.id))
    .where(inArray(tourImages.tourId, ids))
    .orderBy(asc(tourImages.sortOrder));

  return rows.map((row) => ({
    id: row.id,
    translations: translationRows
      .filter((translation) => translation.tourId === row.id)
      .map((translation) => ({
        locale: translation.locale,
        name: translation.name,
        description: translation.description ?? undefined,
      })),
    latitude: row.latitude,
    longitude: row.longitude,
    plans: row.plans,
    images: imageRows
      .filter((image) => image.tourId === row.id)
      .map((image) => ({
        imageId: image.imageId,
        url: image.url,
        altText: image.altText ?? undefined,
        role: image.role,
        sortOrder: image.sortOrder,
      })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function deleteTourRecord(id: string) {
  const linkedImages = await db
    .select({ imageId: tourImages.imageId })
    .from(tourImages)
    .where(eq(tourImages.tourId, id));

  await db.transaction(async (tx) => {
    await tx.delete(tours).where(eq(tours.id, id));
    if (linkedImages.length) {
      await tx.delete(images).where(inArray(images.id, linkedImages.map((item) => item.imageId)));
    }
  });
}

export class DrizzleTourRepository implements TourRepository {
  async findById(id: string) {
    const row = await db.select().from(tours).where(eq(tours.id, id)).limit(1);
    if (!row[0]) return null;

    const translations = await db
      .select()
      .from(tourTranslations)
      .where(eq(tourTranslations.tourId, id));
    const links = await db
      .select()
      .from(tourImages)
      .where(eq(tourImages.tourId, id));

    return TourMapper.toDomain({
      id: row[0].id,
      translations: translations.map((translation) => ({
        locale: translation.locale,
        name: translation.name,
        description: translation.description ?? undefined,
      })),
      location:
        row[0].latitude !== null && row[0].longitude !== null
          ? { lat: row[0].latitude, lng: row[0].longitude }
          : undefined,
      plans: row[0].plans,
      images: links.map((link) => ({
        imageId: link.imageId,
        role: link.role,
        sortOrder: link.sortOrder,
      })),
      createdAt: row[0].createdAt,
      updatedAt: row[0].updatedAt,
    });
  }

  async save(tour: import("@/domains/tour/domain").Tour, newImages: TourSaveImage[] = []) {
    const snapshot = TourMapper.toPersistence(tour);
    const existing = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, snapshot.id)).limit(1);

    await db.transaction(async (tx) => {
      if (existing.length) {
        await tx.update(tours).set({
          latitude: snapshot.location?.lat ?? null,
          longitude: snapshot.location?.lng ?? null,
          plans: snapshot.plans,
          updatedAt: snapshot.updatedAt,
        }).where(eq(tours.id, snapshot.id));
      } else {
        await tx.insert(tours).values({
          id: snapshot.id,
          latitude: snapshot.location?.lat ?? null,
          longitude: snapshot.location?.lng ?? null,
          plans: snapshot.plans,
          createdAt: snapshot.createdAt,
          updatedAt: snapshot.updatedAt,
        });
      }

      await tx.delete(tourTranslations).where(eq(tourTranslations.tourId, snapshot.id));
      await tx.insert(tourTranslations).values(snapshot.translations.map((translation) => ({
        tourId: snapshot.id,
        locale: translation.locale,
        name: translation.name,
        description: translation.description ?? null,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      })));

      const oldLinks = await tx.select({ imageId: tourImages.imageId }).from(tourImages).where(eq(tourImages.tourId, snapshot.id));
      const nextIds = new Set(snapshot.images.map((image) => image.imageId));
      const removedIds = oldLinks.map((link) => link.imageId).filter((id) => !nextIds.has(id));
      await tx.delete(tourImages).where(eq(tourImages.tourId, snapshot.id));
      if (removedIds.length) await tx.delete(images).where(inArray(images.id, removedIds));

      if (newImages.length) {
        await tx.insert(images).values(newImages.map(({ image }) => {
          const value = image.toSnapshot();
          return {
            id: value.id,
            url: value.url,
            altText: value.altText ?? null,
            fileName: value.fileName ?? null,
            mimeType: value.mimeType ?? null,
            sizeInBytes: value.sizeInBytes ?? null,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt,
          };
        }));
      }

      if (snapshot.images.length) {
        await tx.insert(tourImages).values(snapshot.images.map((image) => ({
          tourId: snapshot.id,
          imageId: image.imageId,
          role: image.role,
          sortOrder: image.sortOrder,
        })));
      }
    });
  }

  async delete(id: string) {
    await deleteTourRecord(id);
  }
}

export const tourRepository: TourRepository = new DrizzleTourRepository();
