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

export default async function AdminFinanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; agency?: string; tour?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = await searchParams;
  const requestedView = params.view === "agency" || params.view === "tour" ? params.view : "overall";
  const selectedAgency = (params.agency || "").trim();
  const selectedTour = (params.tour || "").trim();

  const [financeEntries, bookings, bankAccounts, supplierPayables, customerPayments] =
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

      db.payment.findMany({
        where: {
          currency: REPORTING_CURRENCY,
          status: {
            in: [
              PaymentRecordStatus.RECEIVED,
              PaymentRecordStatus.REFUNDED,
            ],
          },
        },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          reference: true,
          paidAt: true,
          createdAt: true,
          agencyGroupName: true,
          tour: {
            select: {
              id: true,
              title: true,
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
        },
      }),
    ]);

  const getReportingAmount = (
    entry: (typeof financeEntries)[number],
  ) => entry.amount;

  /*
   * Booking-linked manual income is excluded from headline income
   * because booking schedules and payments now feed Finance automatically.
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
   * Keep standalone/manual expenses unless an approved supplier payable
   * represents the same booking + supplier + tour combination.
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
       * Expected income is the confirmed booking sales value.
       * Payment schedules determine collection timing, not the total sale.
       */
      const recognizedIncome = Math.max(booking.totalPrice, 0);

      /*
       * Outstanding receivable is what remains to be collected against
       * the confirmed booking value after actual customer receipts.
       */
      const pendingReceivable = Math.max(
        recognizedIncome - actualPaid,
        0,
      );

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

  /*
   * Standalone customer receipts have no Booking.totalPrice to provide a
   * confirmed sales value. Until they are linked to a booking, use their net
   * received amount as the best available confirmed income fallback.
   *
   * Booking-linked customer payments are NOT added here because their booking
   * total already feeds automaticIncome and adding the receipt again would
   * double-count revenue.
   */
  const standaloneCustomerIncome = customerPayments.reduce(
    (sum, payment) => {
      if (payment.booking) {
        return sum;
      }

      if (payment.status === PaymentRecordStatus.RECEIVED) {
        return sum + payment.amount;
      }

      if (payment.status === PaymentRecordStatus.REFUNDED) {
        return sum - payment.amount;
      }

      return sum;
    },
    0,
  );

  const totalIncome =
    automaticIncome +
    standaloneCustomerIncome +
    manualIncome;

  const automaticExpenses = automaticSupplierFinance.reduce(
    (sum, payable) => sum + payable.recognizedExpense,
    0,
  );

  const manualExpenses = manualExpenseEntries.reduce(
    (sum, entry) => sum + getReportingAmount(entry),
    0,
  );

  const totalExpenses = automaticExpenses + manualExpenses;

  const automaticPaidIncome = customerPayments.reduce(
    (sum, payment) =>
      payment.status === PaymentRecordStatus.RECEIVED
        ? sum + payment.amount
        : payment.status === PaymentRecordStatus.REFUNDED
          ? sum - payment.amount
          : sum,
    0,
  );

  const manualPaidIncome = manualIncomeEntries
    .filter(
      (entry) =>
        entry.paymentStatus === ExpensePaymentStatus.PAID,
    )
    .reduce(
      (sum, entry) => sum + getReportingAmount(entry),
      0,
    );

  const paidIncome =
    automaticPaidIncome + manualPaidIncome;

  const automaticPendingIncome = automaticBookingFinance.reduce(
    (sum, booking) => sum + booking.pendingReceivable,
    0,
  );

  const manualPendingIncome = manualIncomeEntries
    .filter(
      (entry) =>
        entry.paymentStatus === ExpensePaymentStatus.PENDING,
    )
    .reduce(
      (sum, entry) => sum + getReportingAmount(entry),
      0,
    );

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
    .reduce(
      (sum, entry) => sum + getReportingAmount(entry),
      0,
    );

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
    .reduce(
      (sum, entry) => sum + getReportingAmount(entry),
      0,
    );

  const pendingExpenses =
    automaticPendingExpenses + manualPendingExpenses;

  const totalTax = financeEntries
    .filter(
      (entry) =>
        entry.currency === REPORTING_CURRENCY,
    )
    .reduce(
      (sum, entry) => sum + (entry.taxAmount || 0),
      0,
    );

  const netProfit =
    totalIncome - totalExpenses;

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

  for (const entry of [
    ...manualIncomeEntries,
    ...manualExpenseEntries,
  ]) {
    const amount = getReportingAmount(entry);

    const direction =
      entry.direction === "INCOME"
        ? "INCOME"
        : "EXPENSE";

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
      : entry.customPackageName ||
        "Unlinked Tour / Package";

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
        entry.vendorName ||
        "Unassigned Supplier / Payer";

      addToSummary(
        supplierMap,
        supplierLabel,
        supplierLabel,
        "EXPENSE",
        amount,
      );
    }
  }

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
      booking.tourTitleSnapshot ||
      "Unlinked Tour / Package";

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
   * Standalone customer receipts should also feed management summaries.
   * They are excluded once linked to a booking to avoid double counting.
   */
  for (const payment of customerPayments) {
    if (payment.booking) {
      continue;
    }

    const amount =
      payment.status === PaymentRecordStatus.RECEIVED
        ? payment.amount
        : payment.status === PaymentRecordStatus.REFUNDED
          ? -payment.amount
          : 0;

    if (amount === 0) {
      continue;
    }

    const agencyLabel =
      payment.agencyGroupName ||
      "Unassigned";

    addToSummary(
      agencyMap,
      agencyLabel,
      agencyLabel,
      "INCOME",
      amount,
    );

    const tourLabel =
      payment.tour?.title ||
      "Unlinked Tour / Package";

    addToSummary(
      tourMap,
      tourLabel,
      tourLabel,
      "INCOME",
      amount,
    );

    const groupLabel =
      payment.agencyGroupName ||
      "Unassigned Group";

    addToSummary(
      groupMap,
      groupLabel,
      groupLabel,
      "INCOME",
      amount,
    );
  }

  for (const payable of automaticSupplierFinance) {
    const agencyLabel =
      payable.agencyGroupName ||
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
      payable.agencyGroupName ||
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

  type FinancialPosition = {
    key: string;
    label: string;
    expectedIncome: number;
    paidIncome: number;
    pendingIncome: number;
    expectedExpenses: number;
    paidExpenses: number;
    pendingExpenses: number;
  };

  const ensurePosition = (map: Map<string, FinancialPosition>, label: string) => {
    const key = label || "Unassigned";
    const existing = map.get(key);
    if (existing) return existing;
    const created: FinancialPosition = {
      key,
      label: key,
      expectedIncome: 0,
      paidIncome: 0,
      pendingIncome: 0,
      expectedExpenses: 0,
      paidExpenses: 0,
      pendingExpenses: 0,
    };
    map.set(key, created);
    return created;
  };

  const bookingAgencyLabel = (booking: (typeof automaticBookingFinance)[number]) =>
    booking.agencyNameSnapshot || booking.agentNameSnapshot || booking.groupName || "Unassigned Agency / Parish / Group";
  const bookingTourLabel = (booking: (typeof automaticBookingFinance)[number]) =>
    booking.tourTitleSnapshot || "Unlinked Tour / Package";
  const paymentAgencyLabel = (payment: (typeof customerPayments)[number]) =>
    payment.agencyGroupName || payment.booking?.agencyNameSnapshot || payment.booking?.agentNameSnapshot || payment.booking?.groupName || "Unassigned Agency / Parish / Group";
  const paymentTourLabel = (payment: (typeof customerPayments)[number]) =>
    payment.tour?.title || payment.booking?.tourTitleSnapshot || "Unlinked Tour / Package";
  const payableAgencyLabel = (payable: (typeof automaticSupplierFinance)[number]) =>
    payable.agencyGroupName || payable.booking?.agencyNameSnapshot || payable.booking?.agentNameSnapshot || payable.booking?.groupName || "Unassigned Agency / Parish / Group";
  const payableTourLabel = (payable: (typeof automaticSupplierFinance)[number]) =>
    payable.tour ? (payable.tour.tourCode ? `${payable.tour.tourCode} — ${payable.tour.title}` : payable.tour.title) : payable.booking?.tourTitleSnapshot || "Unlinked Tour / Package";
  const entryAgencyLabel = (entry: (typeof financeEntries)[number]) =>
    entry.partnerCompanyName || entry.agentNameSnapshot || entry.groupName || entry.customPackageName || "Unassigned Agency / Parish / Group";
  const entryTourLabel = (entry: (typeof financeEntries)[number]) =>
    entry.tour ? (entry.tour.tourCode ? `${entry.tour.tourCode} — ${entry.tour.title}` : entry.tour.title) : entry.customPackageName || "Unlinked Tour / Package";

  const agencyPositions = new Map<string, FinancialPosition>();
  const tourPositions = new Map<string, FinancialPosition>();

  for (const booking of automaticBookingFinance) {
    for (const position of [ensurePosition(agencyPositions, bookingAgencyLabel(booking)), ensurePosition(tourPositions, bookingTourLabel(booking))]) {
      position.expectedIncome += booking.recognizedIncome;
      position.paidIncome += booking.actualPaid;
      position.pendingIncome += booking.pendingReceivable;
    }
  }

  for (const payment of customerPayments) {
    if (payment.booking) continue;
    const amount = payment.status === PaymentRecordStatus.RECEIVED ? payment.amount : payment.status === PaymentRecordStatus.REFUNDED ? -payment.amount : 0;
    if (!amount) continue;
    for (const position of [ensurePosition(agencyPositions, paymentAgencyLabel(payment)), ensurePosition(tourPositions, paymentTourLabel(payment))]) {
      position.expectedIncome += amount;
      position.paidIncome += amount;
    }
  }

  for (const payable of automaticSupplierFinance) {
    for (const position of [ensurePosition(agencyPositions, payableAgencyLabel(payable)), ensurePosition(tourPositions, payableTourLabel(payable))]) {
      position.expectedExpenses += payable.recognizedExpense;
      position.paidExpenses += payable.paidAmount;
      position.pendingExpenses += payable.pendingPayable;
    }
  }

  for (const entry of [...manualIncomeEntries, ...manualExpenseEntries]) {
    const amount = getReportingAmount(entry);
    const positions = [ensurePosition(agencyPositions, entryAgencyLabel(entry)), ensurePosition(tourPositions, entryTourLabel(entry))];
    for (const position of positions) {
      if (entry.direction === "INCOME") {
        position.expectedIncome += amount;
        if (entry.paymentStatus === ExpensePaymentStatus.PAID) position.paidIncome += amount;
        if (entry.paymentStatus === ExpensePaymentStatus.PENDING) position.pendingIncome += amount;
      } else {
        position.expectedExpenses += amount;
        if (entry.paymentStatus === ExpensePaymentStatus.PAID) position.paidExpenses += amount;
        if (entry.paymentStatus === ExpensePaymentStatus.PENDING) position.pendingExpenses += amount;
      }
    }
  }

  const agencyPositionList = Array.from(agencyPositions.values()).sort((a, b) => a.label.localeCompare(b.label));
  const tourPositionList = Array.from(tourPositions.values()).sort((a, b) => a.label.localeCompare(b.label));
  const selectedPosition = requestedView === "agency" ? agencyPositions.get(selectedAgency) : requestedView === "tour" ? tourPositions.get(selectedTour) : undefined;
  const selectedLabel = requestedView === "agency" ? selectedAgency || "All Agencies / Parishes / Groups" : requestedView === "tour" ? selectedTour || "All Tours / Packages" : "Overall Company";

  const filteredCustomerPayments = requestedView === "overall" || !selectedPosition ? customerPayments : customerPayments.filter((p) => requestedView === "agency" ? paymentAgencyLabel(p) === selectedPosition.key : paymentTourLabel(p) === selectedPosition.key);
  const filteredBookings = requestedView === "overall" || !selectedPosition ? automaticBookingFinance : automaticBookingFinance.filter((b) => requestedView === "agency" ? bookingAgencyLabel(b) === selectedPosition.key : bookingTourLabel(b) === selectedPosition.key);
  const filteredPayables = requestedView === "overall" || !selectedPosition ? automaticSupplierFinance : automaticSupplierFinance.filter((p) => requestedView === "agency" ? payableAgencyLabel(p) === selectedPosition.key : payableTourLabel(p) === selectedPosition.key);
  const filteredEntries = requestedView === "overall" || !selectedPosition ? financeEntries : financeEntries.filter((e) => requestedView === "agency" ? entryAgencyLabel(e) === selectedPosition.key : entryTourLabel(e) === selectedPosition.key);

  const viewExpectedIncome = selectedPosition?.expectedIncome ?? totalIncome;
  const viewPaidIncome = selectedPosition?.paidIncome ?? paidIncome;
  const viewPendingIncome = selectedPosition?.pendingIncome ?? pendingIncome;
  const viewExpectedExpenses = selectedPosition?.expectedExpenses ?? totalExpenses;
  const viewPaidExpenses = selectedPosition?.paidExpenses ?? paidExpenses;
  const viewPendingExpenses = selectedPosition?.pendingExpenses ?? pendingExpenses;
  const viewExpectedNetProfit = viewExpectedIncome - viewExpectedExpenses;
  const viewCashMovement = viewPaidIncome - viewPaidExpenses;

  const topAgency = getTopItem(agencyMap);
  const topTour = getTopItem(tourMap);
  const topGroup = getTopItem(groupMap);

  const topSupplier =
    Array.from(supplierMap.values()).sort(
      (a, b) => b.expenses - a.expenses,
    )[0];

  const recentEntries = filteredEntries.slice(0, requestedView === "overall" ? 8 : 50);

  const recentSupplierPayables =
    filteredPayables
      .filter((payable) => payable.pendingPayable > 0)
      .sort((a, b) => {
        const aDate =
          a.dueDate?.getTime() ??
          Number.MAX_SAFE_INTEGER;

        const bDate =
          b.dueDate?.getTime() ??
          Number.MAX_SAFE_INTEGER;

        return aDate - bDate;
      })
      .slice(0, 8);

  const overduePayables =
    automaticSupplierFinance.filter(
      (payable) => payable.isOverdue,
    );

  const overduePayablesTotal =
    overduePayables.reduce(
      (sum, payable) => sum + payable.pendingPayable,
      0,
    );

  const recentCustomerPayments = filteredCustomerPayments.slice(0, requestedView === "overall" ? 8 : 50);

  const recentAutomaticBookings =
    filteredBookings
      .filter((booking) => booking.pendingReceivable > 0)
      .sort((a, b) => {
        const aDate =
          a.nextDueDate?.getTime() ?? 0;

        const bDate =
          b.nextDueDate?.getTime() ?? 0;

        return aDate - bDate;
      })
      .slice(0, 8);

  return (
    <div className="space-y-8 p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Finance Dashboard
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Executive overview of automatic booking receivables,
            received customer payments, approved supplier payables,
            supplier payments, additional expenses, tax, bank
            position, and profitability.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance/reports"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Reports
          </Link>

          <Link
            href="/admin/finance/reports/accounts-receivable"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Accounts Receivable
          </Link>

          <Link
            href="/admin/finance/ledger"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Ledger
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Add Additional Expense
          </Link>
        </div>
      </div>

      {/* AUTOMATIC FINANCE NOTICE */}

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        <strong>
          Automatic finance is active:
        </strong>{" "}
        confirmed booking sales values feed Expected Income; received
        customer payments feed Paid Income and reduce Pending Income;
        approved supplier payables feed Expected Expenses and Pending
        Expenses; supplier payments feed Paid Expenses. Matching
        manual booking/supplier expenses are excluded to prevent
        double counting, while standalone additional expenses remain
        active.
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">Financial View</h2>
            <p className="mt-1 text-sm text-slate-500">Review the whole company, an Agency / Parish / Group, or a Tour / Package.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/finance" className={`rounded-xl border px-4 py-2 text-sm font-semibold ${requestedView === "overall" ? "border-[#001F3F] bg-[#001F3F] text-white" : "bg-white text-[#001F3F]"}`}>Overall Company</Link>
            <Link href="/admin/finance?view=agency" className={`rounded-xl border px-4 py-2 text-sm font-semibold ${requestedView === "agency" ? "border-[#001F3F] bg-[#001F3F] text-white" : "bg-white text-[#001F3F]"}`}>Agency / Parish / Group</Link>
            <Link href="/admin/finance?view=tour" className={`rounded-xl border px-4 py-2 text-sm font-semibold ${requestedView === "tour" ? "border-[#001F3F] bg-[#001F3F] text-white" : "bg-white text-[#001F3F]"}`}>Tour / Package</Link>
          </div>
        </div>
        {requestedView === "agency" ? <form method="get" className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input type="hidden" name="view" value="agency"/><select name="agency" defaultValue={selectedAgency} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"><option value="">Select Agency / Parish / Group</option>{agencyPositionList.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><button type="submit" className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white">View Financial Position</button></form> : null}
        {requestedView === "tour" ? <form method="get" className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input type="hidden" name="view" value="tour"/><select name="tour" defaultValue={selectedTour} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"><option value="">Select Tour / Package</option>{tourPositionList.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><button type="submit" className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white">View Financial Position</button></form> : null}
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current View</p><p className="mt-1 font-semibold text-[#001F3F]">{selectedLabel}</p>{requestedView !== "overall" && !selectedPosition ? <p className="mt-1 text-xs text-amber-700">Select a record above to display its individual financial position.</p> : null}</div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Real Financial Position — {selectedLabel}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Expected figures show the final commercial result. Paid and pending figures show what has actually moved and what is still outstanding.
            </p>
          </div>

          <div className="text-sm font-semibold text-[#001F3F]">
            Expected Net Profit = Expected Income - Expected Expenses
          </div>
        </div>
      </div>

      {/* MAIN KPI CARDS */}

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
            Expected Income
          </p>

          <p className="mt-2 text-3xl font-bold text-green-800">
            {formatCurrency(
              viewExpectedIncome,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-2 text-xs text-green-700">
            Confirmed booking sales + standalone received income +
            historical exceptional income
          </p>
        </div>

        <div className="rounded-2xl border bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">
            Expected Expenses
          </p>

          <p className="mt-2 text-3xl font-bold text-red-800">
            {formatCurrency(
              viewExpectedExpenses,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-2 text-xs text-red-700">
            Approved supplier payables + standalone additional
            expenses
          </p>
        </div>

        <div className="rounded-2xl border bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Expected Net Profit
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${
              viewExpectedNetProfit >= 0
                ? "text-blue-800"
                : "text-red-700"
            }`}
          >
            {formatCurrency(
              viewExpectedNetProfit,
              REPORTING_CURRENCY,
            )}
          </p>
        </div>

        <div className="rounded-2xl border bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">
            VAT / Tax
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {formatCurrency(
              totalTax,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-2 text-xs text-amber-700">
            Additional-expense tax values for now
          </p>
        </div>
      </section>

      {/* CASH POSITION */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Opening Bank Balance
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-800">
            {formatCurrency(
              openingBalance,
              REPORTING_CURRENCY,
            )}
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
          <p className="text-sm text-slate-500">
            Paid Income
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(
              viewPaidIncome,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Received customer payments + historical paid exceptional
            income
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Paid Expenses
          </p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(
              viewPaidExpenses,
              REPORTING_CURRENCY,
            )}
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
              viewCashMovement >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {formatCurrency(
              viewCashMovement,
              REPORTING_CURRENCY,
            )}
          </p>
        </div>
      </section>

      {/* PENDING / PROFITABILITY */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pending Income
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(
              viewPendingIncome,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Confirmed customer balances still to collect + historical
            pending exceptional income
          </p>

          <Link
            href="/admin/finance/reports/accounts-receivable"
            className="mt-3 inline-block text-xs font-semibold text-[#8B0000] hover:underline"
          >
            View Accounts Receivable
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pending Expenses
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(
              viewPendingExpenses,
              REPORTING_CURRENCY,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Outstanding approved supplier payables + pending
            additional expenses
          </p>

          {overduePayablesTotal > 0 ? (
            <p className="mt-2 text-xs font-semibold text-red-700">
              Overdue:{" "}
              {formatCurrency(
                overduePayablesTotal,
                REPORTING_CURRENCY,
              )}
            </p>
          ) : null}

          <Link
            href="/admin/finance/reports/accounts-payable"
            className="mt-3 inline-block text-xs font-semibold text-[#8B0000] hover:underline"
          >
            View Accounts Payable
          </Link>
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
              : formatCurrency(
                  0,
                  REPORTING_CURRENCY,
                )}
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
              : formatCurrency(
                  0,
                  REPORTING_CURRENCY,
                )}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Top Group
          </p>

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
              : formatCurrency(
                  0,
                  REPORTING_CURRENCY,
                )}
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
              : formatCurrency(
                  0,
                  REPORTING_CURRENCY,
                )}
          </p>
        </div>
      </section>

      {/* RECENT CUSTOMER PAYMENTS */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Recent Customer Payments
            </h2>
            <p className="text-sm text-slate-500">
              Received customer payments posted to the Finance Ledger and Paid Income.
            </p>
          </div>
          <Link
            href="/admin/payments"
            className="text-sm font-medium text-[#8B0000] hover:underline"
          >
            Open Customer Payments
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Booking / Group</th>
                <th className="px-3 py-3 font-medium">Reference</th>
                <th className="px-3 py-3 font-medium">Method</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentCustomerPayments.map((payment) => {
                const bookingRef =
                  payment.booking?.bookingDisplayCode ||
                  payment.booking?.bookingReference ||
                  "-";
                const party =
                  payment.agencyGroupName ||
                  payment.booking?.agencyNameSnapshot ||
                  payment.booking?.agentNameSnapshot ||
                  payment.booking?.groupName ||
                  payment.booking?.tourTitleSnapshot ||
                  payment.tour?.title ||
                  "-";
                const isRefunded =
                  payment.status === PaymentRecordStatus.REFUNDED;

                return (
                  <tr key={payment.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(payment.paidAt || payment.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#001F3F]">{bookingRef}</div>
                      <div className="mt-1 text-xs text-slate-500">{party}</div>
                    </td>
                    <td className="px-3 py-3">{payment.reference || "-"}</td>
                    <td className="px-3 py-3">
                      {payment.method.replaceAll("_", " ")}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isRefunded
                            ? "bg-slate-200 text-slate-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-semibold ${
                        isRefunded ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {isRefunded ? "-" : "+"}
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                  </tr>
                );
              })}

              {recentCustomerPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No received customer payments yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* AUTOMATIC RECEIVABLES */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Outstanding Customer Receivables
            </h2>

            <p className="text-sm text-slate-500">
              Confirmed booking balances still to be collected; schedules show due timing.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/admin/finance/reports/accounts-receivable"
              className="text-sm font-medium text-[#8B0000] hover:underline"
            >
              Accounts Receivable
            </Link>

            <Link
              href="/admin/payments"
              className="text-sm font-medium text-[#8B0000] hover:underline"
            >
              Open Payments
            </Link>
          </div>
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
                  Expected Sale
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
                      {formatDate(
                        booking.nextDueDate,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {formatCurrency(
                        booking.recognizedIncome,
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
                    No outstanding customer receivables.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* SUPPLIER PAYABLES */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Outstanding Supplier Payables
            </h2>

            <p className="text-sm text-slate-500">
              Approved supplier liabilities still to be paid; recorded supplier payments reduce the outstanding balance.
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
                <th className="px-3 py-3 font-medium">
                  Supplier
                </th>

                <th className="px-3 py-3 font-medium">
                  Booking / Tour
                </th>

                <th className="px-3 py-3 font-medium">
                  Due Date
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Approved
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Paid
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Outstanding
                </th>

                <th className="px-3 py-3 font-medium">
                  Status
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Action
                </th>
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
                  : payable.booking?.tourTitleSnapshot ||
                    "-";

                const supplierLabel =
                  payable.supplierNameSnapshot ||
                  payable.supplier?.name ||
                  "-";

                return (
                  <tr
                    key={payable.id}
                    className="border-t"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#001F3F]">
                        {supplierLabel}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {payable.title}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {bookingRef}
                      </div>

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
                      {formatDate(
                        payable.dueDate,
                      )}
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
                    No outstanding approved supplier payables.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* BOTTOM AREA */}

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
                  <tr
                    key={entry.id}
                    className="border-t"
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(
                        entry.expenseDate,
                      )}
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
                      {entry.direction === "INCOME"
                        ? "+"
                        : "-"}

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

        {/* COMPLETE FINANCE NAVIGATION */}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Finance Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete access to Epoch Journeys finance and accounting
            tools.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/finance/reports/accounts-receivable"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Accounts Receivable
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Customer and agent balances, collections and aging.
              </p>
            </Link>

            <Link
              href="/admin/finance/reports/accounts-payable"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Accounts Payable
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Supplier liabilities and outstanding balances.
              </p>
            </Link>

            <Link
              href="/admin/payments"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Customer Payments
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Received payments and pending submissions.
              </p>
            </Link>

            <Link
              href="/admin/supplier-payables"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Supplier Payables
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Supplier invoices, approvals and payments.
              </p>
            </Link>

            <Link
              href="/admin/finance/sales-documents"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Sales Documents
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Quotations, invoices, proformas and credit documents.
              </p>
            </Link>

            <Link
              href="/admin/finance/documents"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Other Accounting Documents
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Upload only documents not already captured through payables, expenses, customer payments or bank statements.
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
                Company accounts and opening balances.
              </p>
            </Link>

            <Link
              href="/admin/finance/bank-transfers"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Bank Transfers
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Record transfers between company accounts.
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
                Import statements and review statement lines.
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
                Match ledger activity with bank statements.
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
                Detailed record of finance transactions.
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
                Overhead, fees, reimbursements and exceptional costs.
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
                Record a new standalone finance expense.
              </p>
            </Link>

            <Link
              href="/admin/finance/profitability"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Profitability
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Analyze profitability by tour and departure.
              </p>
            </Link>

            <Link
              href="/admin/finance/reports"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50 sm:col-span-2"
            >
              <p className="font-semibold text-[#001F3F]">
                Finance Reports
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Accounts receivable, accounts payable, cash and bank,
                due and overdue items, expenses, general ledger,
                management summary, refunds and other financial
                reports.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Headline automatic booking and supplier-payable figures
        currently use EUR only; non-EUR receivables/payables should
        remain in their original currency until a proper accounting
        FX conversion layer is added.
      </p>
    </div>
  );
}