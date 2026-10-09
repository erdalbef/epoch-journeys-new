import {
  AccountingCategory,
  FinanceDocumentType,
} from "@prisma/client";
import { ZipArchive } from "archiver";
import { existsSync } from "fs";
import path from "path";
import { PassThrough } from "stream";

import { db } from "@/lib/db";
import { readFinanceFile } from "@/lib/storage/finansFileStorage";

type BuildSalesInvoicesPackageOptions = {
  year: number;
  month: number;
  strict?: boolean;
};

export type SalesInvoicesPackageResult = {
  buffer: Buffer;
  fileName: string;
  documentCount: number;
  includedFileCount: number;
  missingFiles: string[];
};

function safeArchiveFileName(fileName: string) {
  return fileName
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePublicFile(storagePath: string) {
  const relativePath =
    storagePath.replace(/^\/+/, "");

  const publicRoot =
    path.resolve(
      process.cwd(),
      "public",
    );

  const absolutePath =
    path.resolve(
      publicRoot,
      relativePath,
    );

  const relativeToPublic =
    path.relative(
      publicRoot,
      absolutePath,
    );

  if (
    relativeToPublic.startsWith("..") ||
    path.isAbsolute(relativeToPublic)
  ) {
    return null;
  }

  return absolutePath;
}

function collectStream(
  stream: PassThrough,
): Promise<Buffer> {
  return new Promise(
    (resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on(
        "data",
        (
          chunk:
            | Buffer
            | Uint8Array,
        ) => {
          chunks.push(
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk),
          );
        },
      );

      stream.on(
        "end",
        () => {
          resolve(
            Buffer.concat(chunks),
          );
        },
      );

      stream.on(
        "error",
        reject,
      );
    },
  );
}

export async function buildSalesInvoicesPackage({
  year,
  month,
  strict = true,
}: BuildSalesInvoicesPackageOptions): Promise<SalesInvoicesPackageResult> {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      "Invalid accounting year.",
    );
  }

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Invalid accounting month.",
    );
  }

  const period =
    await db.accountingPeriod.findUnique({
      where: {
        year_month: {
          year,
          month,
        },
      },
      select: {
        id: true,
        documents: {
          where: {
            accountingCategory:
              AccountingCategory.SALES_INCOME,
            type:
              FinanceDocumentType.INVOICE,
            salesDocumentId: {
              not: null,
            },
          },
          orderBy: [
            {
              documentDate: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          select: {
            id: true,
            title: true,
            originalFileName: true,
            storagePath: true,
            documentDate: true,
            referenceNumber: true,
            salesDocument: {
              select: {
                id: true,
                documentNumber: true,
                recipientName: true,
                recipientCompany: true,
                totalAmount: true,
                currency: true,
              },
            },
          },
        },
      },
    });

  if (!period) {
    throw new Error(
      "Accounting period not found.",
    );
  }

  if (
    period.documents.length ===
    0
  ) {
    throw new Error(
      "No issued sales invoices were found for this accounting month.",
    );
  }

  const output =
    new PassThrough();

  const archive =
    new ZipArchive({
      zlib: {
        level: 9,
      },
    });

  const missingFiles:
    string[] = [];

  let includedFileCount =
    0;

  archive.on(
    "warning",
    (
      warning: Error,
    ) => {
      console.warn(
        "Sales invoices ZIP warning:",
        warning,
      );
    },
  );

  archive.on(
    "error",
    (
      error: Error,
    ) => {
      output.destroy(error);
    },
  );

  archive.pipe(output);

  const bufferPromise =
    collectStream(output);

  for (
    const document of
    period.documents
  ) {
    const invoiceNumber =
      document.salesDocument
        ?.documentNumber ||
      document.referenceNumber ||
      document.title ||
      document.id;

    const archiveFileName =
      safeArchiveFileName(
        `${invoiceNumber}.pdf`,
      );

    if (
      /^https:\/\//i.test(
        document.storagePath,
      )
    ) {
      try {
        const remoteFile =
          await readFinanceFile(
            document.storagePath,
          );

        if (!remoteFile) {
          throw new Error(
            "Stored invoice PDF could not be read.",
          );
        }

        archive.append(
          remoteFile,
          {
            name:
              archiveFileName,
          },
        );

        includedFileCount +=
          1;
      } catch (error) {
        missingFiles.push(
          document.originalFileName,
        );

        console.warn(
          `Sales invoice file missing: ${document.storagePath}`,
          error,
        );
      }

      continue;
    }

    const absolutePath =
      resolvePublicFile(
        document.storagePath,
      );

    if (
      !absolutePath ||
      !existsSync(
        absolutePath,
      )
    ) {
      missingFiles.push(
        document.originalFileName,
      );

      console.warn(
        `Sales invoice file missing: ${document.storagePath}`,
      );

      continue;
    }

    archive.file(
      absolutePath,
      {
        name:
          archiveFileName,
      },
    );

    includedFileCount +=
      1;
  }

  if (
    strict &&
    missingFiles.length > 0
  ) {
    archive.abort();
    output.destroy();

    throw new Error(
      `Sales invoices ZIP is incomplete. Missing files: ${missingFiles.join(", ")}`,
    );
  }

  if (
    includedFileCount ===
    0
  ) {
    archive.abort();
    output.destroy();

    throw new Error(
      "No sales invoice PDFs could be added to the ZIP.",
    );
  }

  await archive.finalize();

  const buffer =
    await bufferPromise;

  const fileName =
    `Epoch-Journeys-Sales-Invoices-${year}-${String(
      month,
    ).padStart(
      2,
      "0",
    )}.zip`;

  return {
    buffer,
    fileName,
    documentCount:
      period.documents.length,
    includedFileCount,
    missingFiles,
  };
}
