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

export type AuthState = { error: string | null };

function readEmailPassword(formData: FormData): {
  email: string;
  password: string;
  error: string | null;
} {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { email, password, error: "Vui lòng nhập email và mật khẩu." };
  }
  if (password.length < 8) {
    return { email, password, error: "Mật khẩu phải có ít nhất 8 ký tự." };
  }
  return { email, password, error: null };
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password, error } = readEmailPassword(formData);
  if (error) return { error };

  const supabase = createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password, error } = readEmailPassword(formData);
  if (error) return { error };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "student");
  const role: UserRole = (USER_ROLES as ReadonlyArray<string>).includes(
    requestedRole
  )
    ? (requestedRole as UserRole)
    : "student";

  if (!SIGNUP_ROLES.includes(role)) {
    return { error: "Vai trò không hợp lệ." };
  }

  const supabase = createSupabaseServerClient();
  const { error: signUpError } = await supabase.auth.signUp({
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
    return { error: signUpError.message };
  }

  // Profile row is created by the `on_auth_user_created` trigger
  // (see supabase/migrations/0001_profiles_foundation.sql). When email
  // confirmation is enabled, the user must confirm before signInWithPassword
  // will succeed — Supabase returns no session here in that case.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
