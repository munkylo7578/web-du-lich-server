import { DestinationManagement } from "@/components/admin/destinations/destination-management";
import { listAdminDestinations } from "@/features/admin-tours/repository";

export default async function AdminDestinationsPage() {
  const destinations = await listAdminDestinations();

  return <DestinationManagement destinations={destinations} />;
}
