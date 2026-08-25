import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";

const reports = [
  {
    title: "Management Summary",
    description:
      "Executive overview of income, expenses, profitability, receivables, payables and cash position.",
    href: "/admin/finance/reports/management-summary",
    group: "Management",
  },
  {
    title: "Accounts Receivable",
    description:
      "Customer and agent balances, collections, outstanding receivables, overdue amounts and aging.",
    href: "/admin/finance/reports/accounts-receivable",
    group: "Receivables & Payables",
  },
  {
    title: "Accounts Payable",
    description:
      "Supplier liabilities, approved payables, payments, outstanding balances and due dates.",
    href: "/admin/finance/reports/accounts-payable",
    group: "Receivables & Payables",
  },
  {
    title: "Due & Overdue",
    description:
      "Review receivables and payables approaching their due dates or already overdue.",
    href: "/admin/finance/reports/due-overdue",
    group: "Receivables & Payables",
  },
  {
    title: "Cash & Bank",
    description:
      "Review cash position, bank activity and movements across company accounts.",
    href: "/admin/finance/reports/cash-bank",
    group: "Banking & Cash",
  },
  {
    title: "General Ledger",
    description:
      "Detailed accounting-style view of posted financial transactions and ledger movements.",
    href: "/admin/finance/reports/general-ledger",
    group: "Accounting",
  },
  {
    title: "Expenses",
    description:
      "Analyze supplier costs, additional expenses, overhead, reimbursements and exceptional costs.",
    href: "/admin/finance/reports/expenses",
    group: "Accounting",
  },
  {
    title: "Refunds",
    description:
      "Review customer refunds and related financial movements.",
    href: "/admin/finance/reports/refunds",
    group: "Accounting",
  },
];

const sections = [
  "Management",
  "Receivables & Payables",
  "Banking & Cash",
  "Accounting",
];

export default async function FinanceReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Finance Reports
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Management, control and accounting reports built directly
            from the financial and operational records in Epoch
            Journeys.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            ← Back to Finance
          </Link>

          <Link
            href="/admin/finance/ledger"
            className="rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d5a]"
          >
            Finance Ledger
          </Link>
        </div>
      </div>

      {/* INFO */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h2 className="font-semibold text-blue-900">
          Finance Reporting Center
        </h2>

        <p className="mt-1 text-sm leading-6 text-blue-800">
          These reports consolidate information from booking payment
          schedules, received customer payments, approved supplier
          payables, supplier payments, additional expenses, bank
          records and other finance transactions.
        </p>
      </div>

      {/* REPORT SECTIONS */}

      {sections.map((section) => {
        const sectionReports = reports.filter(
          (report) => report.group === section,
        );

        return (
          <section key={section} className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-lg font-bold text-[#001F3F]">
                {section}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sectionReports.map((report) => (
                <Link
                  key={report.href}
                  href={report.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#8B0000] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-[#001F3F] transition group-hover:text-[#8B0000]">
                        {report.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {report.description}
                      </p>
                    </div>

                    <span className="mt-0.5 text-xl text-slate-300 transition group-hover:text-[#8B0000]">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* QUICK ACCESS */}

      <section className="rounded-2xl border bg-slate-50 p-5">
        <div>
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Finance Operations
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Return to operational finance tools when you need to
            review or update the underlying records.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/payments"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Customer Payments
          </Link>

          <Link
            href="/admin/supplier-payables"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Supplier Payables
          </Link>

          <Link
            href="/admin/finance/sales-documents"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Sales Documents
          </Link>

          <Link
            href="/admin/finance/documents"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Documents
          </Link>

          <Link
            href="/admin/finance/bank-accounts"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Bank Accounts
          </Link>

          <Link
            href="/admin/finance/bank-statements"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Bank Statements
          </Link>

          <Link
            href="/admin/finance/reconciliation"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Reconciliation
          </Link>

          <Link
            href="/admin/finance/profitability"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Profitability
          </Link>
        </div>
      </section>

      {/* FOOTNOTE */}

      <p className="text-xs leading-5 text-slate-500">
        Report accuracy depends on the underlying booking schedules,
        payments, supplier payables, expenses and bank transactions
        being entered and maintained correctly.
      </p>
    </div>
  );
}