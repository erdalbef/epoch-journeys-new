import { AccountingCategory, PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import path from "node:path";
import { get } from "@vercel/blob";

const db = new PrismaClient();

const PART_2 = [
  AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS,
  AccountingCategory.OWNER_PERSONAL_PAYMENTS,
  AccountingCategory.OTHER_DOCUMENTS,
  AccountingCategory.TRIP_GROUP_DOCUMENTATION,
];

function isPrivateBlobUrl(storagePath: string) {
  try {
    const url = new URL(storagePath);

    return (
      url.hostname.endsWith(".private.blob.vercel-storage.com") ||
      url.hostname === "private.blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

async function main() {
  const period = await db.accountingPeriod.findUnique({
    where: {
      year_month: {
        year: 2026,
        month: 8,
      },
    },
    include: {
      documents: true,
    },
  });

  if (!period) {
    console.log("August 2026 accounting period not found.");
    return;
  }

  const docs = period.documents.filter(
    (document) =>
      document.accountingCategory !== null &&
      PART_2.includes(document.accountingCategory),
  );

  console.log("");
  console.log(`PART 2 DATABASE DOCUMENTS: ${docs.length}`);
  console.log("");

  let readableCount = 0;
  let missingCount = 0;

  for (const doc of docs) {
    let storageType = "LOCAL";
    let readable = false;
    let error = "";

    try {
      if (/^https?:\/\//i.test(doc.storagePath)) {
        if (isPrivateBlobUrl(doc.storagePath)) {
          storageType = "PRIVATE_BLOB";

          if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
            throw new Error(
              "BLOB_READ_WRITE_TOKEN is not available locally.",
            );
          }

          const result = await get(doc.storagePath, {
            access: "private",
          });

          readable = Boolean(
            result &&
              result.statusCode === 200 &&
              result.stream,
          );
        } else {
          storageType = "PUBLIC_HTTP_BLOB";

          const response = await fetch(doc.storagePath, {
            cache: "no-store",
          });

          readable = response.ok;

          if (!response.ok) {
            error = `HTTP ${response.status}`;
          }
        }
      } else {
        const relativePath = doc.storagePath.replace(/^\/+/, "");

        const absolutePath = path.resolve(
          process.cwd(),
          "public",
          relativePath,
        );

        readable = existsSync(absolutePath);
      }
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : String(e);
    }

    if (readable) {
      readableCount += 1;
    } else {
      missingCount += 1;
    }

    console.log("----------------------------------------");
    console.log(`ID:       ${doc.id}`);
    console.log(`CATEGORY: ${doc.accountingCategory}`);
    console.log(`TYPE:     ${doc.type}`);
    console.log(`TITLE:    ${doc.title}`);
    console.log(`FILE:     ${doc.originalFileName}`);
    console.log(`STORAGE:  ${storageType}`);
    console.log(`READABLE: ${readable ? "YES" : "NO"}`);

    if (error) {
      console.log(`ERROR:    ${error}`);
    }
  }

  console.log("");
  console.log("========================================");
  console.log(`DATABASE DOCUMENTS: ${docs.length}`);
  console.log(`READABLE FILES:     ${readableCount}`);
  console.log(`MISSING FILES:      ${missingCount}`);
  console.log("========================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });
