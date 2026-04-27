"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { signUpAction, initialAuthState } from "../(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
      {pending ? "Đang tạo tài khoản..." : "Đăng ký"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(signUpAction, initialAuthState);

  return (
    <form action={formAction} className="space-y-3">
      <Input name="full_name" placeholder="Họ và tên" required />
      <Select name="role" defaultValue="student">
        <option value="student">Học viên</option>
        <option value="center_admin">Quản trị trung tâm tiếng Đức</option>
        <option value="employer_admin">Nhà tuyển dụng / Agency</option>
      </Select>
      <Input name="email" type="email" autoComplete="email" placeholder="Email" required />
      <Input
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Mật khẩu (tối thiểu 8 ký tự)"
        required
        minLength={8}
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
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
