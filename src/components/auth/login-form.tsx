"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginFormState } from "@/app/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-semibold text-white shadow-[0_20px_40px_-20px_rgba(37,99,235,0.9)] transition-all duration-200 hover:bg-[#1d4ed8] hover:shadow-[0_24px_48px_-20px_rgba(37,99,235,0.95)]"
      type="submit"
      disabled={pending}
    >
      {pending ? "Đang đăng nhập..." : "Đăng nhập"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full rounded-[30px] border border-black/6 bg-white/92 py-0 shadow-[0_32px_80px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111214]/92 dark:shadow-[0_32px_90px_-38px_rgba(0,0,0,0.8)]">
      <CardHeader className="space-y-3 px-8 pt-8 pb-6 sm:px-10 sm:pt-10">
        <div className="mx-auto h-1.5 w-14 rounded-full bg-[#2563eb]" />
        <CardTitle className="text-center text-[30px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
          Đăng nhập
        </CardTitle>
        <CardDescription className="text-center text-sm leading-6 text-[#6b7280] dark:text-zinc-400">
          Vui lòng nhập tài khoản quản trị để tiếp tục.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8 sm:px-10 sm:pb-10">
        <form action={formAction} className="space-y-5">
          {state.message ? (
            <Alert
              variant="destructive"
              className="rounded-2xl border border-red-200/80 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
            >
              <AlertTitle>Đăng nhập thất bại</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2.5">
            <Label
              htmlFor="username"
              className="text-[13px] font-semibold tracking-[0.02em] text-[#374151] dark:text-zinc-200"
            >
              Tên đăng nhập
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              aria-invalid={Boolean(state.errors?.username)}
              aria-describedby={state.errors?.username ? "username-error" : undefined}
              className="h-12 rounded-2xl border-black/8 bg-[#f8fafc] px-4 text-[15px] text-[#111827] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] transition-all duration-200 placeholder:text-[#9ca3af] focus-visible:border-[#2563eb]/50 focus-visible:ring-[#2563eb]/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500"
            />
            {state.errors?.username ? (
              <p id="username-error" className="text-sm text-destructive">
                {state.errors.username[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <Label
              htmlFor="password"
              className="text-[13px] font-semibold tracking-[0.02em] text-[#374151] dark:text-zinc-200"
            >
              Mật khẩu
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              aria-invalid={Boolean(state.errors?.password)}
              aria-describedby={state.errors?.password ? "password-error" : undefined}
              className="h-12 rounded-2xl border-black/8 bg-[#f8fafc] px-4 text-[15px] text-[#111827] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] transition-all duration-200 placeholder:text-[#9ca3af] focus-visible:border-[#2563eb]/50 focus-visible:ring-[#2563eb]/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500"
            />
            {state.errors?.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {state.errors.password[0]}
              </p>
            ) : null}
          </div>

          <SubmitButton />

        
        </form>
      </CardContent>
    </Card>
  );
}
