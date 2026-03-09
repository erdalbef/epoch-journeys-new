import { PrismaClient } from "@prisma/client";
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
      role: "ADMIN",
      approved: true,
      fullName,
      partnerType: "TRAVEL_AGENCY",
    },
    create: {
      email,
      password: hashed,
      role: "ADMIN",
      approved: true,      
      status: "ACTIVE",
      fullName,
      partnerType: "TRAVEL_AGENCY",
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