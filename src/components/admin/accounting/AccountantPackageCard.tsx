import {
  Archive,
  Download,
} from "lucide-react";

import AccountantEmailForm from "@/components/admin/accounting/AccountantEmailForm";

type Props = {
  year: number;
  month: number;
  part1Count: number;
  part2Count: number;
};

export default function AccountantPackageCard({
  year,
  month,
  part1Count,
  part2Count,
}: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b bg-[#0B1F3A] px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2.5">
            <Archive className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Accountant Package
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              Review the package contents before downloading
              or sending them to the accountant.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b bg-slate-50 px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
          Package Preview
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
                  ZIP Part 1
                </p>

                <h3 className="mt-1 font-semibold text-slate-900">
                  Financial Documents
                </h3>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {part1Count}{" "}
                {part1Count === 1
                  ? "document"
                  : "documents"}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <span>01 Bank Statements</span>
                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>02 Sales / Income</span>
                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>03 Expenses / Purchases</span>
                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>04 Cash</span>
                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>
            </div>

            {part1Count > 0 ? (
              <a
                href={`/api/admin/accounting/package/${year}/${month}/1`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
              >
                <Download className="h-4 w-4" />
                Download ZIP Part 1
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
              >
                <Download className="h-4 w-4" />
                No Documents
              </button>
            )}
          </div>

          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
                  ZIP Part 2
                </p>

                <h3 className="mt-1 font-semibold text-slate-900">
                  Supporting Documents
                </h3>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {part2Count}{" "}
                {part2Count === 1
                  ? "document"
                  : "documents"}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <span>
                  05 Employees / Accountable Persons
                </span>

                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>
                  06 Owner / Personal Payments
                </span>

                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>07 Other Documents</span>

                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span>
                  08 Trip / Group Documentation
                </span>

                <span className="text-xs text-slate-400">
                  Included if available
                </span>
              </div>
            </div>

            {part2Count > 0 ? (
              <a
                href={`/api/admin/accounting/package/${year}/${month}/2`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
              >
                <Download className="h-4 w-4" />
                Download ZIP Part 2
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
              >
                <Download className="h-4 w-4" />
                No Documents
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm leading-6 text-amber-900">
            Before sending, you can download both ZIP files
            and confirm that the correct monthly documents
            are included.
          </p>
        </div>
      </div>

      <AccountantEmailForm
        year={year}
        month={month}
        part1Count={part1Count}
        part2Count={part2Count}
      />
    </section>
  );
}