"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { ADMIN_PATH } from "@/lib/auth/constants";
import { authenticateCredentials, createSession } from "@/lib/auth/session";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export type LoginFormState = {
  errors?: {
    username?: string[];
    password?: string[];
  };
  message?: string;
};

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
    };
  }

  const isAuthenticated = await authenticateCredentials(
    parsed.data.username,
    parsed.data.password,
  );

  if (!isAuthenticated) {
    return {
      message: "Tên đăng nhập hoặc mật khẩu không đúng.",
    };
  }

  await createSession();
  redirect(ADMIN_PATH);
}
