import "server-only";

import { db, siteSettings, siteSettingTranslations } from "@database";
import { eq } from "drizzle-orm";

import { Setting, type SettingLocale, type SettingRepository, type SettingSnapshot } from "@/domains/setting/domain";
import type { AdminSetting } from "./settings-types";

type SettingRow = typeof siteSettings.$inferSelect & {
  translations: Array<typeof siteSettingTranslations.$inferSelect>;
};

export async function listAdminSettings(): Promise<AdminSetting[]> {
  const rows = await db.query.siteSettings.findMany({
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
  async list(): Promise<Setting[]> {
    const rows = await db.query.siteSettings.findMany({
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

    await db.transaction(async (tx) => {
      await tx
        .insert(siteSettings)
        .values({
          key: snapshot.key,
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
    });
  }

  async delete(key: string): Promise<void> {
    const setting = await this.findByKey(key);
    if (!setting) return;
    setting.assertCanDelete();
    await db.delete(siteSettings).where(eq(siteSettings.key, key));
  }
}

export const settingRepository: SettingRepository = new DrizzleSettingRepository();
