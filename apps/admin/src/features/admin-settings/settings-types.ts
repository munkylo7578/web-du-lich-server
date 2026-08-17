import type { SettingSnapshot } from "@/domains/setting/domain";

export type AdminSetting = Omit<SettingSnapshot, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
