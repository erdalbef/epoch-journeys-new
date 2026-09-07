import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.financeDocument.findMany({
    where: {
      OR: [
        {
          title: {
            contains: "ERDAL VARDARLI",
            mode: "insensitive",
          },
        },
        {
          originalFileName: {
            contains: "ERDAL VARDARLI",
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      originalFileName: true,
      storedFileName: true,
      storagePath: true,
      accountingCategory: true,
      accountingSubcategory: true,
      type: true,
      documentDate: true,
      referenceNumber: true,
      accountingPeriodId: true,
      bankTransactionId: true,
      bankAccountId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.dir(docs, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
