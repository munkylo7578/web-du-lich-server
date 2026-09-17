import type { Metadata } from "next";

import { listAdminTours } from "@/features/admin-tours/repository";
import { TourManagement } from "@/components/admin/tours/tour-management";

export const metadata: Metadata = {
  title: "Quản lý tour",
  description: "Tạo, chỉnh sửa và quản lý nội dung tour đa ngôn ngữ.",
};

export default async function AdminToursPage() {
  const tours = await listAdminTours({ page: 1, pageSize: 10 });

  return <TourManagement initialResult={tours} />;
}
