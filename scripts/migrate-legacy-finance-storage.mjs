import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

const prisma = new PrismaClient();

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function localPublicPath(storagePath) {
  const relative = storagePath
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");

  if (relative.includes("..")) {
    return null;
  }

  return path.resolve(
    process.cwd(),
    "public",
    relative,
  );
}

async function main() {
  console.log("");
  console.log("========================================");
  console.log("LEGACY FINANCE STORAGE MIGRATION");
  console.log("========================================");
  console.log("");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not available. Run this script with the project .env loaded.",
    );
  }

  const documents =
    await prisma.financeDocument.findMany({
      where: {
        NOT: {
          storagePath: {
            startsWith: "http",
          },
        },
      },

      select: {
        id: true,
        title: true,
        originalFileName: true,
        storedFileName: true,
        storagePath: true,

        accountingPeriod: {
          select: {
            year: true,
            month: true,
          },
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  if (documents.length === 0) {
    console.log(
      "No legacy FinanceDocument records found.",
    );

    return;
  }

  console.log(
    `Found ${documents.length} legacy record(s).`,
  );

  console.log("");

  let migrated = 0;
  let missing = 0;
  let failed = 0;

  for (const document of documents) {
    if (
      isHttpUrl(
        document.storagePath,
      )
    ) {
      continue;
    }

    const absolutePath =
      localPublicPath(
        document.storagePath,
      );

    if (!absolutePath) {
      console.log(
        `SKIPPED INVALID PATH: ${document.originalFileName}`,
      );

      failed += 1;
      continue;
    }

    let fileBuffer;

    try {
      fileBuffer =
        await fs.readFile(
          absolutePath,
        );
    } catch {
      console.log(
        `MISSING LOCAL FILE: ${document.originalFileName}`,
      );

      console.log(
        `  ${absolutePath}`,
      );

      missing += 1;
      continue;
    }

    const year =
      document.accountingPeriod?.year ??
      new Date().getUTCFullYear();

    const month =
      document.accountingPeriod?.month ??
      new Date().getUTCMonth() + 1;

    const monthFolder =
      String(month).padStart(
        2,
        "0",
      );

    const fileName =
      document.storedFileName ||
      path.basename(
        absolutePath,
      );

    const blobPath =
      `accounting/${year}/${monthFolder}/legacy-migrated/${document.id}-${fileName}`;

    try {
      console.log(
        `Migrating: ${document.originalFileName}`,
      );

      const blob =
        await put(
          blobPath,
          fileBuffer,
          {
            access:
              "private",

            addRandomSuffix:
              false,
          },
        );

      await prisma.financeDocument.update({
        where: {
          id:
            document.id,
        },

        data: {
          storagePath:
            blob.url,
        },
      });

      migrated += 1;

      console.log(
        `  OK -> ${blob.url}`,
      );
    } catch (error) {
      failed += 1;

      console.error(
        `FAILED: ${document.originalFileName}`,
      );

      console.error(
        error,
      );
    }
  }

  console.log("");
  console.log("========================================");
  console.log("MIGRATION RESULT");
  console.log("========================================");

  console.log(
    `Migrated: ${migrated}`,
  );

  console.log(
    `Missing local files: ${missing}`,
  );

  console.log(
    `Failed: ${failed}`,
  );

  console.log(
    `Total checked: ${documents.length}`,
  );

  console.log("========================================");
  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "LEGACY_FINANCE_MIGRATION_ERROR",
      error,
    );
  })
  .finally(async () => {
    await prisma.$disconnect();
  });