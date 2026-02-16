import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Image from "next/image"

export function PublicHeader() {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
         {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-epoch-transparent.png"
            alt="Epoch Journeys"
            width={200}
            height={200}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Epoch Journeys
        </Link>

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
      </div>

      <Separator />
    </header>
  );
}
