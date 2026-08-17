import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { ADMIN_PATH } from "@/lib/auth/constants";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập để truy cập trang quản trị tạm thời.",
};

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect(ADMIN_PATH);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cyan-50 px-6 py-16 dark:bg-[#09090b]">
      <div className="relative flex w-full max-w-md justify-center">
        <LoginForm />
      </div>
    </main>
  );
}
