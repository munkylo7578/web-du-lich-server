import { ServiceManagement } from "@/components/admin/services/service-management";
import { listAdminServices } from "@/features/admin-services/repository";

export default async function AdminServicesPage() {
  const services = await listAdminServices();
  return <ServiceManagement services={services} />;
}
