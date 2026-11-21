const { PrismaClient } = require("@prisma/client");

async function main() {
  const db = new PrismaClient();

  try {
    const migrations = await db.$queryRaw`
      SELECT
        migration_name,
        checksum,
        finished_at IS NOT NULL AS applied,
        rolled_back_at IS NOT NULL AS rolled_back
      FROM "_prisma_migrations"
      ORDER BY started_at ASC
    `;

    for (const m of migrations) {
      console.log(
        `${m.migration_name} | ${m.applied ? "APPLIED" : "NOT FINISHED"} | ${m.rolled_back ? "ROLLED BACK" : "ACTIVE"} | ${m.checksum}`
      );
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch(e => {
  console.error("Migration history query failed:", e.message);
  process.exit(1);
});
