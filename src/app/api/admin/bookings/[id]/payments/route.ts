import React from "react";
import fs from "fs/promises";
import path from "path";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  AccountingCategory,
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  BookingInstallmentStatus,
  BookingInstallmentType,
  FinanceDocumentType,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  CustomerPaymentRecordPdf,
  type CustomerPaymentRecordPdfData,
} from "@/lib/pdf/CustomerPaymentRecordPdf";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AllocationInput = {
  paymentScheduleId: string;
  amount: number;
};

function isValidPaymentMethod(
  value: string,
): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(
    value as PaymentMethod,
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function getInstallmentStatus(
  amount: number,
  amountPaid: number,
  dueDate: Date,
): BookingInstallmentStatus {
  const now = new Date();

  if (amountPaid <= 0) {
    return dueDate < now
      ? BookingInstallmentStatus.OVERDUE
      : BookingInstallmentStatus.PENDING;
  }

  if (amountPaid < amount) {
    return dueDate < now
      ? BookingInstallmentStatus.OVERDUE
      : BookingInstallmentStatus.PARTIALLY_PAID;
  }

  return BookingInstallmentStatus.PAID;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function safeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .trim();
}

function isAdvanceType(
  type: BookingInstallmentType,
) {
  return (
    type === BookingInstallmentType.DEPOSIT_1 ||
    type === BookingInstallmentType.DEPOSIT_2 ||
    type === BookingInstallmentType.DEPOSIT_3 ||
    type === BookingInstallmentType.CUSTOM
  );
}

function paymentAccountingSubcategory(
  allocationTypes: BookingInstallmentType[],
) {
  if (allocationTypes.length === 0) {
    return "Customer Advances";
  }

  const onlyFinal = allocationTypes.every(
    (type) =>
      type === BookingInstallmentType.FINAL,
  );

  if (onlyFinal) {
    return "Customer Payments";
  }

  return "Customer Advances";
}

function paymentRecordTitle(
  allocationTypes: BookingInstallmentType[],
) {
  const subcategory =
    paymentAccountingSubcategory(
      allocationTypes,
    );

  return subcategory === "Customer Payments"
    ? "Customer Payment Record"
    : "Customer Advance / Deposit Record";
}

async function createPaymentAccountingDocument(input: {
  paymentId: string;
  bankTransactionId: string;
  bookingId: string;
  tourId: string;
  departureDateId: string | null;
  bankAccountId: string;
  bankAccountName: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: Date;
  receivedBy: string | null;
  bookingReference: string;
  tourTitle: string;
  groupName: string | null;
  customerName: string | null;
  agencyName: string | null;
  bookingTotal: number;
  amountPaidAfter: number;
  amountDueAfter: number;
  allocations: Array<{
    type: BookingInstallmentType;
    title: string;
    dueDate: Date;
    amount: number;
  }>;
}) {
  const existing =
    await db.financeDocument.findUnique({
      where: {
        paymentId:
          input.paymentId,
      },
      select: {
        id: true,
      },
    });

  if (existing) {
    return existing;
  }

  const allocationTypes =
    input.allocations.map(
      (allocation) =>
        allocation.type,
    );

  const subcategory =
    paymentAccountingSubcategory(
      allocationTypes,
    );

  const recordTitle =
    paymentRecordTitle(
      allocationTypes,
    );

  const year =
    input.paidAt.getUTCFullYear();

  const month =
    input.paidAt.getUTCMonth() + 1;

  const monthFolder =
    String(month).padStart(
      2,
      "0",
    );

  const bookingFilePart =
    safeFileName(
      input.bookingReference,
    ) || "booking";

  const storedFileName =
    `${bookingFilePart}-payment-${input.paymentId}.pdf`;

  const relativeStoragePath =
    `/uploads/accounting/${year}/${monthFolder}/02-sales-income/${storedFileName}`;

  const absoluteDirectory =
    path.join(
      process.cwd(),
      "public",
      "uploads",
      "accounting",
      String(year),
      monthFolder,
      "02-sales-income",
    );

  const absoluteFilePath =
    path.join(
      absoluteDirectory,
      storedFileName,
    );

  const pdfData: CustomerPaymentRecordPdfData = {
    recordTitle,
    paymentId:
      input.paymentId,
    bookingReference:
      input.bookingReference,
    tourTitle:
      input.tourTitle,
    groupName:
      input.groupName,
    customerName:
      input.customerName,
    agencyName:
      input.agencyName,
    paymentDate:
      formatDate(
        input.paidAt,
      ),
    amount:
      input.amount,
    currency:
      input.currency,
    paymentMethod:
      input.method,
    paymentReference:
      input.reference,
    bankAccountName:
      input.bankAccountName,
    receivedBy:
      input.receivedBy,
    notes:
      input.notes,
    bookingTotal:
      input.bookingTotal,
    amountPaidAfter:
      input.amountPaidAfter,
    amountDueAfter:
      input.amountDueAfter,
    allocations:
      input.allocations.map(
        (allocation) => ({
          type:
            allocation.type,
          title:
            allocation.title,
          dueDate:
            formatDate(
              allocation.dueDate,
            ),
          amount:
            allocation.amount,
        }),
      ),
  };

  const pdfElement =
    React.createElement(
      CustomerPaymentRecordPdf,
      {
        data: pdfData,
      },
    ) as Parameters<
      typeof renderToBuffer
    >[0];

  const rendered =
    await renderToBuffer(
      pdfElement,
    );

  const pdfBuffer =
    Buffer.from(
      rendered,
    );

  await fs.mkdir(
    absoluteDirectory,
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    absoluteFilePath,
    pdfBuffer,
  );

  try {
    const financeDocument =
      await db.$transaction(
        async (tx) => {
          const period =
            await tx.accountingPeriod.upsert({
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
              },
              select: {
                id: true,
              },
            });

          return tx.financeDocument.create({
            data: {
              type:
                FinanceDocumentType.CUSTOMER_PAYMENT_PROOF,

              title:
                `${recordTitle} - ${input.bookingReference}`,

              description:
                "Automatically generated accounting support document for a received customer payment.",

              originalFileName:
                storedFileName,

              storedFileName,

              storagePath:
                relativeStoragePath,

              mimeType:
                "application/pdf",

              fileSize:
                pdfBuffer.length,

              documentDate:
                input.paidAt,

              referenceNumber:
                input.reference ||
                input.paymentId,

              notes:
                `Payment classification: ${subcategory}.`,

              paymentId:
                input.paymentId,

              bankTransactionId:
                input.bankTransactionId,

              bookingId:
                input.bookingId,

              tourId:
                input.tourId,

              departureDateId:
                input.departureDateId,

              bankAccountId:
                input.bankAccountId,

              uploadedById:
                input.userId,

              accountingCategory:
                AccountingCategory.SALES_INCOME,

              accountingPeriodId:
                period.id,

              accountingSubcategory:
                subcategory,
            },
            select: {
              id: true,
              accountingCategory:
                true,
              accountingSubcategory:
                true,
              storagePath:
                true,
              accountingPeriod: {
                select: {
                  year: true,
                  month: true,
                },
              },
            },
          });
        },
      );

    return financeDocument;
  } catch (error) {
    try {
      await fs.unlink(
        absoluteFilePath,
      );
    } catch {
      // Preserve the database error.
    }

    throw error;
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id: bookingId } =
      await context.params;

    const body =
      (await request.json()) as {
        amount?: number;
        currency?: string;
        method?: string;
        status?: string;
        reference?: string;
        notes?: string;
        paidAt?: string | null;
        bankAccountId?: string;
        allocations?: AllocationInput[];
      };

    const booking =
      await db.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          payments: {
            select: {
              amount: true,
              status: true,
            },
          },
          paymentSchedules: {
            orderBy: [
              {
                dueDate: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
            include: {
              allocations: true,
            },
          },
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking not found.",
        },
        {
          status: 404,
        },
      );
    }

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : Number(body.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    const currency =
      typeof body.currency ===
        "string" &&
      body.currency.trim()
        ? body.currency
            .trim()
            .toUpperCase()
        : booking.currency;

    if (
      currency !==
      booking.currency
    ) {
      return NextResponse.json(
        {
          error:
            `Payment currency must match the booking currency (${booking.currency}).`,
        },
        {
          status: 400,
        },
      );
    }

    if (
      !body.method ||
      !isValidPaymentMethod(
        body.method,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment method.",
        },
        {
          status: 400,
        },
      );
    }

    const paymentStatus =
      PaymentRecordStatus.RECEIVED;

    const paidAt =
      typeof body.paidAt ===
        "string" &&
      body.paidAt.trim()
        ? new Date(
            `${body.paidAt}T12:00:00.000Z`,
          )
        : new Date();

    if (
      Number.isNaN(
        paidAt.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment date.",
        },
        {
          status: 400,
        },
      );
    }

    const bankAccountId =
      typeof body.bankAccountId ===
        "string" &&
      body.bankAccountId.trim()
        ? body.bankAccountId.trim()
        : null;

    if (!bankAccountId) {
      return NextResponse.json(
        {
          error:
            "Select the bank account that received the payment.",
        },
        {
          status: 400,
        },
      );
    }

    const bankAccount =
      await db.bankAccount.findUnique({
        where: {
          id:
            bankAccountId,
        },
        select: {
          id: true,
          name: true,
          currency: true,
          isActive: true,
        },
      });

    if (
      !bankAccount ||
      !bankAccount.isActive
    ) {
      return NextResponse.json(
        {
          error:
            "Selected bank account is not available.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      bankAccount.currency !==
      currency
    ) {
      return NextResponse.json(
        {
          error:
            `Bank account currency (${bankAccount.currency}) must match payment currency (${currency}).`,
        },
        {
          status: 400,
        },
      );
    }

    const alreadyReceived =
      booking.payments
        .filter(
          (payment) =>
            payment.status ===
            PaymentRecordStatus.RECEIVED,
        )
        .reduce(
          (sum, payment) =>
            sum +
            payment.amount,
          0,
        );

    const refunded =
      booking.payments
        .filter(
          (payment) =>
            payment.status ===
            PaymentRecordStatus.REFUNDED,
        )
        .reduce(
          (sum, payment) =>
            sum +
            payment.amount,
          0,
        );

    const actualPaidBefore =
      Math.max(
        alreadyReceived -
          refunded,
        0,
      );

    const actualOutstanding =
      Math.max(
        booking.totalPrice -
          actualPaidBefore,
        0,
      );

    if (
      amount >
      actualOutstanding +
        0.000001
    ) {
      return NextResponse.json(
        {
          error:
            `Payment exceeds the actual outstanding booking balance of ${actualOutstanding.toFixed(
              2,
            )} ${currency}.`,
        },
        {
          status: 400,
        },
      );
    }

    const rawAllocations =
      Array.isArray(
        body.allocations,
      )
        ? body.allocations
        : [];

    const cleanedAllocations =
      rawAllocations
        .filter(
          (item) =>
            item &&
            typeof item.paymentScheduleId ===
              "string" &&
            item.paymentScheduleId.trim() !==
              "" &&
            typeof item.amount ===
              "number" &&
            Number.isFinite(
              item.amount,
            ) &&
            item.amount > 0,
        )
        .map(
          (item) => ({
            paymentScheduleId:
              item.paymentScheduleId.trim(),
            amount:
              round2(
                item.amount,
              ),
          }),
        );

    const openSchedules =
      booking.paymentSchedules.filter(
        (schedule) =>
          schedule.status !==
          BookingInstallmentStatus.CANCELLED,
      );

    const scheduleMap =
      new Map(
        booking.paymentSchedules.map(
          (schedule) => [
            schedule.id,
            schedule,
          ],
        ),
      );

    const seen =
      new Set<string>();

    for (
      const allocation of
      cleanedAllocations
    ) {
      if (
        seen.has(
          allocation.paymentScheduleId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Each installment can only be selected once.",
          },
          {
            status: 400,
          },
        );
      }

      seen.add(
        allocation.paymentScheduleId,
      );

      const schedule =
        scheduleMap.get(
          allocation.paymentScheduleId,
        );

      if (
        !schedule ||
        schedule.status ===
          BookingInstallmentStatus.CANCELLED
      ) {
        return NextResponse.json(
          {
            error:
              "One or more selected installments are invalid.",
          },
          {
            status: 400,
          },
        );
      }

      const currentAllocated =
        schedule.allocations.reduce(
          (sum, existing) =>
            sum +
            existing.amount,
          0,
        );

      const remainingBalance =
        Math.max(
          schedule.amount -
            currentAllocated,
          0,
        );

      if (
        allocation.amount >
        remainingBalance +
          0.000001
      ) {
        return NextResponse.json(
          {
            error:
              "Allocation exceeds the remaining balance of an installment.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const allocatedTotal =
      cleanedAllocations.reduce(
        (sum, allocation) =>
          sum +
          allocation.amount,
        0,
      );

    if (
      openSchedules.length >
        0 &&
      Math.abs(
        allocatedTotal -
          amount,
      ) >
        0.009
    ) {
      return NextResponse.json(
        {
          error:
            "When a payment schedule exists, the received payment must be fully allocated.",
        },
        {
          status: 400,
        },
      );
    }

    const reference =
      typeof body.reference ===
        "string" &&
      body.reference.trim()
        ? body.reference.trim()
        : null;

    const notes =
      typeof body.notes ===
        "string" &&
      body.notes.trim()
        ? body.notes.trim()
        : null;

    const receivedBy =
      session.user.name ||
      session.user.email ||
      "Admin";

    const result =
      await db.$transaction(
        async (tx) => {
          const payment =
            await tx.payment.create({
              data: {
                bookingId,
                amount,
                currency,
                method:
                  body.method as PaymentMethod,
                status:
                  paymentStatus,
                reference,
                notes,
                paidAt,
                receivedBy,
              },
            });

          if (
            cleanedAllocations.length >
            0
          ) {
            await tx.paymentAllocation.createMany({
              data:
                cleanedAllocations.map(
                  (allocation) => ({
                    paymentId:
                      payment.id,
                    paymentScheduleId:
                      allocation.paymentScheduleId,
                    amount:
                      allocation.amount,
                  }),
                ),
            });
          }

          const ledgerTransaction =
            await tx.bankTransaction.create({
              data: {
                bankAccountId,
                createdById:
                  session.user.id,
                type:
                  BankTransactionType.CUSTOMER_RECEIPT,
                direction:
                  BankTransactionDirection.IN,
                status:
                  BankTransactionStatus.POSTED,
                amount,
                currency,
                transactionDate:
                  paidAt,
                reference,
                description:
                  `Customer receipt - ${
                    booking.bookingDisplayCode ||
                    booking.bookingReference
                  } - ${booking.tourTitleSnapshot}`,
                notes,
                bookingId:
                  booking.id,
                paymentId:
                  payment.id,
                tourId:
                  booking.tourId,
                departureDateId:
                  booking.departureDateId,
              },
            });

          const refreshedSchedules =
            await tx.bookingPaymentSchedule.findMany({
              where: {
                bookingId,
              },
              include: {
                allocations: {
                  orderBy: {
                    allocatedAt:
                      "asc",
                  },
                },
              },
              orderBy: [
                {
                  dueDate:
                    "asc",
                },
                {
                  createdAt:
                    "asc",
                },
              ],
            });

          for (
            const schedule of
            refreshedSchedules
          ) {
            const schedulePaid =
              round2(
                schedule.allocations.reduce(
                  (
                    sum,
                    allocation,
                  ) =>
                    sum +
                    allocation.amount,
                  0,
                ),
              );

            const nextStatus =
              schedule.status ===
              BookingInstallmentStatus.CANCELLED
                ? BookingInstallmentStatus.CANCELLED
                : getInstallmentStatus(
                    schedule.amount,
                    schedulePaid,
                    schedule.dueDate,
                  );

            const latestAllocation =
              schedule.allocations.length >
              0
                ? schedule.allocations[
                    schedule.allocations
                      .length - 1
                  ]
                : null;

            await tx.bookingPaymentSchedule.update({
              where: {
                id:
                  schedule.id,
              },
              data: {
                amountPaid:
                  schedulePaid,
                status:
                  nextStatus,
                paidAt:
                  nextStatus ===
                  BookingInstallmentStatus.PAID
                    ? latestAllocation
                        ?.allocatedAt ??
                      paidAt
                    : null,
              },
            });
          }

          const allPayments =
            await tx.payment.findMany({
              where: {
                bookingId,
              },
              select: {
                amount:
                  true,
                status:
                  true,
              },
            });

          const receivedTotal =
            allPayments
              .filter(
                (existing) =>
                  existing.status ===
                  PaymentRecordStatus.RECEIVED,
              )
              .reduce(
                (
                  sum,
                  existing,
                ) =>
                  sum +
                  existing.amount,
                0,
              );

          const refundedTotal =
            allPayments
              .filter(
                (existing) =>
                  existing.status ===
                  PaymentRecordStatus.REFUNDED,
              )
              .reduce(
                (
                  sum,
                  existing,
                ) =>
                  sum +
                  existing.amount,
                0,
              );

          const effectivePaid =
            round2(
              Math.max(
                receivedTotal -
                  refundedTotal,
                0,
              ),
            );

          const amountDue =
            round2(
              Math.max(
                booking.totalPrice -
                  effectivePaid,
                0,
              ),
            );

          let bookingPaymentStatus:
            PaymentStatus;

          if (
            effectivePaid <=
            0
          ) {
            bookingPaymentStatus =
              PaymentStatus.UNPAID;
          } else if (
            amountDue >
            0
          ) {
            bookingPaymentStatus =
              PaymentStatus.PARTIALLY_PAID;
          } else {
            bookingPaymentStatus =
              PaymentStatus.PAID;
          }

          const nextDueSchedule =
            await tx.bookingPaymentSchedule.findFirst({
              where: {
                bookingId,
                status: {
                  in: [
                    BookingInstallmentStatus.PENDING,
                    BookingInstallmentStatus.PARTIALLY_PAID,
                    BookingInstallmentStatus.OVERDUE,
                  ],
                },
              },
              orderBy: {
                dueDate:
                  "asc",
              },
              select: {
                dueDate:
                  true,
              },
            });

          await tx.booking.update({
            where: {
              id:
                bookingId,
            },
            data: {
              amountPaid:
                effectivePaid,
              amountDue,
              paymentStatus:
                bookingPaymentStatus,
              paymentDueDate:
                nextDueSchedule?.dueDate ??
                null,
            },
          });

          return {
            payment,
            ledgerTransaction,
            amountPaid:
              effectivePaid,
            amountDue,
            paymentStatus:
              bookingPaymentStatus,
          };
        },
      );

    const accountingAllocations =
      cleanedAllocations.map(
        (allocation) => {
          const schedule =
            scheduleMap.get(
              allocation.paymentScheduleId,
            );

          if (!schedule) {
            throw new Error(
              "Payment schedule could not be loaded for accounting classification.",
            );
          }

          return {
            type:
              schedule.type,
            title:
              schedule.title ||
              schedule.type
                .replaceAll(
                  "_",
                  " ",
                )
                .toLowerCase()
                .replace(
                  /\b\w/g,
                  (
                    character,
                  ) =>
                    character.toUpperCase(),
                ),
            dueDate:
              schedule.dueDate,
            amount:
              allocation.amount,
          };
        },
      );

    let accountingDocument:
      Awaited<
        ReturnType<
          typeof createPaymentAccountingDocument
        >
      > | null =
      null;

    let accountingWarning:
      string | null =
      null;

    try {
      accountingDocument =
        await createPaymentAccountingDocument({
          paymentId:
            result.payment.id,
          bankTransactionId:
            result.ledgerTransaction.id,
          bookingId:
            booking.id,
          tourId:
            booking.tourId,
          departureDateId:
            booking.departureDateId,
          bankAccountId:
            bankAccount.id,
          bankAccountName:
            bankAccount.name,
          userId:
            session.user.id,
          amount,
          currency,
          method:
            body.method as PaymentMethod,
          reference,
          notes,
          paidAt,
          receivedBy,
          bookingReference:
            booking.bookingDisplayCode ||
            booking.bookingReference,
          tourTitle:
            booking.tourTitleSnapshot,
          groupName:
            booking.groupName,
          customerName:
            booking.customerName ||
            booking.groupLeaderName,
          agencyName:
            booking.agencyNameSnapshot,
          bookingTotal:
            booking.totalPrice,
          amountPaidAfter:
            result.amountPaid,
          amountDueAfter:
            result.amountDue,
          allocations:
            accountingAllocations,
        });
    } catch (error) {
      console.error(
        "CREATE_CUSTOMER_PAYMENT_ACCOUNTING_DOCUMENT_ERROR",
        error,
      );

      accountingWarning =
        error instanceof Error
          ? error.message
          : "The payment was recorded, but the accounting support PDF could not be created.";
    }

    return NextResponse.json(
      {
        success: true,
        ...result,
        accountingDocument,
        accountingWarning,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/admin/bookings/[id]/payments error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to record customer payment.",
      },
      {
        status: 500,
      },
    );
  }
}
