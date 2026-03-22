"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/pages/about", label: "About" },
  { href: "/pages/themes", label: "Themes" },
  { href: "/pages/destinations", label: "Destinations" },
  { href: "/pages/why-partner", label: "Why Partner" },
  { href: "/pages/contact", label: "Contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/95 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-4 -mt-px transition-opacity hover:opacity-90"
        >
          <Image
            src="/epoch-logo.png"
            alt="Epoch Journeys"
            width={220}
            height={220}
            className="h-14 w-14 object-contain"
            priority
          />

          <div className="flex flex-col leading-none">
            <span className="text-[1.25rem] font-semibold tracking-tight text-[#001F3F]">
              Epoch Journeys
            </span>

            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Cultural & Pilgrimage Travel
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#001F3F]"
            >
              {item.label}
            </Link>
          ))}

          <Separator orientation="vertical" className="mx-3 h-6" />

          <Button
            className="rounded-full bg-[#8B0000] px-5 text-white shadow-sm transition hover:bg-[#720000] hover:shadow-md"
            asChild
          >
            <Link href="/request-partnership">Request Partnership</Link>
          </Button>

          <Button
            variant="outline"
            className="rounded-full border-slate-300 px-5 text-[#001F3F] transition hover:bg-slate-50"
            asChild
          >
            <Link href="/agent-login">Agent Login</Link>
          </Button>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#001F3F]"
                >
                  {item.label}
                </Link>
              ))}

              <Separator className="my-3" />

              <Link
                href="/request-partnership"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl bg-[#8B0000] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#720000]"
              >
                Request Partnership
              </Link>

              <Link
                href="/agent-login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#001F3F] transition hover:bg-slate-50"
              >
                Agent Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}