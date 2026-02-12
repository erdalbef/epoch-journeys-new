/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@epochjourneys.local";
  const adminPassword = "Admin12345"; // change later

  const hashed = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashed,
      role: Role.ADMIN,
      approved: true,
    },
    create: {
      email: adminEmail,
      password: hashed,
      role: Role.ADMIN,
      approved: true,
    },
  });

  console.log("Seeded admin user:", adminEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
