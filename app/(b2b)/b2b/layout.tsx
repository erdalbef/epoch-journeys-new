import type { ReactNode } from "react";
import { B2BHeader } from "@/components/b2b/B2BHeader";

export default function B2BLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <B2BHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
