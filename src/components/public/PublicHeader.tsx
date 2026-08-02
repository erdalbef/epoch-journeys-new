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
  { href: "/pages/journeys", label: "Journeys" },
  { href: "/pages/services", label: "Services" },
  { href: "/pages/why-epoch", label: "Why Epoch" },
  { href: "/pages/contact", label: "Contact" },
  { href: "/pages/epoch-academy", label: "Epoch Academy" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/95 shadow-md backdrop-blur">
      <div className="mx-auto flex h-[104px] max-w-7xl items-center justify-between gap-8 px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-4">
          <Image
            src="/epoch-compass-logo.png"
            alt="Epoch Journeys"
            width={104}
            height={104}
            priority
            className="h-[68px] w-[68px] object-contain"
          />

          <div className="leading-tight">
            <div className="whitespace-nowrap text-[28px] font-semibold tracking-tight text-[#0B1F3A]">
              Epoch Journeys
            </div>
            <div className="mt-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.34em] text-[#A57A1C]">
              Christian Pilgrimages
            </div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-4 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-semibold text-[#0B1F3A] transition hover:bg-[#F7F3EA] hover:text-[#A57A1C]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <Separator orientation="vertical" className="mr-1 h-7" />

          <Button
            asChild
            className="rounded-full bg-[#C9A24D] px-8 py-5 text-[15px] font-semibold text-[#0B1F3A] shadow-md transition hover:bg-[#0B1F3A] hover:text-[#C9A24D] hover:shadow-lg"
          >
            <Link href="/request-partnership">Become a Partner</Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-full border-slate-300 px-6 py-5 text-[15px] font-semibold text-[#0B1F3A] transition hover:bg-[#F7F3EA]"
          >
            <Link href="/agent-login">Agent Login</Link>
          </Button>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-[#0B1F3A] transition hover:bg-[#F7F3EA] lg:hidden"
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
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#F7F3EA]"
                >
                  {item.label}
                </Link>
              ))}

              <Separator className="my-3" />

              <Link
                href="/request-partnership"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl bg-[#C9A24D] px-4 py-3 text-sm font-semibold text-[#0B1F3A] shadow-sm transition hover:bg-[#0B1F3A] hover:text-[#C9A24D]"
              >
                Become a Partner
              </Link>

              <Link
                href="/agent-login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#F7F3EA]"
              >
                Agent Login
              </Link>
              <Link
                href="/epoch-academy"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#F7F3EA]"
              >
                Epoch Academy
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}