import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.financeDocument.findMany({
    where: {
      OR: [
        {
          title: {
            contains: "VOUCHER",
            mode: "insensitive",
          },
        },
        {
          originalFileName: {
            contains: "Voucher",
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      originalFileName: true,
      storedFileName: true,
      storagePath: true,
      accountingCategory: true,
      type: true,
      documentDate: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  console.dir(docs, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
