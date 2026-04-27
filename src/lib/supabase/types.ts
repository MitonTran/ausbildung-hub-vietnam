/**
 * Shared Supabase / domain types.
 * Kept tiny on purpose — only what auth + role-gating need today.
 * The Trust Engine layer will extend this later.
 */

export const USER_ROLES = [
  "student",
  "center_admin",
  "employer_admin",
  "moderator",
  "admin",
  "super_admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES: ReadonlyArray<UserRole> = ["admin", "super_admin"];

export const STAFF_ROLES: ReadonlyArray<UserRole> = [
  "moderator",
  "admin",
  "super_admin",
];

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  self_declared_stage: string | null;
  verified_stage: string | null;
  verification_status: string;
  trust_score: number;
  risk_score: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as ReadonlyArray<string>).includes(role);
}
