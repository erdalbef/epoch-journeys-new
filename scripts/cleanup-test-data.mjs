import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==========================================================
// REAL RECORD TO PRESERVE
// ==========================================================

const PRESERVE_SALES_DOCUMENT_ID =
  "cmt38trr50001jr04zx8r66hr";

const PRESERVE_DOCUMENT_NUMBER =
  "0000000005";

const PRESERVE_AGENT_ID =
  "cmt1c9itn0000jr04xy2lqdp9";

// ==========================================================
// HELPERS
// ==========================================================

function count(result) {
  return result?.count ?? 0;
}

async function main() {
  console.log("");
  console.log(
    "======================================================"
  );
  console.log(
    "EPOCH JOURNEYS - CONTROLLED TEST DATA CLEANUP"
  );
  console.log(
    "======================================================"
  );
  console.log("");

  console.log("PRESERVING:");
  console.log(
    `Agent ID: ${PRESERVE_AGENT_ID}`
  );
  console.log(
    `Invoice: ${PRESERVE_DOCUMENT_NUMBER}`
  );
  console.log(
    `SalesDocument ID: ${PRESERVE_SALES_DOCUMENT_ID}`
  );
  console.log("");

  // ========================================================
  // SAFETY CHECK
  // ========================================================

  const preservedDocument =
    await prisma.salesDocument.findUnique({
      where: {
        id: PRESERVE_SALES_DOCUMENT_ID,
      },

      include: {
        items: true,
      },
    });

  if (!preservedDocument) {
    throw new Error(
      "STOPPED: EKSELANS Invoice 0000000005 was not found."
    );
  }

  if (
    preservedDocument.documentNumber !==
    PRESERVE_DOCUMENT_NUMBER
  ) {
    throw new Error(
      `STOPPED: Preserved document number is ${preservedDocument.documentNumber}, not ${PRESERVE_DOCUMENT_NUMBER}.`
    );
  }

  if (
    preservedDocument.recipientCompany !==
    "EKSLNS TURİZM ORG.SAN.TİC.LTD.ŞTİ."
  ) {
    throw new Error(
      "STOPPED: Preserved invoice recipient does not match EKSELANS."
    );
  }

  const preservedAgent =
    await prisma.user.findUnique({
      where: {
        id: PRESERVE_AGENT_ID,
      },

      select: {
        id: true,
        travelAgency: true,
        billingCompanyName: true,
      },
    });

  if (!preservedAgent) {
    throw new Error(
      "STOPPED: EKSELANS agent record was not found."
    );
  }

  console.log(
    "Safety check passed."
  );
  console.log(
    `Invoice has ${preservedDocument.items.length} preserved line item(s).`
  );
  console.log("");

  // ========================================================
  // CLEANUP TRANSACTION
  // ========================================================

  const deleted =
    await prisma.$transaction(
      async (tx) => {
        const result = {};

        // ==================================================
        // QUOTE CHILD RECORDS
        // ==================================================

        result.quoteActivity =
          await tx.quoteActivity.deleteMany();

        result.quoteItem =
          await tx.quoteItem.deleteMany();

        // ==================================================
        // FINANCE DOCUMENTS
        //
        // Invoice 5 currently has no FinanceDocument.
        // All existing finance documents are therefore
        // test records and can be cleared.
        // ==================================================

        result.financeDocument =
          await tx.financeDocument.deleteMany();

        // ==================================================
        // BANK STATEMENTS
        // ==================================================

        result.bankStatementLine =
          await tx.bankStatementLine.deleteMany();

        result.bankStatement =
          await tx.bankStatement.deleteMany();

        // ==================================================
        // BANK RECONCILIATION
        // ==================================================

        await tx.bankTransaction.updateMany({
          data: {
            reconciliationId: null,
          },
        });

        result.bankReconciliation =
          await tx.bankReconciliation.deleteMany();

        // ==================================================
        // PAYMENT ALLOCATIONS / SUBMISSIONS
        // ==================================================

        result.paymentAllocation =
          await tx.paymentAllocation.deleteMany();

        result.paymentSubmission =
          await tx.paymentSubmission.deleteMany();

        // ==================================================
        // SALES DOCUMENT ITEMS
        //
        // KEEP the two items belonging to Invoice 5.
        // ==================================================

        result.salesDocumentItem =
          await tx.salesDocumentItem.deleteMany({
            where: {
              salesDocumentId: {
                not:
                  PRESERVE_SALES_DOCUMENT_ID,
              },
            },
          });

        // ==================================================
        // OTHER SALES DOCUMENTS
        //
        // KEEP Invoice 0000000005.
        // ==================================================

        result.salesDocument =
          await tx.salesDocument.deleteMany({
            where: {
              id: {
                not:
                  PRESERVE_SALES_DOCUMENT_ID,
              },
            },
          });

        // ==================================================
        // BANK TRANSACTIONS
        //
        // The audit confirmed all current bank transactions
        // are test booking / supplier / expense transactions.
        // Invoice 5 is not linked to any of them.
        // ==================================================

        result.bankTransaction =
          await tx.bankTransaction.deleteMany();

        // ==================================================
        // SUPPLIER PAYMENTS / PAYABLES
        // ==================================================

        result.supplierPayablePayment =
          await tx.supplierPayablePayment.deleteMany();

        result.supplierPayable =
          await tx.supplierPayable.deleteMany();

        // ==================================================
        // REFUNDS
        // ==================================================

        result.refund =
          await tx.refund.deleteMany();

        // ==================================================
        // CUSTOMER PAYMENTS
        //
        // Both existing payments belong to the test
        // Cappadocia booking.
        // ==================================================

        result.payment =
          await tx.payment.deleteMany();

        // ==================================================
        // EXPENSES
        // ==================================================

        result.expense =
          await tx.expense.deleteMany();

        // ==================================================
        // CASH TRANSACTIONS
        // ==================================================

        result.cashTransaction =
          await tx.cashTransaction.deleteMany();

        // ==================================================
        // MASS ARRANGEMENTS
        // ==================================================

        result.massArrangement =
          await tx.massArrangement.deleteMany();

        // ==================================================
        // TOUR CONTROL
        // ==================================================

        result.tourControl =
          await tx.tourControl.deleteMany();

        // ==================================================
        // BOOKING PAYMENT SCHEDULE
        // ==================================================

        result.bookingPaymentSchedule =
          await tx.bookingPaymentSchedule.deleteMany();

        // ==================================================
        // BOOKINGS
        // ==================================================

        result.booking =
          await tx.booking.deleteMany();

        // ==================================================
        // QUOTES
        // ==================================================

        result.quote =
          await tx.quote.deleteMany();

        // ==================================================
        // FINANCE ENTRY
        // ==================================================

        result.financeEntry =
          await tx.financeEntry.deleteMany();

        // ==================================================
        // AGENT COMMUNICATIONS
        // ==================================================

        result.agentCommunication =
          await tx.agentCommunication.deleteMany();

        // ==================================================
        // ACCOUNTING PERIODS
        //
        // These currently contain test accounting activity.
        // Invoice 5 has no linked FinanceDocument, so the
        // periods are not required to preserve the invoice.
        // ==================================================

        result.accountingPeriod =
          await tx.accountingPeriod.deleteMany();

        return result;
      },
      {
        maxWait: 10000,
        timeout: 60000,
      }
    );

  // ========================================================
  // VERIFY PRESERVED RECORD AFTER CLEANUP
  // ========================================================

  const verifyInvoice =
    await prisma.salesDocument.findUnique({
      where: {
        id: PRESERVE_SALES_DOCUMENT_ID,
      },

      include: {
        items: true,
      },
    });

  const verifyAgent =
    await prisma.user.findUnique({
      where: {
        id: PRESERVE_AGENT_ID,
      },

      select: {
        id: true,
        travelAgency: true,
        billingCompanyName: true,
      },
    });

  if (!verifyInvoice) {
    throw new Error(
      "CRITICAL: Cleanup completed but preserved invoice could not be found."
    );
  }

  if (!verifyAgent) {
    throw new Error(
      "CRITICAL: Cleanup completed but EKSELANS agent could not be found."
    );
  }

  // ========================================================
  // RESULTS
  // ========================================================

  console.log("");
  console.log(
    "======================================================"
  );
  console.log(
    "DELETED TEST RECORDS"
  );
  console.log(
    "======================================================"
  );

  let totalDeleted = 0;

  for (
    const [table, value]
    of Object.entries(deleted)
  ) {
    const deletedCount =
      count(value);

    totalDeleted +=
      deletedCount;

    console.log(
      `${table.padEnd(32)} ${deletedCount}`
    );
  }

  console.log("");
  console.log(
    `TOTAL DELETED: ${totalDeleted}`
  );

  console.log("");
  console.log(
    "======================================================"
  );
  console.log(
    "PRESERVED SUCCESSFULLY"
  );
  console.log(
    "======================================================"
  );

  console.log(
    `Agent: ${verifyAgent.travelAgency}`
  );

  console.log(
    `Legal name: ${
      verifyAgent.billingCompanyName ||
      "-"
    }`
  );

  console.log(
    `Invoice: ${verifyInvoice.documentNumber}`
  );

  console.log(
    `Status: ${verifyInvoice.status}`
  );

  console.log(
    `Recipient: ${verifyInvoice.recipientCompany}`
  );

  console.log(
    `Invoice items: ${verifyInvoice.items.length}`
  );

  console.log("");
  console.log(
    "Master suppliers, agents, tours, supplier rates and bank account were not deleted."
  );
  console.log("");
  console.log(
    "Cleanup completed successfully."
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "CLEANUP FAILED"
    );
    console.error("");
    console.error(error);
    console.error("");
    console.error(
      "If the failure occurred inside the database transaction, the transaction was rolled back."
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });