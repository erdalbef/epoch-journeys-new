import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AccountingCategory,
  AccountingPeriodStatus,
} from "@prisma/client";

import AccountingDocumentActions from "@/components/admin/accounting/AccountingDocumentActions";
import AccountantPackageCard from "@/components/admin/accounting/AccountantPackageCard";

import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileArchive,
  FileText,
  FileUp,
  FolderOpen,
  Landmark,
  ReceiptText,
  UserRound,
} from "lucide-react";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    year: string;
    month: string;
  }>;

  searchParams: Promise<{
    category?: string;
    uploaded?: string;
    updated?: string;
    statementUploaded?: string;
  }>;
};

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
      "Sales invoices, customer advances, customer payments, credit notes, and other income documents.",
    icon: CircleDollarSign,
  },
  {
    category: AccountingCategory.EXPENSES_PURCHASES,
    number: "03",
    title: "Expenses / Purchases",
    description:
      "Hotels, accommodation, transport, transfers, restaurants, meals, guides, excursions, entrance fees, and other supplier documents.",
    icon: ReceiptText,
  },
  {
    category: AccountingCategory.CASH,
    number: "04",
    title: "Cash",
    description:
      "Cash receipts and cash payments with the related supporting documents.",
    icon: Banknote,
  },
  {
    category:
      AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS,
    number: "05",
    title: "Employees / Accountable Persons",
    description:
      "Travel expenses, expenses paid personally by employees, expense reports, and settlements.",
    icon: BriefcaseBusiness,
  },
  {
    category:
      AccountingCategory.OWNER_PERSONAL_PAYMENTS,
    number: "06",
    title: "Owner / Personal Payments",
    description:
      "Company expenses paid personally by the owner, funds provided by the owner, and reimbursements.",
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
      "Tour and group references, itineraries, booking confirmations, vouchers, and supporting documents.",
    icon: Building2,
  },
] as const;

function isAccountingCategory(
  value: string | undefined
): value is AccountingCategory {
  if (!value) {
    return false;
  }

  return Object.values(AccountingCategory).includes(
    value as AccountingCategory
  );
}

function getMonthName(month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
  }).format(
    new Date(
      Date.UTC(2026, month - 1, 1)
    )
  );
}

