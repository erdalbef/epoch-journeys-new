import { PrismaClient, PartnerType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "erdal@epochjourneys.com")
    .trim()
    .toLowerCase();

  const password = process.env.ADMIN_PASSWORD || "EpochAdmin_2026!";
  const fullName = process.env.ADMIN_FULLNAME || "Erdal Vardarli";

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: Role.ADMIN,
      approved: true,
      fullName,
      // ✅ must be a valid enum value that exists in your schema NOW
      partnerType: PartnerType.TRAVEL_AGENCY,
    },
    create: {
      email,
      password: hashed,
      role: Role.ADMIN,
      approved: true,
      fullName,
      partnerType: PartnerType.TRAVEL_AGENCY,
    },
  });

  console.log("✅ Admin ready:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });