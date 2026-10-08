import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePlus2,
  Search,
  Star,
  WalletCards,
} from "lucide-react";
import { SupplierServiceType } from "@prisma/client";

import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{
    q?: string;
    approval?: string;
    payment?: string;
    supplierId?: string;
    category?: string;
  }>;
};

type SupplierSummary = {
  supplierId: string;
  supplierName: string;
  preferred: boolean;
  category: string;
  categoryLabel: string;
  currency: string;
  payableCount: number;
  approvedAmount: number;
  amountPaid: number;
  balance: number;
  overdueCount: number;
  dueSoonCount: number;
};

const CATEGORY_OPTIONS: Array<{
  value: SupplierServiceType;
  label: string;
}> = [
  { value: SupplierServiceType.ACCOMMODATION, label: "Hotels / Accommodation" },
  { value: SupplierServiceType.TRANSPORT, label: "Transportation / Coach / Transfers" },
  { value: SupplierServiceType.MEAL, label: "Restaurants / Meals" },
  { value: SupplierServiceType.GUIDE, label: "Local Guides" },
  { value: SupplierServiceType.TOUR_MANAGER, label: "Tour Managers" },
  { value: SupplierServiceType.ENTRANCE, label: "Entrance Fees / Attractions" },
  { value: SupplierServiceType.MASS_ARRANGEMENT, label: "Mass Arrangements" },
  { value: SupplierServiceType.CHURCH_RESERVATION, label: "Church / Shrine Reservations" },
  { value: SupplierServiceType.TICKET, label: "Tickets" },
  { value: SupplierServiceType.RAIL, label: "Rail" },
  { value: SupplierServiceType.FERRY, label: "Ferry" },
  { value: SupplierServiceType.CRUISE, label: "Cruise" },
  { value: SupplierServiceType.FLIGHT, label: "Flights" },
  { value: SupplierServiceType.INSURANCE, label: "Insurance" },
  { value: SupplierServiceType.DMC_SERVICE, label: "DMC / Ground Services" },
  { value: SupplierServiceType.OTHER, label: "Other" },
];

function clean(value?: string) {
  return value?.trim() || "";
}

function categoryLabel(
  value: SupplierServiceType | string | null | undefined,
) {
  if (!value) {
    return "Uncategorised";
  }

  return (
    CATEGORY_OPTIONS.find((item) => item.value === value)?.label ??
    value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function money(
  value: unknown,
  currency: string,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    },
  ).format(Number(value ?? 0));
}

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "UTC",
        },
      ).format(value)
    : "—";
}