function getDueDate(
  year: number,
  month: number
) {
  const nextMonth =
    month === 12
      ? 1
      : month + 1;

  const nextYear =
    month === 12
      ? year + 1
      : year;

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

function formatDate(
  value: Date | null | undefined
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(value);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;

  return `${mb.toFixed(1)} MB`;
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
      return "Ready for Accountant";

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

function getCategoryDefinition(
  category: AccountingCategory
) {
  return categoryDefinitions.find(
    (item) =>
      item.category === category
  );
}

function getDocumentTypeLabel(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default async function AccountingMonthPage({
  params,
  searchParams,
}: PageProps) {
  const {
    year: yearParam,
    month: monthParam,
  } = await params;

  const query =
    await searchParams;

  const year =
    Number(yearParam);

  const month =
    Number(monthParam);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    notFound();
  }

  const selectedCategory =
    isAccountingCategory(
      query.category
    )
      ? query.category
      : null;

  const period =
    await db.accountingPeriod.upsert({
      where: {
        year_month: {
          year,
          month,
        },
      },

      update: {},

      create: {
        year,
        month,
        dueDate:
          getDueDate(
            year,
            month
          ),
      },

      include: {
        documents: {
          orderBy: [
            {
              documentDate:
                "desc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },

            booking: {
              select: {
                id: true,
                bookingReference:
                  true,
                groupName: true,
              },
            },

            tour: {
              select: {
                id: true,
                title: true,
              },
            },

            bankAccount: {
              select: {
                id: true,
                name: true,
                currency: true,
              },
            },

            uploadedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },

        bankStatements: {
          where: {
            currency: "EUR",
          },

          orderBy: {
            statementDate:
              "desc",
          },

          include: {
            bankAccount: {
              select: {
                id: true,
                name: true,
                currency: true,
              },
            },

            uploadedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

  const categoryCounts =
    new Map<
      AccountingCategory,
      number
    >();

  for (
    const definition of
    categoryDefinitions
  ) {
    categoryCounts.set(
      definition.category,
      period.documents.filter(
        (document) =>
          document.accountingCategory ===
          definition.category
      ).length
    );
  }

  const financeBankDocumentCount =
    categoryCounts.get(
      AccountingCategory.BANK_STATEMENTS
    ) ?? 0;

  categoryCounts.set(
    AccountingCategory.BANK_STATEMENTS,
    financeBankDocumentCount +
      period.bankStatements.length
  );

  const totalDocuments =
    period.documents.length +
    period.bankStatements.length;

  const uncategorizedCount =
    period.documents.filter(
      (document) =>
        !document.accountingCategory
    ).length;

  const populatedCategories =
    categoryDefinitions.filter(
      (definition) =>
        (categoryCounts.get(
          definition.category
        ) ?? 0) > 0
    ).length;

  const filteredDocuments =
    selectedCategory
      ? period.documents.filter(
          (document) =>
            document.accountingCategory ===
            selectedCategory
        )
      : period.documents;

  const showBankStatements =
    !selectedCategory ||
    selectedCategory ===
      AccountingCategory.BANK_STATEMENTS;

  const selectedDefinition =
    selectedCategory
      ? getCategoryDefinition(
          selectedCategory
        )
      : null;

  const uploadHref =
    `/admin/accounting/upload?year=${year}&month=${month}` +
    (selectedCategory
      ? `&category=${selectedCategory}`
      : "");

  /*
   * Accountant ZIP package counts
   */

  const part1Categories =
    new Set<AccountingCategory>([
      AccountingCategory.BANK_STATEMENTS,
      AccountingCategory.SALES_INCOME,
      AccountingCategory.EXPENSES_PURCHASES,
      AccountingCategory.CASH,
    ]);

  const part2Categories =
    new Set<AccountingCategory>([
      AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS,
      AccountingCategory.OWNER_PERSONAL_PAYMENTS,
      AccountingCategory.OTHER_DOCUMENTS,
      AccountingCategory.TRIP_GROUP_DOCUMENTATION,
    ]);

  const part1DocumentCount =
    period.documents.filter(
      (document) =>
        document.accountingCategory !==
          null &&
        part1Categories.has(
          document.accountingCategory
        )
    ).length +
    period.bankStatements.length;

  const part2DocumentCount =
    period.documents.filter(
      (document) =>
        document.accountingCategory !==
          null &&
        part2Categories.has(
          document.accountingCategory
        )
    ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/admin/accounting"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#8B0000]"
          >
            <ArrowLeft className="h-4 w-4" />
            Accounting Dashboard
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#8B0000]">
            <CalendarDays className="h-4 w-4" />
            Monthly Accounting
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B1F3A]">
            {getMonthName(
              month
            )}{" "}
            {year}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review the complete
            documentation for this
            accounting period and
            prepare the monthly
            accountant package.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
              period.status
            )}`}
          >
            {getStatusLabel(
              period.status
            )}
          </span>

          <p className="text-xs text-slate-500">
            Accountant due date:{" "}
            <span className="font-semibold text-slate-700">
              {formatDate(
                period.dueDate
              )}
            </span>
          </p>

          <Link
            href={uploadHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          >
            <FileUp className="h-4 w-4" />
            Upload Document
          </Link>
        </div>
      </div>

      {query.uploaded ===
        "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Document uploaded
                successfully
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                The document has been
                added to this monthly
                accounting period.
              </p>
            </div>
          </div>
        </div>
      )}

      {query.updated ===
        "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Document updated
                successfully
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                The accounting
                document and its
                classification have
                been updated.
              </p>
            </div>
          </div>
        </div>
      )}

      {query.statementUploaded ===
        "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Bank statement
                uploaded successfully
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                The EUR bank statement
                has been added to this
                accounting period.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <FileText className="h-5 w-5 text-[#0B1F3A]" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Documents
              </p>

              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {totalDocuments}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#0B1F3A]" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Categories Used
              </p>

              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {
                  populatedCategories
                }
                /8
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <Landmark className="h-5 w-5 text-[#0B1F3A]" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                EUR Statements
              </p>

              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {
                  period
                    .bankStatements
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <FolderOpen className="h-5 w-5 text-[#0B1F3A]" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Uncategorized
              </p>

              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {
                  uncategorizedCount
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      <AccountantPackageCard
        year={year}
        month={month}
        part1Count={
          part1DocumentCount
        }
        part2Count={
          part2DocumentCount
        }
      />

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#0B1F3A]">
            Accountant Categories
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Select a category to review
            only the documents belonging
            to that section.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {categoryDefinitions.map(
            (definition) => {
              const Icon =
                definition.icon;

              const count =
                categoryCounts.get(
                  definition.category
                ) ?? 0;

              const active =
                selectedCategory ===
                definition.category;

              return (
                <Link
                  key={
                    definition.category
                  }
                  href={`/admin/accounting/${year}/${month}?category=${definition.category}`}
                  className={`rounded-2xl border p-4 transition ${
                    active
                      ? "border-[#8B0000] bg-red-50 shadow-sm"
                      : "bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? "bg-[#8B0000] text-white"
                          : "bg-[#0B1F3A] text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                        {
                          definition.number
                        }
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {
                          definition.title
                        }
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {count}{" "}
                        {count === 1
                          ? "document"
                          : "documents"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>

        {selectedCategory && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href={`/admin/accounting/${year}/${month}`}
              className="text-sm font-semibold text-[#8B0000] underline underline-offset-4"
            >
              Show all categories
            </Link>

            <Link
              href={uploadHref}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B0000]"
            >
              <FileUp className="h-4 w-4" />
              Upload to this category
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                {selectedDefinition
                  ? selectedDefinition.number
                  : "Monthly File Register"}
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#0B1F3A]">
                {selectedDefinition
                  ? selectedDefinition.title
                  : "Accounting Documents"}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {selectedDefinition
                  ? selectedDefinition.description
                  : "All Finance Documents assigned to this accounting month."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                {
                  filteredDocuments.length
                }{" "}
                finance{" "}
                {filteredDocuments.length ===
                1
                  ? "document"
                  : "documents"}
              </div>

              <Link
                href={uploadHref}
                className="inline-flex items-center gap-2 rounded-lg border border-[#8B0000] px-3 py-2 text-xs font-semibold text-[#8B0000] transition hover:bg-red-50"
              >
                <FileUp className="h-4 w-4" />
                Upload
              </Link>
            </div>
          </div>
        </div>

        {filteredDocuments.length ===
        0 ? (
          <div className="px-6 py-12 text-center">
            <FileArchive className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 font-medium text-slate-700">
              No finance documents in
              this section yet.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Upload the first
              accounting document for
              this section.
            </p>

            <Link
              href={uploadHref}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
            >
              <FileUp className="h-4 w-4" />
              Upload Document
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {filteredDocuments.map(
              (document) => {
                const relatedName =
                  document.supplier
                    ?.name ??
                  document.booking
                    ?.groupName ??
                  document.booking
                    ?.bookingReference ??
                  document.tour
                    ?.title ??
                  document.bankAccount
                    ?.name ??
                  null;

                const uploadedBy =
                  document.uploadedBy
                    ?.fullName ??
                  document.uploadedBy
                    ?.email ??
                  null;

                return (
                  <div
                    key={
                      document.id
                    }
                    className="px-6 py-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                          <FileText className="h-5 w-5 text-[#0B1F3A]" />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {
                              document.title
                            }
                          </p>

                          <p className="mt-1 break-all text-sm text-slate-500">
                            {
                              document.originalFileName
                            }
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {getDocumentTypeLabel(
                                document.type
                              )}
                            </span>

                            {document.accountingSubcategory && (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {
                                  document.accountingSubcategory
                                }
                              </span>
                            )}

                            {relatedName && (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                {
                                  relatedName
                                }
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                            <span>
                              Date:{" "}
                              {formatDate(
                                document.documentDate ??
                                  document.createdAt
                              )}
                            </span>

                            <span>
                              Size:{" "}
                              {formatFileSize(
                                document.fileSize
                              )}
                            </span>

                            {document.referenceNumber && (
                              <span>
                                Ref:{" "}
                                {
                                  document.referenceNumber
                                }
                              </span>
                            )}

                            {uploadedBy && (
                              <span>
                                Uploaded by:{" "}
                                {
                                  uploadedBy
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <a
                          href={
                            document.storagePath
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold text-[#0B1F3A] transition hover:bg-slate-50"
                        >
                          Open Document
                        </a>

                        <AccountingDocumentActions
                          documentId={
                            document.id
                          }
                          year={
                            year
                          }
                          month={
                            month
                          }
                          category={
                            document.accountingCategory
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {showBankStatements && (
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#0B1F3A] p-2.5 text-white">
                  <Landmark className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-[#0B1F3A]">
                    EUR Bank Statements
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Separate bank
                    statement records
                    assigned to this
                    accounting month.
                  </p>
                </div>
              </div>

              <Link
                href={`/admin/accounting/bank-statements/upload?year=${year}&month=${month}`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
              >
                <FileUp className="h-4 w-4" />
                Upload Bank Statement
              </Link>
            </div>
          </div>

          {period.bankStatements.length ===
          0 ? (
            <div className="px-6 py-12 text-center">
              <Landmark className="mx-auto h-9 w-9 text-slate-300" />

              <p className="mt-3 font-medium text-slate-700">
                No EUR bank
                statements uploaded
                for this month.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Complete bank
                statements use the
                dedicated Bank
                Statement upload flow.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {period.bankStatements.map(
                (statement) => {
                  const uploadedBy =
                    statement.uploadedBy
                      ?.fullName ??
                    statement.uploadedBy
                      ?.email ??
                    null;

                  return (
                    <div
                      key={
                        statement.id
                      }
                      className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {
                            statement
                              .bankAccount
                              .name
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Statement date:{" "}
                          {formatDate(
                            statement.statementDate
                          )}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            Currency:{" "}
                            {
                              statement.currency
                            }
                          </span>

                          <span>
                            Status:{" "}
                            {getDocumentTypeLabel(
                              statement.status
                            )}
                          </span>

                          {statement.fileName && (
                            <span>
                              File:{" "}
                              {
                                statement.fileName
                              }
                            </span>
                          )}

                          {uploadedBy && (
                            <span>
                              Uploaded by:{" "}
                              {
                                uploadedBy
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        EUR
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      )}

      {uncategorizedCount >
        0 &&
        !selectedCategory && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <FileArchive className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div>
                <h3 className="font-semibold text-amber-900">
                  Documents requiring
                  classification
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  {
                    uncategorizedCount
                  }{" "}
                  {uncategorizedCount ===
                  1
                    ? "document has"
                    : "documents have"}{" "}
                  been assigned to this
                  month but not yet
                  assigned to one of the
                  accountant&apos;s eight
                  categories.
                </p>
              </div>
            </div>
          </section>
        )}
    </div>
  );
}