// scripts/create-staff.mjs

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function genTempPassword() {
  return crypto
    .randomBytes(9)
    .toString("base64")
    .replace(/\+/g, "0")
    .replace(/\//g, "0");
}

async function main() {
  const email =
    process.env.STAFF_EMAIL || "staff@epochjourneys.com";

  const password =
    process.env.STAFF_PASSWORD || genTempPassword();

  const fullName =
    process.env.STAFF_FULLNAME || "Test Staff";

  const hashed = await bcrypt.hash(password, 10);

  const staff = await prisma.user.upsert({
    where: {
      email,
    },

    update: {
      password: hashed,
      role: "STAFF",
      approved: true,
      fullName,
    },

    create: {
      email,
      password: hashed,
      role: "STAFF",
      approved: true,
      fullName,
    },
  });

  console.log("Staff ready:", staff.email);
  console.log("Temporary password:", password);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error creating staff:", err);

  prisma.$disconnect().finally(() => process.exit(1));
});