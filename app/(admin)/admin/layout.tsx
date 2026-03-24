import Link from "next/link";
import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // ✅ Protect ALL admin pages here
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/admin/dashboard"
            className="text-lg font-semibold tracking-tight"
          >
            Epoch Journeys | Admin
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link className="hover:underline" href="/admin/dashboard">
              Dashboard
            </Link>

            <Link className="hover:underline" href="/admin/agents">
              Agents
            </Link>

            <Link className="hover:underline" href="/admin/tours">
              Tours
            </Link>

            {/* ✅ ADD THIS */}
            <Link className="hover:underline" href="/admin/bookings">
              Bookings
            </Link>
          </nav>
        </div>
        <Separator />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}