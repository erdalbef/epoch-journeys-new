import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function B2BHeader() {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/b2b/dashboard" className="text-lg font-semibold tracking-tight">
          Epoch Journeys | B2B
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/b2b/dashboard">Dashboard</Link>
          </Button>
        </nav>
      </div>

      <Separator />
    </header>
  );
}
