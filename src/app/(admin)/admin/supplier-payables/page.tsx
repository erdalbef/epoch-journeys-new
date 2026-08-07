import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Search,
  WalletCards,
} from "lucide-react";

import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{
    q?: string;
    approval?: string;
    payment?: string;
    supplierId?: string;
  }>;
};

function clean(value?: string) {
  return value?.trim() || "";
}

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : "—";
}

export default async function SupplierPayablesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = clean(params.q);
  const approval = clean(params.approval);
  const payment = clean(params.payment);
  const supplierId = clean(params.supplierId);

  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 14);

  const where = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
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
          ],
        }
      : {}),
    ...(approval ? { approvalStatus: approval as never } : {}),
    ...(payment ? { paymentStatus: payment as never } : {}),
    ...(supplierId ? { supplierId } : {}),
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
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        supplier: { select: { id: true, name: true } },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
        tour: { select: { id: true, title: true } },
        departureDate: { select: { id: true, date: true } },
      },
    }),
    db.supplier.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.supplierPayable.aggregate({
      where: { approvalStatus: "APPROVED" },
      _sum: { approvedAmount: true, balance: true },
    }),
    db.supplierPayablePayment.aggregate({
      _sum: { amount: true },
    }),
    db.supplierPayable.count({
      where: {
        approvalStatus: "APPROVED",
        balance: { gt: 0 },
        dueDate: { lt: now },
        paymentStatus: { not: "CANCELLED" },
      },
    }),
    db.supplierPayable.count({
      where: {
        approvalStatus: "APPROVED",
        balance: { gt: 0 },
        dueDate: { gte: now, lte: dueSoon },
        paymentStatus: { not: "CANCELLED" },
      },
    }),
  ]);

  const approvedAmount = Number(approvedTotals._sum.approvedAmount ?? 0);
  const outstanding = Number(approvedTotals._sum.balance ?? 0);
  const paid = Number(paidTotals._sum.amount ?? 0);

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
            Review supplier liabilities, approve costs, monitor due dates, and
            record partial or full payments.
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
          value={money(approvedAmount, "EUR")}
        />
        <Metric
          icon={WalletCards}
          label="Recorded payments"
          value={money(paid, "EUR")}
        />
        <Metric
          icon={Clock3}
          label="Outstanding"
          value={money(outstanding, "EUR")}
        />
        <Metric
          icon={AlertTriangle}
          label="Overdue"
          value={String(overdueCount)}
          danger
        />
        <Metric
          icon={CheckCircle2}
          label="Due within 14 days"
          value={String(dueSoonCount)}
        />
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_220px_240px_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Supplier, invoice, reference or title..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#001F3F]/40"
          />
        </label>

        <select
          name="approval"
          defaultValue={approval}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">All approval statuses</option>
          {[
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "REJECTED",
            "CANCELLED",
          ].map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <select
          name="payment"
          defaultValue={payment}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">All payment statuses</option>
          {[
            "UNPAID",
            "PARTIALLY_PAID",
            "PAID",
            "OVERDUE",
            "CANCELLED",
          ].map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <select
          name="supplierId"
          defaultValue={supplierId}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
        >
          <option value="">All suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>

        <button className="h-10 rounded-xl bg-[#001F3F] px-5 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Supplier / Payable</th>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Linked operation</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Approved</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Approval</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payables.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/supplier-payables/${item.id}`}
                      className="font-semibold text-[#001F3F] hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.supplierNameSnapshot}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {item.supplierInvoiceNumber || item.supplierReference || "—"}
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
                      <span>{item.tour.title}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {date(item.dueDate)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {money(item.approvedAmount, item.currency)}
                  </td>
                  <td className="px-5 py-4 text-emerald-700">
                    {money(item.amountPaid, item.currency)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-amber-700">
                    {money(item.balance, item.currency)}
                  </td>
                  <td className="px-5 py-4">
                    <Status value={item.approvalStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <Status value={item.paymentStatus} />
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
              ))}

              {payables.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-14 text-center text-slate-500">
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
          danger ? "bg-red-50 text-red-700" : "bg-slate-100 text-[#001F3F]"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-xl font-bold ${danger ? "text-red-700" : "text-slate-950"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const danger = value === "OVERDUE" || value === "REJECTED" || value === "CANCELLED";
  const good = value === "APPROVED" || value === "PAID";

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
