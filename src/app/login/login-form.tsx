"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { signInAction, type AuthState } from "../(auth)/actions";

const initialState: AuthState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
      {pending ? "Đang đăng nhập..." : "Đăng nhập"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <Input
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Email"
        required
      />
      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Mật khẩu"
        required
      />
      {state.error ? (
        <p className="text-sm text-red-500" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-emerald-500" role="status">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
      <p className="text-center text-xs text-muted-foreground pt-2">
        Bạn chưa có tài khoản?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
