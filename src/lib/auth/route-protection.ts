import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole, type Profile, type UserRole } from "@/lib/supabase/types";

const CENTER_ROLES: ReadonlyArray<UserRole> = ["center_admin", "admin", "super_admin"];
const EMPLOYER_ROLES: ReadonlyArray<UserRole> = ["employer_admin", "admin", "super_admin"];

function getPathname(): string {
  const headerList = headers();
  const pathname = headerList.get("x-pathname") ?? "/dashboard";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function loginRedirect(): never {
  const next = getPathname();
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function requireAuthenticatedProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    loginRedirect();
  }
  return profile;
}

export async function requireAdminProfile(): Promise<Profile> {
  const profile = await requireAuthenticatedProfile();
  if (!isAdminRole(profile.role)) {
    redirect("/dashboard");
  }
  return profile;
}

export async function requireCenterDashboardAccess(): Promise<Profile> {
  const profile = await requireAuthenticatedProfile();
  if (!CENTER_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }
  return profile;
}

export async function requireEmployerDashboardAccess(): Promise<Profile> {
  const profile = await requireAuthenticatedProfile();
  if (!EMPLOYER_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }
  return profile;
}
