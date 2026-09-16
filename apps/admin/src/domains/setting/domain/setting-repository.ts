import type { Setting } from "./setting";
import type { SettingCategory } from "@setting-category";

export interface SettingRepository {
  list(category: SettingCategory): Promise<Setting[]>;
  findByKey(key: string): Promise<Setting | null>;
  save(setting: Setting): Promise<void>;
  delete(key: string): Promise<void>;
}
