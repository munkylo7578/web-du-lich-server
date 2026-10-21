import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isSettingCategory } from "@setting-category";

import { SettingsManagement } from "@/components/admin/settings/settings-management";
import { listAdminSettings } from "@/features/admin-settings/repository";
import { getMaxUploadVideoMb } from "@/features/admin-settings/upload-config";

export default async function AdminSettingsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isSettingCategory(category)) notFound();

  await connection();
  const settings = await listAdminSettings(category, { page: 1, pageSize: 10 });
  // Remount when switching sections so search, dialogs and draft files don't leak.
  return <SettingsManagement key={category} category={category} initialResult={settings} maxVideoMb={getMaxUploadVideoMb()} />;
}
