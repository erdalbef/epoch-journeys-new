import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BookingInstallmentStatus,
  BookingStatus,
  ExpensePaymentStatus,
  PaymentRecordStatus,
  SupplierPayableApprovalStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";

const REPORTING_CURRENCY = "EUR";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type SummaryItem = {
  label: string;
  income: number;
  expenses: number;
  count: number;
};

function getResult(item: SummaryItem) {
  return item.income - item.expenses;
}

function getTopItem(map: Map<string, SummaryItem>) {
  return Array.from(map.values()).sort(
    (a, b) => getResult(b) - getResult(a),
  )[0];
}

function addToSummary(
  map: Map<string, SummaryItem>,
  key: string,
  label: string,
  direction: "INCOME" | "EXPENSE",
  amount: number,
) {
  const existing = map.get(key) ?? {
    label,
    income: 0,
    expenses: 0,
    count: 0,
  };

  if (direction === "INCOME") {
    existing.income += amount;
  } else {
    existing.expenses += amount;
  }

  existing.count += 1;
  map.set(key, existing);
}

export default async function AdminFinanceDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [financeEntries, bookings, bankAccounts, supplierPayables] =
    await Promise.all([
    db.expense.findMany({
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      include: {
        booking: {
          select: {
            id: true,
            bookingDisplayCode: true,
            bookingReference: true,
          },
        },
        tour: {
          select: {
            id: true,
            title: true,
            tourCode: true,
          },
        },
      },
    }),

    db.booking.findMany({
      where: {
        status: {
          not: BookingStatus.CANCELLED,
        },
      },
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        currency: true,
        totalPrice: true,
        agencyNameSnapshot: true,
        agentNameSnapshot: true,
        groupName: true,
        tourTitleSnapshot: true,
        paymentSchedules: {
          where: {
            status: {
              not: BookingInstallmentStatus.CANCELLED,
            },
          },
          orderBy: {
            dueDate: "asc",
          },
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
            amount: true,
            amountPaid: true,
            status: true,
          },
        },
        payments: {
          where: {
            status: {
              in: [
                PaymentRecordStatus.RECEIVED,
                PaymentRecordStatus.REFUNDED,
              ],
            },
          },
          select: {
            id: true,
            amount: true,
            status: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    }),

    db.bankAccount.findMany({
      where: {
        isActive: true,
        currency: REPORTING_CURRENCY,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        openingBalance: true,
        currency: true,
      },
    }),

    db.supplierPayable.findMany({
      where: {
        approvalStatus: SupplierPayableApprovalStatus.APPROVED,
        currency: REPORTING_CURRENCY,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        payments: {
          orderBy: {
            paymentDate: "asc",
          },
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            method: true,
            reference: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
            agencyNameSnapshot: true,
            agentNameSnapshot: true,
            groupName: true,
            tourTitleSnapshot: true,
          },
        },
        tour: {
          select: {
            id: true,
            title: true,
            tourCode: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const getReportingAmount = (
    entry: (typeof financeEntries)[number],
  ) => entry.amount;

  /*
   * TRANSITION RULE
   * ----------------
   * Booking-linked INCOME entries are excluded from headline income totals.
   * Booking income now comes automatically from BookingPaymentSchedule +
   * Payment records. This prevents the old manual booking-income entries from
   * being counted twice.
   *
   * Manual INCOME without a booking remains valid for exceptional/non-booking
   * income. All manual EXPENSE entries remain active until the supplier expense
   * side is automated later.
   */
  const manualIncomeEntries = financeEntries.filter(
    (entry) =>
      entry.direction === "INCOME" &&
      !entry.booking &&
      entry.currency === REPORTING_CURRENCY,
  );

  const automatedPayableKeys = new Set(
    supplierPayables.map((payable) =>
      [
        payable.bookingId || "",
        payable.supplierId,
        payable.tourId || "",
      ].join("|"),
    ),
  );

  /*
   * Manual expense rows remain valid during the transition.
   * We exclude a manual supplier expense only when an APPROVED automatic
   * SupplierPayable exists for the same booking + supplier + tour combination.
   * This avoids double counting while preserving historical/manual expenses.
   */
  const manualExpenseEntries = financeEntries.filter((entry) => {
    if (
      entry.direction !== "EXPENSE" ||
      entry.currency !== REPORTING_CURRENCY
    ) {
      return false;
    }

    if (!entry.supplierId) {
      return true;
    }

    const key = [
      entry.bookingId || "",
      entry.supplierId,
      entry.tourId || "",
    ].join("|");

    return !automatedPayableKeys.has(key);
  });

  const automaticSupplierFinance = supplierPayables.map((payable) => {
    const approvedAmount = Number(payable.approvedAmount);
    const creditAmount = Number(payable.creditAmount);

    const recognizedExpense = Math.max(
      approvedAmount - creditAmount,
      0,
    );

    const paidAmount = payable.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    const pendingPayable = Math.max(
      recognizedExpense - paidAmount,
      0,
    );

    const isOverdue =
      pendingPayable > 0 &&
      Boolean(payable.dueDate) &&
      payable.dueDate! < new Date();

    return {
      ...payable,
      recognizedExpense,
      paidAmount,
      pendingPayable,
      isOverdue,
    };
  });

  const automaticBookingFinance = bookings
    .filter((booking) => booking.currency === REPORTING_CURRENCY)
    .map((booking) => {
      const scheduledTotal = booking.paymentSchedules.reduce(
        (sum, schedule) => sum + schedule.amount,
        0,
      );

      const schedulePaid = booking.paymentSchedules.reduce(
        (sum, schedule) => sum + schedule.amountPaid,
        0,
      );

      const receivedTotal = booking.payments
        .filter(
          (payment) =>
            payment.status === PaymentRecordStatus.RECEIVED,
        )
        .reduce((sum, payment) => sum + payment.amount, 0);

      const refundedTotal = booking.payments
        .filter(
          (payment) =>
            payment.status === PaymentRecordStatus.REFUNDED,
        )
        .reduce((sum, payment) => sum + payment.amount, 0);

      const actualPaid = Math.max(
        receivedTotal - refundedTotal,
        0,
      );

      /*
       * Once a schedule exists, the schedule is the receivable source.
       * If a payment exists before a schedule is created, that received amount
       * is still treated as recognized booking income so Paid Income never
       * exceeds Total Income.
       */
      const recognizedIncome =
        scheduledTotal > 0
          ? Math.max(scheduledTotal, actualPaid)
          : actualPaid;

      const pendingReceivable =
        scheduledTotal > 0
          ? Math.max(scheduledTotal - schedulePaid, 0)
          : 0;

      const nextOpenSchedule = booking.paymentSchedules.find(
        (schedule) =>
          schedule.status !== BookingInstallmentStatus.PAID,
      );

      return {
        ...booking,
        scheduledTotal,
        schedulePaid,
        actualPaid,
        recognizedIncome,
        pendingReceivable,
        nextDueDate: nextOpenSchedule?.dueDate ?? null,
      };
    })
    .filter(
      (booking) =>
        booking.recognizedIncome > 0 ||
        booking.actualPaid > 0 ||
        booking.paymentSchedules.length > 0,
    );

  const manualIncome = manualIncomeEntries.reduce(
    (sum, entry) => sum + getReportingAmount(entry),
    0,
  );

  const automaticIncome = automaticBookingFinance.reduce(
    (sum, booking) => sum + booking.recognizedIncome,
    0,
  );

  const totalIncome = automaticIncome + manualIncome;

  const automaticExpenses = automaticSupplierFinance.reduce(
    (sum, payable) => sum + payable.recognizedExpense,
    0,
  );

  const manualExpenses = manualExpenseEntries.reduce(
    (sum, entry) => sum + getReportingAmount(entry),
    0,
  );

  const totalExpenses = automaticExpenses + manualExpenses;

  const automaticPaidIncome = automaticBookingFinance.reduce(
    (sum, booking) => sum + booking.actualPaid,
    0,
  );

  const manualPaidIncome = manualIncomeEntries
    .filter(
      (entry) =>
        entry.paymentStatus === ExpensePaymentStatus.PAID,
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const paidIncome = automaticPaidIncome + manualPaidIncome;

  const automaticPendingIncome = automaticBookingFinance.reduce(
    (sum, booking) => sum + booking.pendingReceivable,
    0,
  );

  const manualPendingIncome = manualIncomeEntries
    .filter(
      (entry) =>
        entry.paymentStatus === ExpensePaymentStatus.PENDING,
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const pendingIncome =
    automaticPendingIncome + manualPendingIncome;

  const automaticPaidExpenses = automaticSupplierFinance.reduce(
    (sum, payable) => sum + payable.paidAmount,
    0,
  );

  const manualPaidExpenses = manualExpenseEntries
    .filter(
      (entry) =>
        entry.paymentStatus === ExpensePaymentStatus.PAID,
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const paidExpenses =
    automaticPaidExpenses + manualPaidExpenses;

  const automaticPendingExpenses =
    automaticSupplierFinance.reduce(
      (sum, payable) => sum + payable.pendingPayable,
      0,
    );

  const manualPendingExpenses = manualExpenseEntries
    .filter(
      (entry) =>
        entry.paymentStatus === ExpensePaymentStatus.PENDING,
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const pendingExpenses =
    automaticPendingExpenses + manualPendingExpenses;

  const totalTax = financeEntries
    .filter((entry) => entry.currency === REPORTING_CURRENCY)
    .reduce((sum, entry) => sum + (entry.taxAmount || 0), 0);

  const netProfit = totalIncome - totalExpenses;

  const openingBalance = bankAccounts.reduce(
    (sum, account) => sum + account.openingBalance,
    0,
  );

  const estimatedBankBalance =
    openingBalance + paidIncome - paidExpenses;

  const agencyMap = new Map<string, SummaryItem>();
  const tourMap = new Map<string, SummaryItem>();
  const groupMap = new Map<string, SummaryItem>();
  const supplierMap = new Map<string, SummaryItem>();

  /*
   * Manual exceptional income + all manual expenses.
   * Booking-linked manual income is intentionally skipped to avoid duplication.
   */
  for (const entry of [
    ...manualIncomeEntries,
    ...manualExpenseEntries,
  ]) {
    const amount = getReportingAmount(entry);
    const direction =
      entry.direction === "INCOME" ? "INCOME" : "EXPENSE";

    const agencyLabel =
      entry.partnerCompanyName ||
      entry.agentNameSnapshot ||
      "Unassigned";

    addToSummary(
      agencyMap,
      agencyLabel,
      agencyLabel,
      direction,
      amount,
    );

    const tourLabel = entry.tour
      ? entry.tour.tourCode
        ? `${entry.tour.tourCode} — ${entry.tour.title}`
        : entry.tour.title
      : entry.customPackageName || "Unlinked Tour / Package";

    addToSummary(
      tourMap,
      tourLabel,
      tourLabel,
      direction,
      amount,
    );

    const groupLabel =
      entry.groupName ||
      entry.customPackageName ||
      "Unassigned Group";

    addToSummary(
      groupMap,
      groupLabel,
      groupLabel,
      direction,
      amount,
    );

    if (direction === "EXPENSE") {
      const supplierLabel =
        entry.vendorName || "Unassigned Supplier / Payer";

      addToSummary(
        supplierMap,
        supplierLabel,
        supplierLabel,
        "EXPENSE",
        amount,
      );
    }
  }

  /*
   * Add automatic booking receivable/income to profitability summaries.
   */
  for (const booking of automaticBookingFinance) {
    const agencyLabel =
      booking.agencyNameSnapshot ||
      booking.agentNameSnapshot ||
      "Unassigned";

    addToSummary(
      agencyMap,
      agencyLabel,
      agencyLabel,
      "INCOME",
      booking.recognizedIncome,
    );

    const tourLabel =
      booking.tourTitleSnapshot || "Unlinked Tour / Package";

    addToSummary(
      tourMap,
      tourLabel,
      tourLabel,
      "INCOME",
      booking.recognizedIncome,
    );

    const groupLabel =
      booking.groupName ||
      booking.bookingDisplayCode ||
      booking.bookingReference;

    addToSummary(
      groupMap,
      groupLabel,
      groupLabel,
      "INCOME",
      booking.recognizedIncome,
    );
  }

  /*
   * Add approved supplier payables to profitability summaries.
   */
  for (const payable of automaticSupplierFinance) {
    const agencyLabel =
      payable.booking?.agencyNameSnapshot ||
      payable.booking?.agentNameSnapshot ||
      "Unassigned";

    addToSummary(
      agencyMap,
      agencyLabel,
      agencyLabel,
      "EXPENSE",
      payable.recognizedExpense,
    );

    const tourLabel = payable.tour
      ? payable.tour.tourCode
        ? `${payable.tour.tourCode} — ${payable.tour.title}`
        : payable.tour.title
      : payable.booking?.tourTitleSnapshot ||
        "Unlinked Tour / Package";

    addToSummary(
      tourMap,
      tourLabel,
      tourLabel,
      "EXPENSE",
      payable.recognizedExpense,
    );

    const groupLabel =
      payable.booking?.groupName ||
      payable.booking?.bookingDisplayCode ||
      payable.booking?.bookingReference ||
      "Unassigned Group";

    addToSummary(
      groupMap,
      groupLabel,
      groupLabel,
      "EXPENSE",
      payable.recognizedExpense,
    );

    const supplierLabel =
      payable.supplierNameSnapshot ||
      payable.supplier?.name ||
      "Unassigned Supplier";

    addToSummary(
      supplierMap,
      supplierLabel,
      supplierLabel,
      "EXPENSE",
      payable.recognizedExpense,
    );
  }

  const topAgency = getTopItem(agencyMap);
  const topTour = getTopItem(tourMap);
  const topGroup = getTopItem(groupMap);

  const topSupplier = Array.from(supplierMap.values()).sort(
    (a, b) => b.expenses - a.expenses,
  )[0];

  const recentEntries = financeEntries.slice(0, 8);

  const recentSupplierPayables = [...automaticSupplierFinance]
    .sort((a, b) => {
      const aDate = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDate = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    })
    .slice(0, 8);

  const overduePayables = automaticSupplierFinance.filter(
    (payable) => payable.isOverdue,
  );

  const overduePayablesTotal = overduePayables.reduce(
    (sum, payable) => sum + payable.pendingPayable,
    0,
  );

  const recentAutomaticBookings = [...automaticBookingFinance]
    .sort((a, b) => {
      const aDate = a.nextDueDate?.getTime() ?? 0;
      const bDate = b.nextDueDate?.getTime() ?? 0;
      return aDate - bDate;
    })
    .slice(0, 8);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Finance Dashboard
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Executive overview of automatic booking receivables, received
            customer payments, approved supplier payables, supplier payments,
            additional expenses, tax, bank position, and profitability.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/payments"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Customer Payments
          </Link>

          <Link
            href="/admin/finance/ledger"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Open Finance Ledger
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Add Additional Expense
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        <strong>Automatic finance is active:</strong> booking payment
        schedules feed Total Income and Pending Receivables; received customer
        payments feed Paid Income; approved supplier payables feed Total
        Expenses and Pending Payables; supplier payments feed Paid Expenses.
        Matching manual booking/supplier expenses are excluded to prevent
        double counting, while standalone additional expenses remain active.
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">
            Estimated Bank Balance
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-800">
            {formatCurrency(
              estimatedBankBalance,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-2 text-xs text-emerald-700">
            Opening EUR balances + received income - paid expenses
          </p>
        </div>

        <div className="rounded-2xl border bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-green-700">
            Total Income
          </p>

          <p className="mt-2 text-3xl font-bold text-green-800">
            {formatCurrency(totalIncome, REPORTING_CURRENCY)}
          </p>

          <p className="mt-2 text-xs text-green-700">
            Automatic scheduled booking income + historical exceptional income
          </p>
        </div>

        <div className="rounded-2xl border bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">
            Total Expenses
          </p>

          <p className="mt-2 text-3xl font-bold text-red-800">
            {formatCurrency(totalExpenses, REPORTING_CURRENCY)}
          </p>

          <p className="mt-2 text-xs text-red-700">
            Approved supplier payables + standalone additional expenses
          </p>
        </div>

        <div className="rounded-2xl border bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Net Profit
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${
              netProfit >= 0
                ? "text-blue-800"
                : "text-red-700"
            }`}
          >
            {formatCurrency(netProfit, REPORTING_CURRENCY)}
          </p>
        </div>

        <div className="rounded-2xl border bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">
            VAT / Tax
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {formatCurrency(totalTax, REPORTING_CURRENCY)}
          </p>

          <p className="mt-2 text-xs text-amber-700">
            Additional-expense tax values for now
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Opening Bank Balance
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-800">
            {formatCurrency(openingBalance, REPORTING_CURRENCY)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {bankAccounts.length > 0
              ? `${bankAccounts.length} active EUR account${
                  bankAccounts.length === 1 ? "" : "s"
                }`
              : "No active EUR bank account"}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Paid Income</p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(paidIncome, REPORTING_CURRENCY)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Received customer payments + historical paid exceptional income
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Paid Expenses
          </p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(paidExpenses, REPORTING_CURRENCY)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Supplier payments + paid standalone additional expenses
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Cash Movement
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              paidIncome - paidExpenses >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {formatCurrency(
              paidIncome - paidExpenses,
              REPORTING_CURRENCY,
            )}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pending Receivables
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(
              pendingIncome,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Open booking installments + historical pending exceptional income
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pending Payables
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(
              pendingExpenses,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Outstanding approved supplier payables + pending additional expenses
          </p>

          {overduePayablesTotal > 0 ? (
            <p className="mt-2 text-xs font-semibold text-red-700">
              Overdue: {formatCurrency(
                overduePayablesTotal,
                REPORTING_CURRENCY,
              )}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Top Agency / Partner
          </p>

          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topAgency?.label || "-"}
          </p>

          <p
            className={`mt-1 text-sm font-medium ${
              topAgency && getResult(topAgency) >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {topAgency
              ? formatCurrency(
                  getResult(topAgency),
                  REPORTING_CURRENCY,
                )
              : formatCurrency(0, REPORTING_CURRENCY)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Top Tour / Package
          </p>

          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topTour?.label || "-"}
          </p>

          <p
            className={`mt-1 text-sm font-medium ${
              topTour && getResult(topTour) >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {topTour
              ? formatCurrency(
                  getResult(topTour),
                  REPORTING_CURRENCY,
                )
              : formatCurrency(0, REPORTING_CURRENCY)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top Group</p>

          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topGroup?.label || "-"}
          </p>

          <p
            className={`mt-1 text-sm font-medium ${
              topGroup && getResult(topGroup) >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {topGroup
              ? formatCurrency(
                  getResult(topGroup),
                  REPORTING_CURRENCY,
                )
              : formatCurrency(0, REPORTING_CURRENCY)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Largest Supplier / Payer
          </p>

          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topSupplier?.label || "-"}
          </p>

          <p className="mt-1 text-sm font-medium text-red-700">
            {topSupplier
              ? formatCurrency(
                  topSupplier.expenses,
                  REPORTING_CURRENCY,
                )
              : formatCurrency(0, REPORTING_CURRENCY)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Automatic Booking Receivables
            </h2>

            <p className="text-sm text-slate-500">
              Booking payment schedules now feed Finance automatically.
            </p>
          </div>

          <Link
            href="/admin/payments"
            className="text-sm font-medium text-[#8B0000] hover:underline"
          >
            Open Payments
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Booking
                </th>
                <th className="px-3 py-3 font-medium">
                  Partner / Group
                </th>
                <th className="px-3 py-3 font-medium">
                  Next Due
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  Scheduled
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  Received
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  Outstanding
                </th>
                <th className="px-3 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {recentAutomaticBookings.map((booking) => {
                const bookingRef =
                  booking.bookingDisplayCode ||
                  booking.bookingReference;

                const party =
                  booking.agencyNameSnapshot ||
                  booking.agentNameSnapshot ||
                  booking.groupName ||
                  "-";

                return (
                  <tr
                    key={booking.id}
                    className="border-t"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#001F3F]">
                        {bookingRef}
                      </div>

                      <div className="mt-1 max-w-72 truncate text-xs text-slate-500">
                        {booking.tourTitleSnapshot}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      {party}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(booking.nextDueDate)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {formatCurrency(
                        booking.scheduledTotal,
                        REPORTING_CURRENCY,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-green-700">
                      {formatCurrency(
                        booking.actualPaid,
                        REPORTING_CURRENCY,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-amber-700">
                      {formatCurrency(
                        booking.pendingReceivable,
                        REPORTING_CURRENCY,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Open Booking
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {recentAutomaticBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No automatic booking receivables yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Automatic Supplier Payables
            </h2>

            <p className="text-sm text-slate-500">
              Approved supplier payables feed expenses automatically; recorded
              supplier payments feed Paid Expenses.
            </p>
          </div>

          <Link
            href="/admin/supplier-payables"
            className="text-sm font-medium text-[#8B0000] hover:underline"
          >
            Open Supplier Payables
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">Supplier</th>
                <th className="px-3 py-3 font-medium">Booking / Tour</th>
                <th className="px-3 py-3 font-medium">Due Date</th>
                <th className="px-3 py-3 text-right font-medium">Approved</th>
                <th className="px-3 py-3 text-right font-medium">Paid</th>
                <th className="px-3 py-3 text-right font-medium">
                  Outstanding
                </th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {recentSupplierPayables.map((payable) => {
                const bookingRef =
                  payable.booking?.bookingDisplayCode ||
                  payable.booking?.bookingReference ||
                  "-";

                const tourLabel = payable.tour
                  ? payable.tour.tourCode
                    ? `${payable.tour.tourCode} — ${payable.tour.title}`
                    : payable.tour.title
                  : payable.booking?.tourTitleSnapshot || "-";

                const supplierLabel =
                  payable.supplierNameSnapshot ||
                  payable.supplier?.name ||
                  "-";

                return (
                  <tr key={payable.id} className="border-t">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#001F3F]">
                        {supplierLabel}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {payable.title}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">{bookingRef}</div>

                      <div className="mt-1 max-w-72 truncate text-xs text-slate-500">
                        {tourLabel}
                      </div>
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-3 ${
                        payable.isOverdue
                          ? "font-semibold text-red-700"
                          : ""
                      }`}
                    >
                      {formatDate(payable.dueDate)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {formatCurrency(
                        payable.recognizedExpense,
                        REPORTING_CURRENCY,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-red-700">
                      {formatCurrency(
                        payable.paidAmount,
                        REPORTING_CURRENCY,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-amber-700">
                      {formatCurrency(
                        payable.pendingPayable,
                        REPORTING_CURRENCY,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          payable.pendingPayable <= 0
                            ? "bg-green-100 text-green-700"
                            : payable.isOverdue
                              ? "bg-red-100 text-red-700"
                              : payable.paidAmount > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {payable.pendingPayable <= 0
                          ? "PAID"
                          : payable.isOverdue
                            ? "OVERDUE"
                            : payable.paidAmount > 0
                              ? "PARTIALLY PAID"
                              : "UNPAID"}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <Link
                        href="/admin/supplier-payables"
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Open Payables
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {recentSupplierPayables.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No approved automatic supplier payables yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#001F3F]">
                Recent Additional Expenses
              </h2>

              <p className="text-sm text-slate-500">
                Additional and exceptional expense records.
              </p>
            </div>

            <Link
              href="/admin/finance/expenses"
              className="text-sm font-medium text-[#8B0000] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-3 font-medium">
                    Date
                  </th>
                  <th className="px-3 py-3 font-medium">
                    Title
                  </th>
                  <th className="px-3 py-3 font-medium">
                    Agency / Group
                  </th>
                  <th className="px-3 py-3 font-medium">
                    Status
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(entry.expenseDate)}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium text-[#001F3F]">
                        {entry.title}
                      </div>

                      {entry.tour ? (
                        <div className="text-xs text-slate-500">
                          {entry.tour.tourCode
                            ? `${entry.tour.tourCode} — ${entry.tour.title}`
                            : entry.tour.title}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {entry.partnerCompanyName ||
                          entry.agentNameSnapshot ||
                          "-"}
                      </div>

                      {entry.groupName ||
                      entry.customPackageName ? (
                        <div className="text-xs text-slate-500">
                          {entry.groupName ||
                            entry.customPackageName}
                        </div>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          entry.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-700"
                            : entry.paymentStatus === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {entry.paymentStatus}
                      </span>
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${
                        entry.direction === "INCOME"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {entry.direction === "INCOME" ? "+" : "-"}
                      {formatCurrency(
                        getReportingAmount(entry),
                        REPORTING_CURRENCY,
                      )}
                    </td>
                  </tr>
                ))}

                {recentEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-sm text-slate-500"
                    >
                      No additional expenses yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Finance Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Quick access to operational finance tools.
          </p>

          <div className="mt-5 grid gap-3">
            <Link
              href="/admin/payments"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Customer Payments
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Review received customer payments and pending agent
                submissions.
              </p>
            </Link>

            <Link
              href="/admin/finance/bank-accounts"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Bank Accounts
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Manage opening balances and active company bank accounts.
              </p>
            </Link>

            <Link
              href="/admin/finance/expenses/create"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Add Additional Expense
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Record bank fees, tax, overhead, reimbursements, staff or
                owner-paid costs, and other exceptional expenses not already
                represented by Supplier Payables.
              </p>
            </Link>

            <Link
              href="/admin/finance/expenses"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Additional Expenses
              </p>

              <p className="mt-1 text-sm text-slate-500">
                View and manage manually entered expenses, overhead,
                reimbursements, bank fees, tax, and other exceptional items.
              </p>
            </Link>

            <Link
              href="/admin/finance/ledger"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Finance Ledger
              </p>

              <p className="mt-1 text-sm text-slate-500">
                View the consolidated record of actual customer receipts,
                supplier payments, additional expense payments, refunds,
                transfers, and adjustments.
              </p>
            </Link>

            <Link
              href="/admin/finance/bank-statements"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Bank Statements
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Import bank statements, review statement lines, and match
                them against posted Bank Ledger transactions.
              </p>
            </Link>

            <Link
              href="/admin/finance/reconciliation"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Bank Reconciliation
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Reconcile Bank Ledger transactions against bank statements,
                verify balances, and lock completed reconciliation periods.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Headline automatic booking and supplier-payable figures currently use
        EUR only; non-EUR receivables/payables should remain in their original
        currency until a proper accounting FX conversion layer is added.
      </p>
    </div>
  );
}
