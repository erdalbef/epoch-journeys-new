import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}