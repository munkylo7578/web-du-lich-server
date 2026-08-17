import "server-only";

import { db, siteSettings } from "@database";
import { asc, eq } from "drizzle-orm";

import { Setting, type SettingRepository } from "@/domains/setting/domain";
import type { AdminSetting } from "./settings-types";

export async function listAdminSettings(): Promise<AdminSetting[]> {
  const rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.key));
  return rows.map(toAdminSetting);
}

function toAdminSetting(row: typeof siteSettings.$inferSelect): AdminSetting {
  return {
    key: row.key,
    description: row.description ?? undefined,
    value: row.value,
    type: row.type,
    canDelete: row.canDelete,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDomain(row: typeof siteSettings.$inferSelect): Setting {
  return Setting.rehydrate({
    key: row.key,
    description: row.description ?? undefined,
    value: row.value,
    type: row.type,
    canDelete: row.canDelete,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleSettingRepository implements SettingRepository {
  async list(): Promise<Setting[]> {
    const rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.key));
    return rows.map(toDomain);
  }

  async findByKey(key: string): Promise<Setting | null> {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async save(setting: Setting): Promise<void> {
    const snapshot = setting.toSnapshot();
    const existing = await db
      .select({ key: siteSettings.key })
      .from(siteSettings)
      .where(eq(siteSettings.key, snapshot.key))
      .limit(1);

    if (existing.length) {
      await db
        .update(siteSettings)
        .set({
          description: snapshot.description ?? null,
          value: snapshot.value,
          type: snapshot.type,
          updatedAt: snapshot.updatedAt,
        })
        .where(eq(siteSettings.key, snapshot.key));
      return;
    }

    await db.insert(siteSettings).values({
      key: snapshot.key,
      description: snapshot.description ?? null,
      value: snapshot.value,
      type: snapshot.type,
      canDelete: snapshot.canDelete,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
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
