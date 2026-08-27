import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Trang quản trị",
  description: "Trang quản trị",
};

export default async function AdminPage() {
  await requireSession();
  redirect("/admin/tours");
}
