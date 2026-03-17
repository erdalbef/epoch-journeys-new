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
    <header className="sticky top-0 z-50 w-full bg-white border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/epoch-logo.png"
            alt="Epoch Journeys"
            width={160}
            height={160}
            className="h-10 w-10 object-contain"
            priority
          />
          <span className="text-xl font-semibold text-[#001F3F]">
            Epoch Journeys
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/pages/about">About</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/pages/themes">Themes</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/pages/destinations">Destinations</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/pages/why-partner">Why Partner</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/pages/contact">Contact</Link>
          </Button>

          <Separator orientation="vertical" className="mx-2 h-6" />

          <Button className="bg-[#8B0000] text-white hover:bg-[#7A0000]" asChild>
            <Link href="/request-partnership">Request Partnership</Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/agent-login">Agent Login</Link>
          </Button>
        </nav>

        <button onClick={() => setOpen(!open)} className="lg:hidden">
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-white lg:hidden">
          <div className="flex flex-col gap-3 px-6 py-6 text-sm">
            <Link href="/" onClick={() => setOpen(false)}>Home</Link>
            <Link href="/pages/about" onClick={() => setOpen(false)}>About</Link>
            <Link href="/pages/themes" onClick={() => setOpen(false)}>Themes</Link>
            <Link href="/pages/destinations" onClick={() => setOpen(false)}>Destinations</Link>
            <Link href="/pages/why-partner" onClick={() => setOpen(false)}>Why Partner</Link>
            <Link href="/pages/contact" onClick={() => setOpen(false)}>Contact</Link>

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