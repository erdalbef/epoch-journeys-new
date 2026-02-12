import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-2xl border bg-white p-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Epoch Journeys
        </h1>
        <p className="mt-2 text-muted-foreground">
          We’re currently building a premium B2B platform for faith-based and
          culture/history thematic journeys.
        </p>

        <div className="mt-6 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm">
            🚧 <span className="font-medium">Under Construction</span> — New
            features are being deployed regularly.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/request-partnership">Request Partnership</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin-login">Admin Login</Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Epoch Journeys. All rights reserved.
        </p>
      </div>
    </main>
  );
}
