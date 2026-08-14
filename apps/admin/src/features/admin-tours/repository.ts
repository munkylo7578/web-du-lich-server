import "server-only";

import {
  db,
  destinationTranslations,
  destinationWards,
  destinations,
  images,
  provinces,
  tourDestinations,
  tourImages,
  tours,
  tourTranslations,
  wards,
} from "@database";
import { asc, desc, eq, ilike, inArray, or } from "drizzle-orm";

import type { TourRepository, TourSaveDestination, TourSaveImage } from "@/domains/tour/domain";
import { TourMapper } from "./tour-mapper";
import type { AdminDestination, AdminTour, AdminWard } from "./tour-types";

const WARD_SEARCH_LIMIT = 20;
const DESTINATION_SEARCH_LIMIT = 20;

export async function listAdminTours(): Promise<AdminTour[]> {
  const rows = await db.select().from(tours).orderBy(desc(tours.updatedAt));
  return hydrateAdminTours(rows);
}

export async function listAdminDestinations(): Promise<AdminDestination[]> {
  const rows = await db
    .select({ id: destinations.id })
    .from(destinations)
    .orderBy(desc(destinations.updatedAt));

  return hydrateDestinations(rows.map((row) => row.id));
}

export async function searchWards(query: string): Promise<AdminWard[]> {
  const term = query.trim();

  if (!term) {
    return [];
  }

  const pattern = `%${term}%`;
  const rows = await db
    .select({
      code: wards.code,
      name: wards.name,
      fullName: wards.fullName,
      provinceCode: provinces.code,
      provinceName: provinces.name,
    })
    .from(wards)
    .leftJoin(provinces, eq(wards.provinceCode, provinces.code))
    .where(or(ilike(wards.name, pattern), ilike(wards.fullName, pattern), ilike(provinces.name, pattern)))
    .orderBy(asc(provinces.name), asc(wards.name))
    .limit(WARD_SEARCH_LIMIT);

  return rows.map(toAdminWard);
}

export async function searchDestinations(query: string): Promise<AdminDestination[]> {
  const term = query.trim();

  if (!term) {
    return [];
  }

  const pattern = `%${term}%`;
  const rows = await db
    .select({ id: destinationTranslations.destinationId })
    .from(destinationTranslations)
    .where(
      or(
        ilike(destinationTranslations.name, pattern),
        ilike(destinationTranslations.description, pattern),
      ),
    )
    .orderBy(asc(destinationTranslations.name))
    .limit(DESTINATION_SEARCH_LIMIT);
  const ids = [...new Set(rows.map((row) => row.id))];

  return hydrateDestinations(ids);
}

