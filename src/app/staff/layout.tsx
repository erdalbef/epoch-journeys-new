import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/authOptions";

export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/admin-login");
  }

  const hasStaffAccess =
  session.user.role === "STAFF" || session.user.role === "ADMIN";

if (!hasStaffAccess) {
  if (session.user.role === "AGENT") {
    redirect("/agent/dashboard");
  }

  redirect("/");
}

  
  const staffName =
    session.user.fullName ||
    session.user.name ||
    session.user.email ||
    "Epoch Team Member";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
              Epoch Journeys
            </p>

            <h1 className="text-xl font-bold text-[#0B1F3A]">
              Staff Workspace
            </h1>
          </div>

          <div className="text-sm text-slate-600">
            Signed in as {staffName}
          </div>
        </div>

        <nav className="border-t border-slate-100">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-6 py-3">
            <Link
              href="/staff"
              className="rounded-full px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Home
            </Link>

            <Link
              href="/staff/epoch-academy"
              className="rounded-full px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Epoch Academy
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}