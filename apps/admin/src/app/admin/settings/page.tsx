import { SettingsManagement } from "@/components/admin/settings/settings-management";
import { listAdminSettings } from "@/features/admin-settings/repository";

export default async function AdminSettingsPage() {
  const settings = await listAdminSettings();

  return <SettingsManagement settings={settings} />;
}
