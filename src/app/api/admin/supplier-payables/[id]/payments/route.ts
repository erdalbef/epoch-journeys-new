import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{ id: string }>;
};

function isMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

export async function POST(request: Request, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    const body = (await request.json()) as {
      amount?: number;
      bankAccountId?: string | null;
      method?: string;
      reference?: string | null;
      notes?: string | null;
    };

    const payable = await db.supplierPayable.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        supplierNameSnapshot: true,
        approvalStatus: true,
        paymentStatus: true,
        currency: true,
        amountPaid: true,
        balance: true,
        approvedAmount: true,
        creditAmount: true,
        bookingId: true,
        tourId: true,
        departureDateId: true,
      },
    });

    if (!payable) {
      return NextResponse.json(
        { error: "Payable not found." },
        { status: 404 },
      );
    }

    if (payable.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "The payable must be approved before payment." },
        { status: 409 },
      );
    }

    if (["PAID", "CANCELLED"].includes(payable.paymentStatus)) {
      return NextResponse.json(
        { error: "This payable is not open for payment." },
        { status: 409 },
      );
    }

    if (!body.method || !isMethod(body.method)) {
      return NextResponse.json(
        { error: "A valid payment method is required." },
        { status: 400 },
      );
    }

    const amount = new Prisma.Decimal(body.amount ?? 0);

    if (amount.lte(0)) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero." },
        { status: 400 },
      );
    }

    if (amount.gt(payable.balance)) {
      return NextResponse.json(
        { error: "Payment cannot exceed the outstanding balance." },
        { status: 400 },
      );
    }

    if (!body.bankAccountId) {
      return NextResponse.json(
        {
          error:
            "Select the bank or cash account used for this supplier payment.",
        },
        { status: 400 },
      );
    }

    const bank = await db.bankAccount.findUnique({
      where: { id: body.bankAccountId },
      select: {
        id: true,
        name: true,
        currency: true,
        isActive: true,
      },
    });

    if (!bank || !bank.isActive) {
      return NextResponse.json(
        { error: "Selected bank account is not available." },
        { status: 400 },
      );
    }

    if (bank.currency !== payable.currency) {
      return NextResponse.json(
        {
          error:
            "Bank account currency must match the payable currency in this version.",
        },
        { status: 400 },
      );
    }

    const reference = body.reference?.trim() || null;
    const notes = body.notes?.trim() || null;
    const paymentDate = new Date();

    const result = await db.$transaction(async (tx) => {
      const payment = await tx.supplierPayablePayment.create({
        data: {
          payableId: payable.id,
          bankAccountId: bank.id,
          recordedById: session.user.id,
          amount,
          currency: payable.currency,
          paymentDate,
          method: body.method as PaymentMethod,
          reference,
          notes,
        },
      });

      const ledgerTransaction = await tx.bankTransaction.create({
        data: {
          bankAccountId: bank.id,
          createdById: session.user.id,

          type: "SUPPLIER_PAYMENT",
          direction: "OUT",
          status: "POSTED",

          amount,
          currency: payable.currency,
          transactionDate: paymentDate,

          reference,
          description: `${payable.supplierNameSnapshot} — ${payable.title}`,
          notes,

          supplierPayablePaymentId: payment.id,
          bookingId: payable.bookingId,
          tourId: payable.tourId,
          departureDateId: payable.departureDateId,
        },
      });

      const nextAmountPaid = payable.amountPaid.plus(amount);

      const nextBalance = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        payable.approvedAmount
          .minus(payable.creditAmount)
          .minus(nextAmountPaid),
      );

      const paymentStatus = nextBalance.lte(0)
        ? "PAID"
        : nextAmountPaid.gt(0)
          ? "PARTIALLY_PAID"
          : "UNPAID";

      const updated = await tx.supplierPayable.update({
        where: { id: payable.id },
        data: {
          amountPaid: nextAmountPaid,
          balance: nextBalance,
          paymentStatus,
        },
      });

      return {
        payment,
        ledgerTransaction,
        updated,
      };
    });

    revalidatePath(`/admin/supplier-payables/${id}`);
    revalidatePath("/admin/supplier-payables");
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/bank-accounts");

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE_SUPPLIER_PAYMENT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record supplier payment.",
      },
      { status: 400 },
    );
  }
}
