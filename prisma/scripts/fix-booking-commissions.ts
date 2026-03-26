import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    include: {
      user: {
        select: {
          commissionRate: true,
          payoutPerPax: true,
        },
      },
    },
  });

  for (const booking of bookings) {
    const commissionRateSnapshot = booking.user?.commissionRate ?? 0;
    const payoutPerPaxSnapshot = booking.user?.payoutPerPax ?? 0;

    const commissionAmount =
      booking.grossAmount * (commissionRateSnapshot / 100);

    const netAmount = booking.grossAmount - commissionAmount;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        commissionRateSnapshot,
        payoutPerPaxSnapshot,
        commissionAmount,
        netAmount,
      },
    });
  }

  console.log("Booking commissions updated successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });