/// <reference types="node" />
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const departures = await prisma.departureDate.findMany({
    select: {
      id: true,
      price: true,
      priceDouble: true,
    },
  });

  console.log(`Found ${departures.length} departures`);

  for (const departure of departures) {
    if (departure.priceDouble == null && departure.price != null) {
      await prisma.departureDate.update({
        where: { id: departure.id },
        data: {
          priceDouble: departure.price,
        },
      });

      console.log(`Updated departure ${departure.id}`);
    }
  }

  console.log("✅ Backfill complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });