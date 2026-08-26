import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function print(title, value) {
  console.log("");
  console.log("======================================================");
  console.log(title);
  console.log("======================================================");
  console.dir(value, {
    depth: null,
    colors: true,
  });
}

async function main() {
  console.log("");
  console.log("EPOCH JOURNEYS - EKSELANS PRESERVATION AUDIT");
  console.log("READ ONLY - NOTHING WILL BE DELETED");
  console.log("");

  // ======================================================
  // 1. FIND EKSELANS AGENT
  // ======================================================

  const agents = await prisma.user.findMany({
    where: {
      OR: [
        {
          travelAgency: {
            contains: "EKSELANS",
            mode: "insensitive",
          },
        },
        {
          billingCompanyName: {
            contains: "EKSLNS",
            mode: "insensitive",
          },
        },
        {
          billingCompanyName: {
            contains: "EKSELANS",
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      travelAgency: true,
      agentCode: true,
      billingCompanyName: true,
      billingContactName: true,
      billingAddress: true,
      billingCity: true,
      billingPostalCode: true,
      billingCountry: true,
      billingTaxNumber: true,
      billingVatNumber: true,
      billingEmail: true,
    },
  });

  print("EKSELANS AGENT RECORD", agents);

  // ======================================================
  // 2. FIND POSSIBLE INVOICE NO. 5
  // ======================================================

  const documents = await prisma.salesDocument.findMany({
    where: {
      OR: [
        {
          documentNumber: {
            contains: "5",
            mode: "insensitive",
          },
        },
        {
          recipientCompany: {
            contains: "EKSLNS",
            mode: "insensitive",
          },
        },
        {
          recipientCompany: {
            contains: "EKSELANS",
            mode: "insensitive",
          },
        },
        {
          recipientEmail: {
            contains: "ekselansturizm",
            mode: "insensitive",
          },
        },
      ],
    },

    include: {
      items: true,
      financeDocument: true,

      booking: {
        include: {
          payments: true,
          paymentSchedules: true,
        },
      },

      payment: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  print(
    "POSSIBLE EKSELANS / INVOICE 5 DOCUMENTS",
    documents
  );

  // ======================================================
  // 3. PRESERVATION SUMMARY
  // ======================================================

  const preservation = documents.map((document) => ({
    salesDocumentId: document.id,
    documentNumber: document.documentNumber,
    type: document.type,
    status: document.status,

    recipientName: document.recipientName,
    recipientCompany: document.recipientCompany,
    recipientEmail: document.recipientEmail,

    issueDate: document.issueDate,
    totalAmount: document.totalAmount,
    amountPaid: document.amountPaid,
    balance: document.balance,

    bookingId: document.bookingId,
    paymentId: document.paymentId,

    financeDocumentId:
      document.financeDocument?.id ?? null,

    salesDocumentItemIds:
      document.items.map(
        (item) => item.id
      ),

    bookingPaymentIds:
      document.booking?.payments?.map(
        (payment) => payment.id
      ) ?? [],

    bookingPaymentScheduleIds:
      document.booking?.paymentSchedules?.map(
        (schedule) => schedule.id
      ) ?? [],
  }));

  print(
    "RECORDS THAT MAY NEED TO BE PRESERVED",
    preservation
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