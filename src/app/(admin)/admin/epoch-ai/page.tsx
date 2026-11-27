import type { Metadata } from "next";
import Link from "next/link";
import EpochAiSuite from "@/components/admin/epoch-ai/EpochAiSuite";

export const metadata: Metadata = {
  title: "Epoch AI | Epoch Journeys Admin",
  robots: { index: false, follow: false },
};

export default function EpochAiPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pt-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">
            Epoch AI
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#001F3F]">
            Pilgrimage Development Workspace
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Prepare, research and develop pilgrimage journeys.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/epoch-ai/hotel-procurement"
              className="rounded-lg border border-slate-200 p-4 hover:border-[#001F3F] hover:bg-slate-50"
            >
              <h3 className="font-bold text-[#001F3F]">
                Hotel Procurement
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Hotel research, supplier inquiries and delivery history.
              </p>
              <p className="mt-3 text-sm font-semibold text-blue-800">
                Open workspace
              </p>
            </Link>
            <Link href="/admin/quotes/new?prepare=epoch-ai"
              className="rounded-lg border border-slate-200 p-4 hover:border-[#001F3F] hover:bg-slate-50">
              <h3 className="font-bold text-[#001F3F]">Prepare a new quote with Epoch AI</h3>
              <p className="mt-1 text-sm text-slate-600">Check the itinerary and Supplier CRM rates, then review the draft in the quote builder.</p>
            </Link>
          </div>
        </div>
      </section>
      <EpochAiSuite />
    </>
  );
}