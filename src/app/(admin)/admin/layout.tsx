import Link from "next/link";
import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";

type NavItem = {
  href: string;
  label: string;
  accent?: boolean;
};

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/tours", label: "Tours" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/quote-requests", label: "Quote Requests" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/quotes/new", label: "New Quote", accent: true },
  { href: "/admin/quotes/templates", label: "Templates" },
  { href: "/admin/finance", label: "Finance" },
];

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-4 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/admin/dashboard"
                className="group inline-flex flex-col leading-tight"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B0000]">
                  Epoch Journeys
                </span>
                <span className="text-xl font-bold tracking-tight text-[#001F3F] transition-colors group-hover:text-slate-900">
                  Admin Control Center
                </span>
              </Link>

              <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 md:inline-flex">
                Signed in as {adminName}
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.accent
                      ? "rounded-full border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-2 text-sm font-semibold text-[#8B0000] transition hover:bg-[#8B0000]/10"
                      : "rounded-full border border-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-slate-100 hover:text-[#001F3F]"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <Separator />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}