export default async function SupplierPayablesPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const q = clean(params.q);
  const approval = clean(params.approval);
  const payment = clean(params.payment);
  const supplierId = clean(params.supplierId);
  const category = clean(params.category);

  const validCategory =
    Object.values(SupplierServiceType).includes(
      category as SupplierServiceType,
    )
      ? (category as SupplierServiceType)
      : null;

  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 14);

  const where = {
    ...(q
      ? {
          OR: [
            {
              title: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              supplierNameSnapshot: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              supplierInvoiceNumber: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              supplierReference: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              serviceNameSnapshot: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(approval
      ? {
          approvalStatus: approval as never,
        }
      : {}),

    ...(payment
      ? {
          paymentStatus: payment as never,
        }
      : {}),

    ...(supplierId
      ? {
          supplierId,
        }
      : {}),

    ...(validCategory
      ? {
          service: {
            is: {
              type: validCategory,
            },
          },
        }
      : {}),
  };

  const [
    payables,
    suppliers,
    approvedTotals,
    paidTotals,
    overdueCount,
    dueSoonCount,
  ] = await Promise.all([
    db.supplierPayable.findMany({
      where,
      orderBy: [
        {
          dueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            preferred: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            country: true,
          },
        },
        rate: {
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            unit: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
        tour: {
          select: {
            id: true,
            title: true,
          },
        },
        departureDate: {
          select: {
            id: true,
            date: true,
          },
        },
      },
    }),

    db.supplier.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [
        {
          preferred: "desc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        preferred: true,
      },
    }),

    db.supplierPayable.aggregate({
      where: {
        approvalStatus: "APPROVED",
      },
      _sum: {
        approvedAmount: true,
        balance: true,
      },
    }),

    db.supplierPayablePayment.aggregate({
      _sum: {
        amount: true,
      },
    }),

    db.supplierPayable.count({
      where: {
        approvalStatus: "APPROVED",
        balance: {
          gt: 0,
        },
        dueDate: {
          lt: now,
        },
        paymentStatus: {
          not: "CANCELLED",
        },
      },
    }),

    db.supplierPayable.count({
      where: {
        approvalStatus: "APPROVED",
        balance: {
          gt: 0,
        },
        dueDate: {
          gte: now,
          lte: dueSoon,
        },
        paymentStatus: {
          not: "CANCELLED",
        },
      },
    }),
  ]);

  const approvedAmount = Number(
    approvedTotals._sum.approvedAmount ?? 0,
  );

  const outstanding = Number(
    approvedTotals._sum.balance ?? 0,
  );

  const paid = Number(
    paidTotals._sum.amount ?? 0,
  );

  const supplierSummaryMap =
    new Map<string, SupplierSummary>();

  for (const item of payables) {
    if (item.approvalStatus !== "APPROVED") {
      continue;
    }

    const itemCategory =
      item.service?.type ?? "UNCATEGORISED";

    const itemCategoryLabel =
      categoryLabel(item.service?.type);

    const key =
      `${itemCategory}:${item.supplierId}:${item.currency}`;

    const existing =
      supplierSummaryMap.get(key);

    const approved =
      Number(item.approvedAmount ?? 0);

    const itemPaid =
      Number(item.amountPaid ?? 0);

    const itemBalance =
      Number(item.balance ?? 0);

    const isOverdue =
      itemBalance > 0 &&
      item.dueDate !== null &&
      item.dueDate < now &&
      item.paymentStatus !== "CANCELLED";

    const isDueSoon =
      itemBalance > 0 &&
      item.dueDate !== null &&
      item.dueDate >= now &&
      item.dueDate <= dueSoon &&
      item.paymentStatus !== "CANCELLED";

    if (existing) {
      existing.payableCount += 1;
      existing.approvedAmount += approved;
      existing.amountPaid += itemPaid;
      existing.balance += itemBalance;

      if (isOverdue) {
        existing.overdueCount += 1;
      }

      if (isDueSoon) {
        existing.dueSoonCount += 1;
      }

      continue;
    }

    supplierSummaryMap.set(key, {
      supplierId: item.supplierId,
      supplierName: item.supplierNameSnapshot,
      preferred: item.supplier.preferred,
      category: itemCategory,
      categoryLabel: itemCategoryLabel,
      currency: item.currency,
      payableCount: 1,
      approvedAmount: approved,
      amountPaid: itemPaid,
      balance: itemBalance,
      overdueCount: isOverdue ? 1 : 0,
      dueSoonCount: isDueSoon ? 1 : 0,
    });
  }

  const supplierSummaries =
    Array.from(
      supplierSummaryMap.values(),
    ).sort((a, b) => {
      if (a.categoryLabel !== b.categoryLabel) {
        return a.categoryLabel.localeCompare(
          b.categoryLabel,
        );
      }

      if (a.preferred !== b.preferred) {
        return a.preferred ? -1 : 1;
      }

      if (a.balance !== b.balance) {
        return b.balance - a.balance;
      }

      return a.supplierName.localeCompare(
        b.supplierName,
      );
    });

  const categoryGroups =
    new Map<string, SupplierSummary[]>();

  for (const summary of supplierSummaries) {
    const items =
      categoryGroups.get(
        summary.category,
      ) ?? [];

    items.push(summary);

    categoryGroups.set(
      summary.category,
      items,
    );
  }

  const groupedSummaries =
    Array.from(
      categoryGroups.entries(),
    ).sort(
      (
        [categoryA],
        [categoryB],
      ) =>
        categoryLabel(categoryA).localeCompare(
          categoryLabel(categoryB),
        ),
    );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
            Accounts payable
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Supplier Payables
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Review supplier liabilities by service category, approve costs,
            monitor due dates, and record partial or full payments.
          </p>
        </div>

        <Link
          href="/admin/supplier-payables/new"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <FilePlus2 className="h-4 w-4" />
          New Payable
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={Banknote}
          label="Approved liabilities"
          value={money(
            approvedAmount,
            "EUR",
          )}
        />

        <Metric
          icon={WalletCards}
          label="Recorded payments"
          value={money(
            paid,
            "EUR",
          )}
        />

        <Metric
          icon={Clock3}
          label="Outstanding"
          value={money(
            outstanding,
            "EUR",
          )}
        />

        <Metric
          icon={AlertTriangle}
          label="Overdue"
          value={String(
            overdueCount,
          )}
          danger
        />

        <Metric
          icon={CheckCircle2}
          label="Due within 14 days"
          value={String(
            dueSoonCount,
          )}
        />
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_220px_220px_240px_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            name="q"
            defaultValue={q}
            placeholder="Supplier, invoice, service, reference or title..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#001F3F]/40"
          />
        </label>

        <select
          name="category"
          defaultValue={validCategory ?? ""}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">
            All categories
          </option>

          {CATEGORY_OPTIONS.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <select
          name="approval"
          defaultValue={approval}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">
            All approval statuses
          </option>

          {[
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "REJECTED",
            "CANCELLED",
          ].map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item.replaceAll("_", " ")}
              </option>
            ),
          )}
        </select>

        <select
          name="payment"
          defaultValue={payment}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">
            All payment statuses
          </option>

          {[
            "UNPAID",
            "PARTIALLY_PAID",
            "PAID",
            "OVERDUE",
            "CANCELLED",
          ].map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item.replaceAll("_", " ")}
              </option>
            ),
          )}
        </select>

        <select
          name="supplierId"
          defaultValue={supplierId}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">
            All suppliers
          </option>

          {suppliers.map(
            (supplier) => (
              <option
                key={supplier.id}
                value={supplier.id}
              >
                {supplier.preferred ? "★ " : ""}
                {supplier.name}
              </option>
            ),
          )}
        </select>

        <button className="h-10 rounded-xl bg-[#001F3F] px-5 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#001F3F]" />

              <h2 className="text-lg font-bold text-slate-950">
                Supplier Summary by Category
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Approved liabilities are grouped by supplier service category.
              Preferred suppliers appear first within each category.
            </p>
          </div>

          <p className="text-xs font-medium text-slate-400">
            One row per category, supplier and currency
          </p>
        </div>

        {groupedSummaries.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500">
            No approved supplier liabilities match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {groupedSummaries.map(
              ([groupCategory, summaries]) => {
                const payableCount =
                  summaries.reduce(
                    (
                      total,
                      summary,
                    ) =>
                      total +
                      summary.payableCount,
                    0,
                  );

                return (
                  <div key={groupCategory}>
                    <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
                      <h3 className="font-bold text-slate-900">
                        {categoryLabel(
                          groupCategory,
                        )}
                      </h3>

                      <span className="text-xs font-semibold text-slate-500">
                        {payableCount}{" "}
                        {payableCount === 1
                          ? "payable"
                          : "payables"}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1080px] text-left text-sm">
                        <thead className="border-y border-slate-100 bg-white text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-5 py-3">
                              Supplier
                            </th>

                            <th className="px-5 py-3 text-center">
                              Payables
                            </th>

                            <th className="px-5 py-3 text-right">
                              Approved
                            </th>

                            <th className="px-5 py-3 text-right">
                              Paid
                            </th>

                            <th className="px-5 py-3 text-right">
                              Outstanding
                            </th>

                            <th className="px-5 py-3 text-center">
                              Currency
                            </th>

                            <th className="px-5 py-3">
                              Position
                            </th>

                            <th className="px-5 py-3"></th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {summaries.map(
                            (summary) => {
                              const isPaid =
                                summary.balance <= 0;

                              const href =
                                summary.category ===
                                "UNCATEGORISED"
                                  ? `/admin/supplier-payables?supplierId=${summary.supplierId}`
                                  : `/admin/supplier-payables?category=${encodeURIComponent(
                                      summary.category,
                                    )}&supplierId=${summary.supplierId}`;

                              return (
                                <tr
                                  key={`${summary.category}-${summary.supplierId}-${summary.currency}`}
                                  className="hover:bg-slate-50"
                                >
                                  <td className="px-5 py-4">
                                    <Link
                                      href={href}
                                      className="inline-flex items-center gap-1.5 font-semibold text-[#001F3F] hover:underline"
                                    >
                                      {summary.preferred && (
                                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                      )}

                                      {summary.supplierName}
                                    </Link>
                                  </td>

                                  <td className="px-5 py-4 text-center font-medium text-slate-700">
                                    {summary.payableCount}
                                  </td>

                                  <td className="px-5 py-4 text-right font-semibold text-slate-900">
                                    {money(
                                      summary.approvedAmount,
                                      summary.currency,
                                    )}
                                  </td>

                                  <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                                    {money(
                                      summary.amountPaid,
                                      summary.currency,
                                    )}
                                  </td>

                                  <td
                                    className={`px-5 py-4 text-right font-bold ${
                                      summary.balance > 0
                                        ? "text-amber-700"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {money(
                                      summary.balance,
                                      summary.currency,
                                    )}
                                  </td>

                                  <td className="px-5 py-4 text-center font-medium text-slate-600">
                                    {summary.currency}
                                  </td>

                                  <td className="px-5 py-4">
                                    {summary.overdueCount > 0 ? (
                                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                        {summary.overdueCount} overdue
                                      </span>
                                    ) : summary.dueSoonCount > 0 ? (
                                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                        {summary.dueSoonCount} due soon
                                      </span>
                                    ) : isPaid ? (
                                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                        Settled
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                        Open
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-5 py-4 text-right">
                                    <Link
                                      href={href}
                                      className="inline-flex items-center gap-1 font-semibold text-[#8B0000]"
                                    >
                                      Details
                                      <ChevronRight className="h-4 w-4" />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5">
          <h2 className="text-lg font-bold text-slate-950">
            Individual Payables
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Detailed supplier invoices and liabilities. Service category,
            supplier service and rate reference remain visible for payment
            control and accounting audit trail.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Category
                </th>

                <th className="px-5 py-3">
                  Supplier / Payable
                </th>

                <th className="px-5 py-3">
                  Service / Rate
                </th>

                <th className="px-5 py-3">
                  Document
                </th>

                <th className="px-5 py-3">
                  Linked operation
                </th>

                <th className="px-5 py-3">
                  Due
                </th>

                <th className="px-5 py-3 text-right">
                  Approved
                </th>

                <th className="px-5 py-3 text-right">
                  Paid
                </th>

                <th className="px-5 py-3 text-right">
                  Balance
                </th>

                <th className="px-5 py-3">
                  Approval
                </th>

                <th className="px-5 py-3">
                  Payment
                </th>

                <th className="px-5 py-3"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {payables.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {categoryLabel(
                          item.service?.type,
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/supplier-payables/${item.id}`}
                        className="font-semibold text-[#001F3F] hover:underline"
                      >
                        {item.title}
                      </Link>

                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        {item.supplier.preferred && (
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        )}

                        {item.supplierNameSnapshot}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <p className="font-medium text-slate-800">
                        {item.serviceNameSnapshot ||
                          item.service?.name ||
                          "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.rateNameSnapshot ||
                          item.rate?.name ||
                          "No linked rate"}
                      </p>

                      {(item.service?.city ||
                        item.service?.country) && (
                        <p className="mt-1 text-xs text-slate-400">
                          {[
                            item.service?.city,
                            item.service?.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <p className="font-medium text-slate-800">
                        {item.documentType
                          .replaceAll("_", " ")
                          .toLowerCase()
                          .replace(
                            /\b\w/g,
                            (value) =>
                              value.toUpperCase(),
                          )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.supplierInvoiceNumber ||
                          item.supplierReference ||
                          "—"}
                      </p>

                      <p className="mt-1 font-mono text-[11px] text-slate-400">
                        {item.internalReference ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.booking ? (
                        <Link
                          href={`/admin/bookings/${item.booking.id}`}
                          className="font-medium text-[#001F3F] hover:underline"
                        >
                          {item.booking.bookingDisplayCode ||
                            item.booking.bookingReference}
                        </Link>
                      ) : item.tour ? (
                        <span>
                          {item.tour.title}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {date(item.dueDate)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {money(
                        item.approvedAmount,
                        item.currency,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right text-emerald-700">
                      {money(
                        item.amountPaid,
                        item.currency,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-amber-700">
                      {money(
                        item.balance,
                        item.currency,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <Status
                        value={item.approvalStatus}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <Status
                        value={item.paymentStatus}
                      />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/supplier-payables/${item.id}`}
                        className="font-semibold text-[#8B0000]"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ),
              )}

              {payables.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-5 py-14 text-center text-slate-500"
                  >
                    No supplier payables match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`rounded-xl p-2.5 ${
          danger
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-[#001F3F]"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p
          className={`text-xl font-bold ${
            danger
              ? "text-red-700"
              : "text-slate-950"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Status({
  value,
}: {
  value: string;
}) {
  const danger =
    value === "OVERDUE" ||
    value === "REJECTED" ||
    value === "CANCELLED";

  const good =
    value === "APPROVED" ||
    value === "PAID";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        danger
          ? "bg-red-50 text-red-700"
          : good
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
