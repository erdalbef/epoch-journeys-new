import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function PublicFooter() {
  return (
    <footer className="mt-12 bg-white">
      <Separator />
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Epoch Journeys. B2B Only.</p>
          <div className="flex gap-4">
            <Link className="hover:underline" href="/legal/privacy">
              Privacy
            </Link>
            <Link className="hover:underline" href="/legal/terms">
              Terms
            </Link>
            <Link className="hover:underline" href="/contact">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
