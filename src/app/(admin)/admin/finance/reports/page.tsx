import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";

export default async function FinanceReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Finance Reports
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Management and accounting reports built directly from the finance
            records in Epoch Journeys.
          </p>
        </div>

        <Link
          href="/admin/finance"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          ← Finance Center
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          title="General Ledger"
          description="Bank and cash ledger with opening balance, inflows, outflows, running balance, reconciliation status, and CSV export."
          href="/admin/finance/reports/general-ledger"
          ready
        />

        <ReportCard
          title="Accounts Receivable"
          description="Booking balances, customer receipts, outstanding amounts, overdue schedules, aging buckets, and CSV export."
          href="/admin/finance/reports/accounts-receivable"
          ready
        />

        <ReportCard
          title="Accounts Payable"
          description="Approved supplier liabilities, credits, payments, outstanding balances, overdue amounts, aging buckets, and CSV export."
          href="/admin/finance/reports/accounts-payable"
          ready
        />

        <ReportCard
          title="Expense Report"
          description="Direct tour costs and overhead by cost type, cost center, expense item, supplier, payment status, source, and period."
          href="/admin/finance/reports/expenses"
          ready
        />

        <ReportCard
          title="Cash & Bank Report"
          description="Account balances, cash movement, transfers, statement position, and reconciliation status."
        />

        <ReportCard
          title="Refund Report"
          description="Pending, approved, paid, and cancelled customer refunds with booking and payment references."
        />
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  href,
  ready = false,
}: {
  title: string;
  description: string;
  href?: string;
  ready?: boolean;
}) {
  const body = (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#8B0000]/40">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-[#001F3F]">{title}</h2>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            ready
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {ready ? "READY" : "NEXT"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

      {ready && (
        <p className="mt-5 text-sm font-semibold text-[#8B0000]">
          Open report →
        </p>
      )}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