export async function saveDestinationRecord(destination: TourSaveDestination): Promise<AdminDestination> {
  const now = new Date();

  await db.transaction(async (tx) => {
    const existingDestination = await tx
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.id, destination.destinationId))
      .limit(1);

    if (existingDestination.length) {
      await tx.update(destinations).set({ updatedAt: now }).where(eq(destinations.id, destination.destinationId));
    } else {
      await tx.insert(destinations).values({
        id: destination.destinationId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.delete(destinationTranslations).where(eq(destinationTranslations.destinationId, destination.destinationId));
    await tx.insert(destinationTranslations).values(destination.translations.map((translation) => ({
      destinationId: destination.destinationId,
      locale: translation.locale,
      name: translation.name,
      description: normalizeOptionalText(translation.description),
      createdAt: now,
      updatedAt: now,
    })));

    await tx.delete(destinationWards).where(eq(destinationWards.destinationId, destination.destinationId));
    if (destination.wardCodes.length) {
      await tx.insert(destinationWards).values(destination.wardCodes.map((wardCode) => ({
        destinationId: destination.destinationId,
        wardCode,
      })));
    }
  });

  const [savedDestination] = await hydrateDestinations([destination.destinationId]);

  if (!savedDestination) {
    throw new Error("Could not reload saved destination.");
  }

  return savedDestination;
}

export async function deleteDestinationRecord(id: string): Promise<void> {
  const links = await db
    .select({ tourId: tourDestinations.tourId })
    .from(tourDestinations)
    .where(eq(tourDestinations.destinationId, id))
    .limit(1);

  if (links.length) {
    throw new Error("Điểm đến đang được gắn với tour. Vui lòng gỡ khỏi tour trước khi xóa.");
  }

  await db.delete(destinations).where(eq(destinations.id, id));
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
  const destinationLinkRows = await db
    .select()
    .from(tourDestinations)
    .where(inArray(tourDestinations.tourId, ids))
    .orderBy(asc(tourDestinations.sortOrder));
  const hydratedDestinations = await hydrateDestinations(
    [...new Set(destinationLinkRows.map((link) => link.destinationId))],
  );
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
    destinations: destinationLinkRows
      .filter((link) => link.tourId === row.id)
      .map((link) => {
        const destination = hydratedDestinations.find(
          (item) => item.destinationId === link.destinationId,
        );

        return destination ? { ...destination, sortOrder: link.sortOrder } : null;
      })
      .filter((destination): destination is AdminDestination => Boolean(destination)),
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

async function hydrateDestinations(ids: string[]): Promise<AdminDestination[]> {
  if (!ids.length) return [];

  const destinationRows = await db
    .select({
      id: destinations.id,
      createdAt: destinations.createdAt,
      updatedAt: destinations.updatedAt,
    })
    .from(destinations)
    .where(inArray(destinations.id, ids));
  const translationRows = await db
    .select()
    .from(destinationTranslations)
    .where(inArray(destinationTranslations.destinationId, ids));
  const wardRows = await db
    .select({
      destinationId: destinationWards.destinationId,
      code: wards.code,
      name: wards.name,
      fullName: wards.fullName,
      provinceCode: provinces.code,
      provinceName: provinces.name,
    })
    .from(destinationWards)
    .innerJoin(wards, eq(destinationWards.wardCode, wards.code))
    .leftJoin(provinces, eq(wards.provinceCode, provinces.code))
    .where(inArray(destinationWards.destinationId, ids))
    .orderBy(asc(provinces.name), asc(wards.name));
  const tourLinkRows = await db
    .select({ destinationId: tourDestinations.destinationId })
    .from(tourDestinations)
    .where(inArray(tourDestinations.destinationId, ids));
  const destinationMeta = new Map(destinationRows.map((destination) => [destination.id, destination]));
  const tourCountMap = new Map<string, number>();

  for (const link of tourLinkRows) {
    tourCountMap.set(link.destinationId, (tourCountMap.get(link.destinationId) ?? 0) + 1);
  }

  return ids.map((id) => {
    const meta = destinationMeta.get(id);

    return {
      destinationId: id,
      translations: translationRows
        .filter((translation) => translation.destinationId === id)
        .map((translation) => ({
          locale: translation.locale,
          name: translation.name,
          description: translation.description ?? undefined,
        })),
      wards: wardRows
        .filter((ward) => ward.destinationId === id)
        .map(toAdminWard),
      sortOrder: 0,
      tourCount: tourCountMap.get(id) ?? 0,
      createdAt: meta?.createdAt.toISOString(),
      updatedAt: meta?.updatedAt.toISOString(),
    };
  });
}

function toAdminWard(row: {
  code: string;
  name: string;
  fullName: string | null;
  provinceCode: string | null;
  provinceName: string | null;
}): AdminWard {
  return {
    code: row.code,
    name: row.name,
    fullName: row.fullName ?? undefined,
    provinceCode: row.provinceCode ?? undefined,
    provinceName: row.provinceName ?? undefined,
  };
}

function normalizeOptionalText(value?: string): string | null {
  const text = value?.trim();
  return text ? text : null;
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
    const destinationLinks = await db
      .select()
      .from(tourDestinations)
      .where(eq(tourDestinations.tourId, id));
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
      destinations: destinationLinks.map((link) => ({
        destinationId: link.destinationId,
        sortOrder: link.sortOrder,
      })),
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

  async save(
    tour: import("@/domains/tour/domain").Tour,
    newImages: TourSaveImage[] = [],
  ) {
    const snapshot = TourMapper.toPersistence(tour);
    const existing = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, snapshot.id)).limit(1);

    await db.transaction(async (tx) => {
      if (existing.length) {
        await tx.update(tours).set({
          plans: snapshot.plans,
          updatedAt: snapshot.updatedAt,
        }).where(eq(tours.id, snapshot.id));
      } else {
        await tx.insert(tours).values({
          id: snapshot.id,
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

      await tx.delete(tourDestinations).where(eq(tourDestinations.tourId, snapshot.id));
      if (snapshot.destinations.length) {
        await tx.insert(tourDestinations).values(snapshot.destinations.map((destination) => ({
          tourId: snapshot.id,
          destinationId: destination.destinationId,
          sortOrder: destination.sortOrder,
        })));
      }

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
