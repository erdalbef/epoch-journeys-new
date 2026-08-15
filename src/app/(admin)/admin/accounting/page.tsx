import Link from "next/link";
import {
  AccountingCategory,
  AccountingPeriodStatus,
} from "@prisma/client";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileArchive,
  FileText,
  Landmark,
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const categoryDefinitions = [
  {
    category: AccountingCategory.BANK_STATEMENTS,
    number: "01",
    title: "Bank Statements",
    description:
      "EUR bank statements in PDF and Excel/CSV format where available.",
    icon: Landmark,
  },
  {
    category: AccountingCategory.SALES_INCOME,
    number: "02",
    title: "Sales / Income",
    description:
      "Sales invoices, customer advances, payments, credit notes, and other income documents.",
    icon: CircleDollarSign,
  },
  {
    category: AccountingCategory.EXPENSES_PURCHASES,
    number: "03",
    title: "Expenses / Purchases",
    description:
      "Hotels, transport, meals, guides, excursions, entrance fees, and other supplier costs.",
    icon: ReceiptText,
  },
  {
    category: AccountingCategory.CASH,
    number: "04",
    title: "Cash",
    description:
      "Cash receipts and cash payments together with supporting documentation.",
    icon: Banknote,
  },
  {
    category:
      AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS,
    number: "05",
    title: "Employees / Accountable Persons",
    description:
      "Travel expenses, personally paid company expenses, expense reports, and settlements.",
    icon: BriefcaseBusiness,
  },
  {
    category:
      AccountingCategory.OWNER_PERSONAL_PAYMENTS,
    number: "06",
    title: "Owner / Personal Payments",
    description:
      "Owner-paid company expenses, funds provided by the owner, and reimbursements.",
    icon: UserRound,
  },
  {
    category: AccountingCategory.OTHER_DOCUMENTS,
    number: "07",
    title: "Other Documents",
    description:
      "Contracts, loans, financing, insurance, and other accounting-related documents.",
    icon: FileArchive,
  },
  {
    category:
      AccountingCategory.TRIP_GROUP_DOCUMENTATION,
    number: "08",
    title: "Trip / Group Documentation",
    description:
      "Tour references, itineraries, confirmations, vouchers, and other supporting documents.",
    icon: Building2,
  },
] as const;

