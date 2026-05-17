import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-[#001F3F]"
          >
            Christian Pilgrimage Tours
          </Link>

          <nav className="flex items-center gap-4 text-sm text-slate-700">
            <Link href="/pages/about" className="hover:underline">
              About
            </Link>
            <Link href="/pages/faq" className="hover:underline">
              FAQ
            </Link>
            <Link href="/pages/request-access" className="hover:underline">
              Request Access
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}