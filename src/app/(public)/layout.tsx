import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";


export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-black">
      <PublicHeader />

      <main className="flex-1">{children}</main>

      <PublicFooter />
      
    </div>
  );
}