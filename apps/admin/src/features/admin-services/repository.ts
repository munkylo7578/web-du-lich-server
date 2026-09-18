import 'server-only';

import {
  db,
  images,
  serviceImages,
  services,
  serviceTranslations,
  tourServices,
} from '@database';
import { and, asc, countDistinct, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { isServiceCategory } from '@service-category';

import {
  Service,
  type ServiceRepository,
  type ServiceSaveImage,
} from '@/domains/service/domain';
import type { AdminService, AdminServiceListQuery } from './service-types';
import { deleteUnreferencedImages, removeUnreferencedMediaFiles } from '@/features/shared/media-cleanup';
import {
  createAdminListResult,
  normalizeAdminListQuery,
  resolveAdminListPage,
  type AdminListResult,
} from '@/features/shared/admin-list';

const SERVICE_SEARCH_LIMIT = 20;

export async function listAdminServices(input: AdminServiceListQuery = {}): Promise<AdminListResult<AdminService>> {
  if (input.category !== undefined && !isServiceCategory(input.category)) {
    throw new Error('Phân loại dịch vụ không hợp lệ.');
  }
  const normalized = normalizeAdminListQuery(input);
  const pattern = `%${normalized.query}%`;
  const searchCondition = normalized.query
    ? or(
        ilike(serviceTranslations.name, pattern),
        ilike(serviceTranslations.description, pattern),
      )
    : undefined;
  const categoryCondition = input.category
    ? eq(services.category, input.category)
    : undefined;
  const filterCondition = and(searchCondition, categoryCondition);
  const [{ total }] = await db
    .select({ total: countDistinct(services.id) })
    .from(services)
    .leftJoin(serviceTranslations, eq(serviceTranslations.serviceId, services.id))
    .where(filterCondition);
  const resolved = resolveAdminListPage(Number(total), normalized);
  const rows = await db
    .select({ id: services.id })
    .from(services)
    .leftJoin(serviceTranslations, eq(serviceTranslations.serviceId, services.id))
    .where(filterCondition)
    .groupBy(services.id, services.updatedAt)
    .orderBy(desc(services.updatedAt), asc(services.id))
    .limit(resolved.pageSize)
    .offset(resolved.offset);
  return createAdminListResult(
    await hydrateServices(rows.map((row) => row.id)),
    Number(total),
    resolved,
  );
}

export async function searchServices(query: string): Promise<AdminService[]> {
  const term = query.trim();
  if (!term) return [];
  const pattern = `%${term}%`;
  const rows = await db
    .select({ id: serviceTranslations.serviceId })
    .from(serviceTranslations)
    .where(
      or(
        ilike(serviceTranslations.name, pattern),
        ilike(serviceTranslations.description, pattern),
      ),
    )
    .orderBy(asc(serviceTranslations.name))
    .limit(SERVICE_SEARCH_LIMIT);
  return hydrateServices([...new Set(rows.map((row) => row.id))]);
}

export async function hydrateServices(ids: string[]): Promise<AdminService[]> {
  if (!ids.length) return [];
  const serviceRows = await db
    .select()
    .from(services)
    .where(inArray(services.id, ids));
  const translationRows = await db
    .select()
    .from(serviceTranslations)
    .where(inArray(serviceTranslations.serviceId, ids));
  const imageRows = await db
    .select({
      serviceId: serviceImages.serviceId,
      imageId: serviceImages.imageId,
      sortOrder: serviceImages.sortOrder,
      url: images.url,
      altText: images.altText,
    })
    .from(serviceImages)
    .innerJoin(images, eq(serviceImages.imageId, images.id))
    .where(inArray(serviceImages.serviceId, ids))
    .orderBy(asc(serviceImages.sortOrder));
  const tourRows = await db
    .select({ serviceId: tourServices.serviceId })
    .from(tourServices)
    .where(inArray(tourServices.serviceId, ids));
  const meta = new Map(serviceRows.map((row) => [row.id, row]));

  return ids.flatMap((id) => {
    const row = meta.get(id);
    if (!row) return [];
    return [
      {
        serviceId: id,
        category: row.category,
        translations: translationRows
          .filter((item) => item.serviceId === id)
          .map((item) => ({
            locale: item.locale,
            name: item.name,
            description: item.description ?? undefined,
          })),
        images: imageRows
          .filter((item) => item.serviceId === id)
          .map((item) => ({
            imageId: item.imageId,
            url: item.url,
            altText: item.altText ?? undefined,
            sortOrder: item.sortOrder,
          })),
        sortOrder: 0,
        tourCount: tourRows.filter((item) => item.serviceId === id).length,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    ];
  });
}

class DrizzleServiceRepository implements ServiceRepository {
  async findById(id: string): Promise<Service | null> {
    const rows = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);
    if (!rows[0]) return null;
    const translations = await db
      .select()
      .from(serviceTranslations)
      .where(eq(serviceTranslations.serviceId, id));
    const imageLinks = await db
      .select()
      .from(serviceImages)
      .where(eq(serviceImages.serviceId, id));
    return Service.rehydrate({
      id,
      category: rows[0].category,
      translations: translations.map((item) => ({
        locale: item.locale,
        name: item.name,
        description: item.description ?? undefined,
      })),
      images: imageLinks.map((item) => ({
        imageId: item.imageId,
        sortOrder: item.sortOrder,
      })),
      createdAt: rows[0].createdAt,
      updatedAt: rows[0].updatedAt,
    });
  }

  async save(
    service: Service,
    newImages: ServiceSaveImage[] = [],
  ): Promise<void> {
    const snapshot = service.toSnapshot();
    const removedImages = await db.transaction(async (tx) => {
      const existing = await tx.select({ id: services.id }).from(services)
        .where(eq(services.id, snapshot.id)).for('update');
      if (existing.length)
        await tx
          .update(services)
          .set({ category: snapshot.category, updatedAt: snapshot.updatedAt })
          .where(eq(services.id, snapshot.id));
      else
        await tx
          .insert(services)
          .values({
            id: snapshot.id,
            category: snapshot.category,
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.updatedAt,
          });

      await tx
        .delete(serviceTranslations)
        .where(eq(serviceTranslations.serviceId, snapshot.id));
      await tx.insert(serviceTranslations).values(
        snapshot.translations.map((item) => ({
          serviceId: snapshot.id,
          locale: item.locale,
          name: item.name,
          description: item.description ?? null,
          createdAt: snapshot.createdAt,
          updatedAt: snapshot.updatedAt,
        })),
      );

      const oldLinks = await tx
        .select({ imageId: serviceImages.imageId })
        .from(serviceImages)
        .where(eq(serviceImages.serviceId, snapshot.id));
      const nextIds = new Set(snapshot.images.map((item) => item.imageId));
      const removedIds = oldLinks
        .map((item) => item.imageId)
        .filter((id) => !nextIds.has(id));
      await tx
        .delete(serviceImages)
        .where(eq(serviceImages.serviceId, snapshot.id));
      if (newImages.length)
        await tx.insert(images).values(
          newImages.map(({ image }) => {
            const item = image.toSnapshot();
            return {
              id: item.id,
              url: item.url,
              altText: item.altText ?? null,
              fileName: item.fileName ?? null,
              mimeType: item.mimeType ?? null,
              sizeInBytes: item.sizeInBytes ?? null,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          }),
        );
      if (snapshot.images.length)
        await tx
          .insert(serviceImages)
          .values(
            snapshot.images.map((item) => ({
              serviceId: snapshot.id,
              imageId: item.imageId,
              sortOrder: item.sortOrder,
            })),
          );
      return deleteUnreferencedImages(tx, removedIds);
    });
    await removeUnreferencedMediaFiles(removedImages);
  }

  async delete(id: string): Promise<void> {
    const removedImages = await db.transaction(async (tx) => {
      await tx.select({ id: services.id }).from(services).where(eq(services.id, id)).for('update');
      const links = await tx
        .select({ tourId: tourServices.tourId })
        .from(tourServices)
        .where(eq(tourServices.serviceId, id))
        .limit(1);
      if (links.length)
        throw new Error(
          'Dịch vụ đang được gắn với tour. Vui lòng gỡ khỏi tour trước khi xóa.',
        );
      const imageLinks = await tx
        .select({ imageId: serviceImages.imageId })
        .from(serviceImages)
        .where(eq(serviceImages.serviceId, id));
      await tx.delete(services).where(eq(services.id, id));
      return deleteUnreferencedImages(tx, imageLinks.map((item) => item.imageId));
    });
    await removeUnreferencedMediaFiles(removedImages);
  }
}

export const serviceRepository: ServiceRepository =
  new DrizzleServiceRepository();
