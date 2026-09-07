import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.financeDocument.findMany({
    where: {
      title: {
        contains: "Atlantic",
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      title: true,
      originalFileName: true,
      storedFileName: true,
      storagePath: true,
      accountingCategory: true,
      type: true,
      updatedAt: true,
    },
  });

  console.dir(docs, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
