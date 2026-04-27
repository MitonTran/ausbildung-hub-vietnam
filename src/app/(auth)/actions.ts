"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USER_ROLES, type UserRole } from "@/lib/supabase/types";

const SIGNUP_ROLES: ReadonlyArray<UserRole> = [
  "student",
  "center_admin",
  "employer_admin",
];

const SIGNUP_MIN_PASSWORD_LENGTH = 8;

export type AuthState = {
  error: string | null;
  message: string | null;
};

export const initialAuthState: AuthState = { error: null, message: null };

type Credentials = {
  email: string;
  password: string;
  error: string | null;
};

function readCredentials(
  formData: FormData,
  options: { enforceMinLength?: boolean } = {}
): Credentials {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { email, password, error: "Vui lòng nhập email và mật khẩu." };
  }
  if (
    options.enforceMinLength &&
    password.length < SIGNUP_MIN_PASSWORD_LENGTH
  ) {
    return {
      email,
      password,
      error: `Mật khẩu phải có ít nhất ${SIGNUP_MIN_PASSWORD_LENGTH} ký tự.`,
    };
  }
  return { email, password, error: null };
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password, error } = readCredentials(formData);
  if (error) return { error, message: null };

  const supabase = createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return { error: "Email hoặc mật khẩu không đúng.", message: null };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password, error } = readCredentials(formData, {
    enforceMinLength: true,
  });
  if (error) return { error, message: null };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "student");
  const role: UserRole = (USER_ROLES as ReadonlyArray<string>).includes(
    requestedRole
  )
    ? (requestedRole as UserRole)
    : "student";

  if (!SIGNUP_ROLES.includes(role)) {
    return { error: "Vai trò không hợp lệ.", message: null };
  }

  const supabase = createSupabaseServerClient();
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
        role,
      },
    },
  });
  if (signUpError) {
    return { error: signUpError.message, message: null };
  }

  // Profile row is created by the on_auth_user_created trigger
  // (see supabase/migrations/0001_profiles_foundation.sql).
  //
  // When email confirmation is ENABLED in the Supabase project,
  // signUp returns a user but no session — the user must click the
  // email link before they can sign in. Surface that to the form
  // instead of bouncing through /dashboard → /login silently.
  if (!data.session) {
    return {
      error: null,
      message:
        "Tài khoản đã được tạo. Vui lòng kiểm tra email để xác nhận trước khi đăng nhập.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
