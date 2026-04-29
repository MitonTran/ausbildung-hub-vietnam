import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AdminBackLink() {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/admin">← Quay lại Admin</Link>
    </Button>
  );
}
