import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const documents =
    await prisma.financeDocument.findMany({
      where: {
        NOT: {
          storagePath: {
            startsWith: "http",
          },
        },
      },

      select: {
        id: true,
        title: true,
        originalFileName: true,
        storagePath: true,
        accountingCategory: true,
        accountingPeriod: {
          select: {
            year: true,
            month: true,
          },
        },
        createdAt: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  console.log("");
  console.log("========================================");
  console.log("LEGACY FINANCE STORAGE AUDIT");
  console.log("========================================");
  console.log("");

  if (documents.length === 0) {
    console.log("No legacy FinanceDocument storage paths found.");
    console.log("");
    return;
  }

  console.log(
    `Found ${documents.length} legacy FinanceDocument record(s).`,
  );

  console.log("");

  for (const document of documents) {
    const period =
      document.accountingPeriod
        ? `${document.accountingPeriod.year}-${String(
            document.accountingPeriod.month,
          ).padStart(2, "0")}`
        : "No accounting period";

    console.log("----------------------------------------");
    console.log(`ID: ${document.id}`);
    console.log(`Title: ${document.title}`);
    console.log(
      `File: ${document.originalFileName}`,
    );
    console.log(
      `Storage Path: ${document.storagePath}`,
    );
    console.log(
      `Category: ${document.accountingCategory ?? "N/A"}`,
    );
    console.log(`Period: ${period}`);
    console.log(
      `Created: ${document.createdAt.toISOString()}`,
    );
  }

  console.log("");
  console.log("========================================");
  console.log(
    `TOTAL LEGACY RECORDS: ${documents.length}`,
  );
  console.log("========================================");
  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "FINANCE_STORAGE_AUDIT_ERROR",
      error,
    );
  })
  .finally(async () => {
    await prisma.$disconnect();
  });