import { requireAuthenticatedProfile } from "@/lib/auth/route-protection";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthenticatedProfile();

  return <>{children}</>;
}
