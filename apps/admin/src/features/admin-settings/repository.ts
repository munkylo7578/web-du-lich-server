import "server-only";

import { db, siteSettings, siteSettingTranslations } from "@database";
import { eq } from "drizzle-orm";
import { isSettingCategory, type SettingCategory } from "@setting-category";

import { Setting, type SettingLocale, type SettingRepository, type SettingSnapshot } from "@/domains/setting/domain";
import type { AdminSetting } from "./settings-types";
import { removeUnreferencedMediaFiles } from "@/features/shared/media-cleanup";

type SettingRow = typeof siteSettings.$inferSelect & {
  translations: Array<typeof siteSettingTranslations.$inferSelect>;
};

export async function listAdminSettings(category: SettingCategory): Promise<AdminSetting[]> {
  if (!isSettingCategory(category)) throw new Error("Nhóm setting không hợp lệ.");
  const rows = await db.query.siteSettings.findMany({
    where: (table, { eq: equals }) => equals(table.category, category),
    orderBy: (table, { asc: ascending }) => [ascending(table.key)],
    with: { translations: true },
  });
  return rows.map(toAdminSetting);
}

function toAdminSetting(row: SettingRow): AdminSetting {
  const snapshot = toSnapshot(row);
  return {
    ...snapshot,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

function toSnapshot(row: SettingRow): SettingSnapshot {
  const translations = Object.fromEntries(row.translations.map((translation) => [translation.locale, translation.value])) as Partial<Record<SettingLocale, string>>;
  return {
    key: row.key,
    category: row.category,
    description: row.description ?? undefined,
    value: row.value ?? undefined,
    translations: { vi: translations.vi ?? "", ...(translations.en ? { en: translations.en } : {}) },
    type: row.type,
    canDelete: row.canDelete,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDomain(row: SettingRow): Setting {
  return Setting.rehydrate(toSnapshot(row));
}

export class DrizzleSettingRepository implements SettingRepository {
  async list(category: SettingCategory): Promise<Setting[]> {
    if (!isSettingCategory(category)) throw new Error("Nhóm setting không hợp lệ.");
    const rows = await db.query.siteSettings.findMany({
      where: (table, { eq: equals }) => equals(table.category, category),
      orderBy: (table, { asc: ascending }) => [ascending(table.key)],
      with: { translations: true },
    });
    return rows.map(toDomain);
  }

  async findByKey(key: string): Promise<Setting | null> {
    const row = await db.query.siteSettings.findFirst({
      where: (table, { eq: equals }) => equals(table.key, key),
      with: { translations: true },
    });
    return row ? toDomain(row) : null;
  }

  async save(setting: Setting): Promise<void> {
    const snapshot = setting.toSnapshot();

    const removedMedia = await db.transaction(async (tx) => {
      const [previous] = await tx.select().from(siteSettings)
        .where(eq(siteSettings.key, snapshot.key)).for("update");
      await tx
        .insert(siteSettings)
        .values({
          key: snapshot.key,
          category: snapshot.category,
          description: snapshot.description ?? null,
          value: snapshot.value ?? null,
          type: snapshot.type,
          canDelete: snapshot.canDelete,
          createdAt: snapshot.createdAt,
          updatedAt: snapshot.updatedAt,
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: {
            description: snapshot.description ?? null,
            value: snapshot.value ?? null,
            type: snapshot.type,
            updatedAt: snapshot.updatedAt,
          },
        });

      await tx.delete(siteSettingTranslations).where(eq(siteSettingTranslations.settingKey, snapshot.key));
      if (snapshot.type === "text") {
        const rows = (["vi", "en"] as const)
          .filter((locale) => Boolean(snapshot.translations[locale]))
          .map((locale) => ({
            settingKey: snapshot.key,
            locale,
            value: snapshot.translations[locale] as string,
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.updatedAt,
          }));
        await tx.insert(siteSettingTranslations).values(rows);
      }
      return previous && (previous.type === "image" || previous.type === "video")
        && previous.value && previous.value !== snapshot.value ? [{ url: previous.value }] : [];
    });
    await removeUnreferencedMediaFiles(removedMedia);
  }

  async delete(key: string): Promise<void> {
    const removedMedia = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(siteSettings).where(eq(siteSettings.key, key)).for("update");
      if (!row) return [];
      const translations = await tx.select().from(siteSettingTranslations)
        .where(eq(siteSettingTranslations.settingKey, key));
      toDomain({ ...row, translations }).assertCanDelete();
      await tx.delete(siteSettings).where(eq(siteSettings.key, key));
      return (row.type === "image" || row.type === "video") && row.value ? [{ url: row.value }] : [];
    });
    await removeUnreferencedMediaFiles(removedMedia);
  }
}

export const settingRepository: SettingRepository = new DrizzleSettingRepository();
