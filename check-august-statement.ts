import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.financeDocument.findMany({
    where: {
      OR: [
        {
          originalFileName: {
            contains: "statement-26.08.01-26.08.31",
            mode: "insensitive",
          },
        },
        {
          title: {
            contains: "AUGUST BANK STATEMENT",
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      originalFileName: true,
      storagePath: true,
      accountingCategory: true,
      type: true,
      documentDate: true,
      accountingPeriodId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.dir(docs, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
