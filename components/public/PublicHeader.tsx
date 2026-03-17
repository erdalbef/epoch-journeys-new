"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Menu, X } from "lucide-react";

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo + Brand */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/epoch-logo.png"
            alt="Epoch Journeys"
            width={200}
            height={200}
            className="h-12 w-12 shrink-0"
            priority
          />
          <span className="text-xl font-semibold tracking-wide text-[#001F3F]">
            Epoch Journeys
          </span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden items-center gap-2 sm:flex">
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/about">About</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/themes">Themes</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/destinations">Destinations</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/why-partner">Why Partner</Link>
          </Button>

          <Separator orientation="vertical" className="mx-2 h-6" />

          <Button className="bg-[#8B0000] text-white hover:bg-[#7A0000]" asChild>
            <Link href="/request-partnership">Request Partnership</Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/agent-login">Agent Login</Link>
          </Button>
        </nav>

        {/* Mobile Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <Separator />

      {/* Mobile Menu */}
      {open && (
        <div className="border-t bg-white sm:hidden">
          <div className="flex flex-col gap-3 px-6 py-6 text-sm">

            <Link href="/" onClick={() => setOpen(false)}>
              Home
            </Link>

            <Link href="/about" onClick={() => setOpen(false)}>
              About
            </Link>

            <Link href="/themes" onClick={() => setOpen(false)}>
              Themes
            </Link>

            <Link href="/destinations" onClick={() => setOpen(false)}>
              Destinations
            </Link>

            <Link href="/why-partner" onClick={() => setOpen(false)}>
              Why Partner
            </Link>

            <Separator className="my-2" />

            <Link
              href="/request-partnership"
              onClick={() => setOpen(false)}
              className="rounded-md bg-[#8B0000] px-4 py-2 text-center text-white"
            >
              Request Partnership
            </Link>

            <Link
              href="/agent-login"
              onClick={() => setOpen(false)}
              className="rounded-md border px-4 py-2 text-center"
            >
              Agent Login
            </Link>

          </div>
        </div>
      )}
    </header>
  );
}