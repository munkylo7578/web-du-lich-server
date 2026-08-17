import type { Setting } from "./setting";

export interface SettingRepository {
  list(): Promise<Setting[]>;
  findByKey(key: string): Promise<Setting | null>;
  save(setting: Setting): Promise<void>;
  delete(key: string): Promise<void>;
}