function getMonthName(month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

function getStatusLabel(
  status: AccountingPeriodStatus
) {
  switch (status) {
    case AccountingPeriodStatus.OPEN:
      return "Open";
    case AccountingPeriodStatus.REVIEW:
      return "Under Review";
    case AccountingPeriodStatus.READY:
      return "Ready";
    case AccountingPeriodStatus.SUBMITTED:
      return "Submitted";
    case AccountingPeriodStatus.CLOSED:
      return "Closed";
  }
}

function getStatusClasses(
  status: AccountingPeriodStatus
) {
  switch (status) {
    case AccountingPeriodStatus.OPEN:
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case AccountingPeriodStatus.REVIEW:
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case AccountingPeriodStatus.READY:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case AccountingPeriodStatus.SUBMITTED:
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case AccountingPeriodStatus.CLOSED:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getDueDate(year: number, month: number) {
  const nextMonth =
    month === 12 ? 1 : month + 1;

  const nextYear =
    month === 12 ? year + 1 : year;

  return new Date(
    Date.UTC(
      nextYear,
      nextMonth - 1,
      5,
      12,
      0,
      0
    )
  );
}

function formatDate(date: Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function AdminAccountingPage() {
  const now = new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  /*
   * Creating the accounting period on first access is safe
   * because year + month is unique in Prisma.
   */
  const currentPeriod =
    await db.accountingPeriod.upsert({
      where: {
        year_month: {
          year: currentYear,
          month: currentMonth,
        },
      },

      update: {},

      create: {
        year: currentYear,
        month: currentMonth,
        dueDate: getDueDate(
          currentYear,
          currentMonth
        ),
      },

      include: {
        documents: {
          select: {
            id: true,
            accountingCategory: true,
          },
        },

        bankStatements: {
          where: {
            currency: "EUR",
          },

          select: {
            id: true,
          },
        },
      },
    });

  const recentPeriods =
    await db.accountingPeriod.findMany({
      orderBy: [
        {
          year: "desc",
        },
        {
          month: "desc",
        },
      ],

      take: 12,

      include: {
        _count: {
          select: {
            documents: true,
            bankStatements: true,
          },
        },
      },
    });

  const categoryCounts =
    new Map<AccountingCategory, number>();

  for (const category of categoryDefinitions) {
    categoryCounts.set(
      category.category,
      currentPeriod.documents.filter(
        (document) =>
          document.accountingCategory ===
          category.category
      ).length
    );
  }

  /*
   * Bank statements are stored in their own model.
   * Add them to the category count so the dashboard reflects
   * the real number of Bank Statement records.
   */
  const financeDocumentBankCount =
    categoryCounts.get(
      AccountingCategory.BANK_STATEMENTS
    ) ?? 0;

  categoryCounts.set(
    AccountingCategory.BANK_STATEMENTS,
    financeDocumentBankCount +
      currentPeriod.bankStatements.length
  );

  const totalFinanceDocuments =
    currentPeriod.documents.length;

  const totalBankStatements =
    currentPeriod.bankStatements.length;

  const totalDocuments =
    totalFinanceDocuments +
    totalBankStatements;

  const categorizedDocuments =
    currentPeriod.documents.filter(
      (document) =>
        document.accountingCategory !==
        null
    ).length + totalBankStatements;

  const uncategorizedDocuments =
    currentPeriod.documents.filter(
      (document) =>
        document.accountingCategory ===
        null
    ).length;

  const completedCategories =
    categoryDefinitions.filter(
      (category) =>
        (categoryCounts.get(
          category.category
        ) ?? 0) > 0
    ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#8B0000]">
            <WalletCards className="h-4 w-4" />
            Finance & Accounting
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-[#0B1F3A]">
            Accounting Documents
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Prepare and review the monthly
            accounting documentation package
            before sending it to the accountant.
          </p>
        </div>

        <Link
          href={`/admin/accounting/${currentPeriod.year}/${currentPeriod.month}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
        >
          Open Current Month
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b bg-[#0B1F3A] px-6 py-5 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                Current Accounting Period
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {getMonthName(
                  currentPeriod.month
                )}{" "}
                {currentPeriod.year}
              </h2>
            </div>

            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                currentPeriod.status
              )}`}
            >
              {getStatusLabel(
                currentPeriod.status
              )}
            </span>
          </div>
        </div>

        <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <FileText className="h-5 w-5 text-[#0B1F3A]" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Documents
                </p>

                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {totalDocuments}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-[#0B1F3A]" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Categorized
                </p>

                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {categorizedDocuments}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <FileArchive className="h-5 w-5 text-[#0B1F3A]" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Uncategorized
                </p>

                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {uncategorizedDocuments}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <CalendarDays className="h-5 w-5 text-[#0B1F3A]" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Accountant Due Date
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatDate(
                    currentPeriod.dueDate
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0B1F3A]">
              Monthly Documentation
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {completedCategories} of{" "}
              {categoryDefinitions.length}{" "}
              categories currently contain
              documents.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Empty categories do not need to be
            included in the accountant package.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {categoryDefinitions.map(
            (category) => {
              const Icon = category.icon;

              const count =
                categoryCounts.get(
                  category.category
                ) ?? 0;

              return (
                <Link
                  key={category.category}
                  href={`/admin/accounting/${currentPeriod.year}/${currentPeriod.month}?category=${category.category}`}
                  className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1F3A] text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                            {category.number}
                          </p>

                          <h3 className="mt-1 font-semibold text-slate-900">
                            {category.title}
                          </h3>
                        </div>

                        <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {count}{" "}
                          {count === 1
                            ? "document"
                            : "documents"}
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {category.description}
                      </p>

                      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#8B0000]">
                        Review category
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      </div>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold text-[#0B1F3A]">
            Recent Accounting Periods
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Review current and previous monthly
            accounting packages.
          </p>
        </div>

        {recentPeriods.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No accounting periods have been
            created yet.
          </div>
        ) : (
          <div className="divide-y">
            {recentPeriods.map(
              (period) => {
                const count =
                  period._count.documents +
                  period._count.bankStatements;

                return (
                  <Link
                    key={period.id}
                    href={`/admin/accounting/${period.year}/${period.month}`}
                    className="flex flex-col gap-4 px-6 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                        <CalendarDays className="h-5 w-5 text-[#0B1F3A]" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {getMonthName(
                            period.month
                          )}{" "}
                          {period.year}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {count}{" "}
                          {count === 1
                            ? "document"
                            : "documents"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                          period.status
                        )}`}
                      >
                        {getStatusLabel(
                          period.status
                        )}
                      </span>

                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              Bank accounts for Phase 1
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              The Accounting module currently
              focuses on EUR bank statements.
              Additional currencies can be added
              later without changing the monthly
              accounting structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}