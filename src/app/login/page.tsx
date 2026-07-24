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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-6 py-16 dark:bg-[#09090b]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
      <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#2563eb]/12 blur-3xl dark:bg-[#2563eb]/18" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/60 to-transparent dark:from-black/40" />
      <div className="relative flex w-full max-w-md justify-center">
        <LoginForm />
      </div>
    </main>
  );
}
