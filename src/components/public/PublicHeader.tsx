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
  { href: "/pages/journey-collections", label: "Journey Collections" },
  { href: "/pages/services", label: "Services" },
  { href: "/pages/why-epoch", label: "Why Epoch" },
  { href: "/pages/contact", label: "Contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-4 transition-opacity hover:opacity-90"
        >
          <Image
            src="/epoch-logo.png"
            alt="Epoch Journeys"
            width={220}
            height={220}
            className="h-14 w-14 object-contain"
            priority
          />

          <span className="text-[1.3rem] font-semibold tracking-tight text-[#0B1F3A]">
            Epoch Journeys
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[15px] font-medium text-[#0B1F3A] transition hover:bg-[#F7F3EA]"
            >
              {item.label}
            </Link>
          ))}

          <Separator orientation="vertical" className="mx-3 h-6" />

          <Button
            className="rounded-full border border-transparent bg-[#C9A24D] px-6 py-2.5 font-semibold text-[#0B1F3A] shadow-sm transition-all duration-300 ease-in-out hover:border-[#C9A24D] hover:bg-[#0B1F3A] hover:text-[#C9A24D] hover:shadow-md"
            asChild
          >
            <Link href="/request-partnership">Become a Partner</Link>
          </Button>

          <Button
            variant="outline"
            className="rounded-full border-slate-300 px-5 font-semibold text-[#0B1F3A] transition hover:bg-[#F7F3EA]"
            asChild
          >
            <Link href="/agent-login">Agent Login</Link>
          </Button>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-[#0B1F3A] transition hover:bg-[#F7F3EA] lg:hidden"
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
                  className="rounded-xl px-3 py-3 text-sm font-medium text-[#0B1F3A] transition hover:bg-[#F7F3EA]"
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}