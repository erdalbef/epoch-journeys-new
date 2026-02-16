// scripts/create-admin.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function genTempPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/\+/g, "0").replace(/\//g, "0");
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "erdal@epochjourneys.com";
  const password = process.env.ADMIN_PASSWORD || genTempPassword();
  const fullName = process.env.ADMIN_FULLNAME || "Erdal Vardarli";

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "ADMIN",
      approved: true,
      fullName,
      mustChangePassword: true,
    },
    create: {
      email,
      password: hashed,
      role: "ADMIN",
      approved: true,
      fullName,
      partnerType: "TRAVEL_AGENT",
      mustChangePassword: true,
    },
  });

  console.log("Admin ready:", admin.email);
  console.log("Temporary password (deliver securely):", password);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error creating admin:", err);
  prisma.$disconnect().finally(() => process.exit(1));
});