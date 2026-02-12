import Link from "next/link";
import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin/dashboard" className="text-lg font-semibold tracking-tight">
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
          </nav>
        </div>
        <Separator />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
