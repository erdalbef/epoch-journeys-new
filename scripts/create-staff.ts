import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const email = "staff@epochjourneys.com";
  const temporaryPassword = "ChangeMe-2026!";

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await db.user.upsert({
    where: { email },
    update: {
      fullName: "Epoch Team Member",
      password: passwordHash,
      role: "STAFF",
      approved: true,
    },
    create: {
      email,
      fullName: "Epoch Team Member",
      password: passwordHash,
      role: "STAFF",
      approved: true,
    },
  });

  console.log(`Staff account ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });