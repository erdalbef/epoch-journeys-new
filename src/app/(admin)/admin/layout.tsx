import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { authOptions } from "@/lib/authOptions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const adminName =
    session.user.fullName || session.user.name || session.user.email || "Admin";

  return (
    <AdminShell adminName={adminName} adminEmail={session.user.email}>
      {children}
    </AdminShell>
  );
}
