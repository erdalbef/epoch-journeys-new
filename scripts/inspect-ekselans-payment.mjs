import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("");
  console.log("EKSELANS PAYMENT / BANK AUDIT");
  console.log("READ ONLY - NOTHING WILL BE DELETED");
  console.log("");

  const payments = await prisma.payment.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log("======================================================");
  console.log("PAYMENTS");
  console.log("======================================================");

  console.dir(
    payments.map((payment) => ({
      id: payment.id,
      bookingId: payment.bookingId,
      amount: payment.amount?.toString(),
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      notes: payment.notes,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })),
    {
      depth: null,
      colors: true,
    }
  );

  const transactions =
    await prisma.bankTransaction.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

  console.log("");
  console.log("======================================================");
  console.log("BANK TRANSACTIONS");
  console.log("======================================================");

  console.dir(
    transactions.map((transaction) => ({
      id: transaction.id,
      bankAccountId: transaction.bankAccountId,
      bookingId: transaction.bookingId,
      paymentId: transaction.paymentId,
      supplierPayablePaymentId:
        transaction.supplierPayablePaymentId,

      type: transaction.type,
      status: transaction.status,

      amount: transaction.amount?.toString(),
      currency: transaction.currency,

      description: transaction.description,
      reference: transaction.reference,

      transactionDate:
        transaction.transactionDate,

      createdAt:
        transaction.createdAt,
    })),
    {
      depth: null,
      colors: true,
    }
  );

  console.log("");
  console.log("Audit completed.");
  console.log("NOTHING WAS CHANGED OR DELETED.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("AUDIT FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });