import type { Metadata } from "next";

import { requireSession } from "@/lib/auth/session";
import { listAdminTours } from "@/features/admin-tours/repository";
import { TourManagement } from "@/components/admin/tours/tour-management";

export const metadata: Metadata = {
  title: "Quản lý tour",
  description: "Tạo, chỉnh sửa và quản lý nội dung tour đa ngôn ngữ.",
};

export default async function AdminToursPage() {
  const [session, tours] = await Promise.all([requireSession(), listAdminTours()]);

  return <TourManagement tours={tours} username={session.username} />;
}
