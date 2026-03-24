import { PrismaClient, Season } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeSeason(value: string | null | undefined): Season {
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized.includes("LOW")) return "LOW";
  if (normalized.includes("SHOULDER")) return "SHOULDER";
  if (normalized.includes("HIGH")) return "HIGH";
  if (normalized.includes("PEAK")) return "PEAK";

  return "SHOULDER";
}

async function main() {
  const departures = await prisma.departureDate.findMany({
    select: {
      id: true,
      season: true,
    },
  });

  for (const departure of departures) {
    await prisma.departureDate.update({
      where: { id: departure.id },
      data: {
        season: normalizeSeason(departure.season),
      },
    });
  }

  const bookings = await prisma.booking.findMany({
    select: {
      id: true,
      seasonSnapshot: true,
    },
  });

  for (const booking of bookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        seasonSnapshot: normalizeSeason(booking.seasonSnapshot),
      },
    });
  }

  console.log("Season migration completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });