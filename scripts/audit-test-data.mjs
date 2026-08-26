import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRANSACTIONAL_TABLES = [
  "Quote",
  "QuoteItem",
  "QuoteActivity",

  "Booking",
  "BookingPaymentSchedule",
  "Payment",
  "PaymentAllocation",
  "PaymentSubmission",

  "SalesDocument",
  "SalesDocumentItem",

  "SupplierPayable",
  "SupplierPayablePayment",

  "Expense",
  "Refund",

  "BankTransaction",
  "BankReconciliation",
  "BankStatement",
  "BankStatementLine",

  "FinanceDocument",
  "AccountingPeriod",

  "CashTransaction",

  "OperationItem",
  "TourControl",

  "MassArrangement",

  "FinanceEntry",
  "AgentCommunication",
];

const MASTER_TABLES = [
  "User",
  "PartnerCompany",

  "Supplier",
  "SupplierContact",
  "SupplierService",
  "SupplierRate",
  "SupplierContract",

  "Tour",
  "TourSeasonalPrice",
  "PricingTier",

  "BankAccount",

  "QuoteTemplate",
];

async function tableExists(tableName) {
  const safeTableName = tableName.replace(/'/g, "''");

  const rows = await prisma.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '${safeTableName}'
    ) AS "exists"
  `);

  return Boolean(rows?.[0]?.exists);
}

async function countRows(tableName) {
  const safeTableName = tableName.replace(/"/g, '""');

  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS "count" FROM "${safeTableName}"`
  );

  return Number(rows?.[0]?.count || 0);
}

async function inspectGroup(title, tables) {
  console.log("");
  console.log("======================================================");
  console.log(title);
  console.log("======================================================");

  let total = 0;

  for (const table of tables) {
    const exists = await tableExists(table);

    if (!exists) {
      console.log(`${table.padEnd(30)} NOT PRESENT`);
      continue;
    }

    const count = await countRows(table);
    total += count;

    console.log(`${table.padEnd(30)} ${count}`);
  }

  console.log("------------------------------------------------------");
  console.log(`TOTAL ROWS: ${total}`);

  return total;
}

async function main() {
  console.log("");
  console.log("EPOCH JOURNEYS - TEST DATA AUDIT");
  console.log("READ ONLY - NOTHING WILL BE DELETED");
  console.log("");

  await inspectGroup(
    "TRANSACTION / TEST DATA - CANDIDATES FOR CLEANUP",
    TRANSACTIONAL_TABLES
  );

  await inspectGroup(
    "MASTER DATA - KEEP",
    MASTER_TABLES
  );

  console.log("");
  console.log("Audit completed.");
  console.log("No records were changed or deleted.");
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