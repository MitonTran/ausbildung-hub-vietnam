"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { USER_STAGES, USER_STAGE_LABEL_VI } from "@/lib/verification";

import { signUpAction, type AuthState } from "../(auth)/actions";

const initialState: AuthState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
      {pending ? "Đang tạo tài khoản..." : "Đăng ký"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <Input name="full_name" placeholder="Họ và tên" required />
      <Select name="role" defaultValue="student">
        <option value="student">Học viên</option>
        <option value="center_admin">Quản trị trung tâm tiếng Đức</option>
        <option value="employer_admin">Nhà tuyển dụng / Agency</option>
      </Select>
      <div className="space-y-1">
        <label
          htmlFor="self_declared_stage"
          className="block text-xs font-medium text-muted-foreground"
        >
          Bạn đang ở giai đoạn nào trong hành trình du học nghề Đức?
        </label>
        <Select
          id="self_declared_stage"
          name="self_declared_stage"
          defaultValue="exploring"
        >
          {USER_STAGES.map((s) => (
            <option key={s} value={s}>
              {USER_STAGE_LABEL_VI[s]}
            </option>
          ))}
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Đây là trạng thái bạn tự khai báo và <strong>chưa</strong> được xác minh.
        </p>
      </div>
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
