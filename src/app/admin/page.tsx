import type { Metadata } from "next";

import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Trang quản trị",
  description: "Trang quản trị tạm thời sau khi đăng nhập.",
};

export default async function AdminPage() {
  const session = await requireSession();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-6 py-16 dark:bg-[#09090b]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
      <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-[#2563eb]/12 blur-3xl dark:bg-[#2563eb]/16" />
      <div className="relative w-full max-w-3xl rounded-[32px] border border-black/6 bg-white/94 p-10 text-center shadow-[0_32px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-[#111214]/92 dark:shadow-[0_32px_90px_-38px_rgba(0,0,0,0.8)] sm:p-14">
        
      
        <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-[#2563eb]/70 to-transparent" />
      </div>
    </main>
  );
}
