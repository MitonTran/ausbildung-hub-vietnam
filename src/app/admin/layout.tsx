import { requireAdminProfile } from "@/lib/auth/route-protection";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminProfile();

  return <>{children}</>;
}
