import { notFound } from "next/navigation";
import { isSettingCategory } from "@setting-category";

import { SettingsManagement } from "@/components/admin/settings/settings-management";
import { listAdminSettings } from "@/features/admin-settings/repository";

export default async function AdminSettingsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isSettingCategory(category)) notFound();

  const settings = await listAdminSettings(category);
  // Remount when switching sections so search, dialogs and draft files don't leak.
  return <SettingsManagement key={category} category={category} settings={settings} />;
}
