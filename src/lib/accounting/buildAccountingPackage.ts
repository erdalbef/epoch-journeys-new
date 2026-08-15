import { AccountingCategory } from "@prisma/client";
import { ZipArchive } from "archiver";
import { existsSync } from "fs";
import path from "path";
import { PassThrough } from "stream";

import { db } from "@/lib/db";

export type AccountingPackagePart = 1 | 2;

type BuildAccountingPackageOptions = {
  year: number;
  month: number;
  part: AccountingPackagePart;

  /**
   * strict = true:
   * throw an error if a database document cannot
   * be found physically on the server.
   *
   * We will use this later for accountant email.
   *
   * strict = false:
   * skip missing files and continue generating ZIP.
   *
   * This preserves the behavior of the current
   * working download route.
   */
  strict?: boolean;
};

export type AccountingPackageResult = {
  buffer: Buffer;
  fileName: string;
  documentCount: number;
  includedFileCount: number;
  missingFiles: string[];
};

const PART_1_CATEGORIES: AccountingCategory[] = [
  AccountingCategory.BANK_STATEMENTS,
  AccountingCategory.SALES_INCOME,
  AccountingCategory.EXPENSES_PURCHASES,
  AccountingCategory.CASH,
];

const PART_2_CATEGORIES: AccountingCategory[] = [
  AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS,
  AccountingCategory.OWNER_PERSONAL_PAYMENTS,
  AccountingCategory.OTHER_DOCUMENTS,
  AccountingCategory.TRIP_GROUP_DOCUMENTATION,
];

const CATEGORY_FOLDER_NAMES: Record<
  AccountingCategory,
  string
> = {
  [AccountingCategory.BANK_STATEMENTS]:
    "01-Bank-Statements",

  [AccountingCategory.SALES_INCOME]:
    "02-Sales-Income",

  [AccountingCategory.EXPENSES_PURCHASES]:
    "03-Expenses-Purchases",

  [AccountingCategory.CASH]:
    "04-Cash",

  [AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS]:
    "05-Employees-Accountable-Persons",

  [AccountingCategory.OWNER_PERSONAL_PAYMENTS]:
    "06-Owner-Personal-Payments",

  [AccountingCategory.OTHER_DOCUMENTS]:
    "07-Other-Documents",

  [AccountingCategory.TRIP_GROUP_DOCUMENTATION]:
    "08-Trip-Group-Documentation",
};

function csvEscape(
  value: string | number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return text;
}

function safeArchiveFileName(
  fileName: string
) {
  return fileName
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePublicFile(
  storagePath: string
) {
  const relativePath =
    storagePath.replace(/^\/+/, "");

  const publicRoot =
    path.resolve(
      process.cwd(),
      "public"
    );

  const absolutePath =
    path.resolve(
      publicRoot,
      relativePath
    );

  const relativeToPublic =
    path.relative(
      publicRoot,
      absolutePath
    );

  if (
    relativeToPublic.startsWith("..") ||
    path.isAbsolute(
      relativeToPublic
    )
  ) {
    return null;
  }

  return absolutePath;
}

function getBankStatementPath(
  year: number,
  month: number,
  fileName: string
) {
  const monthFolder =
    String(month).padStart(
      2,
      "0"
    );

  /*
   * Current preferred monthly folder.
   */

  const directPath =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "accounting",
      String(year),
      monthFolder,
      fileName
    );

  if (
    existsSync(
      directPath
    )
  ) {
    return directPath;
  }

  /*
   * Support the earlier bank-statements
   * subfolder so existing uploads continue
   * to work.
   */

  const bankStatementPath =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "accounting",
      String(year),
      monthFolder,
      "bank-statements",
      fileName
    );

  if (
    existsSync(
      bankStatementPath
    )
  ) {
    return bankStatementPath;
  }

  return null;
}

function collectStream(
  stream: PassThrough
): Promise<Buffer> {
  return new Promise(
    (resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on(
        "data",
        (chunk: Buffer | Uint8Array) => {
          chunks.push(
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk)
          );
        }
      );

      stream.on(
        "end",
        () => {
          resolve(
            Buffer.concat(chunks)
          );
        }
      );

      stream.on(
        "error",
        reject
      );
    }
  );
}

export async function buildAccountingPackage({
  year,
  month,
  part,
  strict = false,
}: BuildAccountingPackageOptions): Promise<AccountingPackageResult> {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      "Invalid accounting year."
    );
  }

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Invalid accounting month."
    );
  }

  if (
    part !== 1 &&
    part !== 2
  ) {
    throw new Error(
      "Invalid accounting package part."
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

      include: {
        documents: {
          orderBy: [
            {
              accountingCategory:
                "asc",
            },
            {
              documentDate:
                "asc",
            },
            {
              createdAt:
                "asc",
            },
          ],
        },

        bankStatements: {
          where: {
            currency: "EUR",
          },

          include: {
            bankAccount: {
              select: {
                name: true,
              },
            },
          },

          orderBy: {
            statementDate:
              "asc",
          },
        },
      },
    });

  if (!period) {
    throw new Error(
      "Accounting period not found."
    );
  }

  const selectedCategories:
    AccountingCategory[] =
    part === 1
      ? PART_1_CATEGORIES
      : PART_2_CATEGORIES;

  const selectedDocuments =
    period.documents.filter(
      (document) =>
        document.accountingCategory !==
          null &&
        selectedCategories.includes(
          document.accountingCategory
        )
    );

  const statementCount =
    part === 1
      ? period.bankStatements.length
      : 0;

  const documentCount =
    selectedDocuments.length +
    statementCount;

  if (documentCount === 0) {
    throw new Error(
      `Accounting ZIP Part ${part} has no documents.`
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

  let includedFileCount = 0;

  archive.on(
    "warning",
    (warning: Error) => {
      console.warn(
        "Accounting ZIP warning:",
        warning
      );
    }
  );

  archive.on(
    "error",
    (error: Error) => {
      output.destroy(
        error
      );
    }
  );

  archive.pipe(
    output
  );

  const bufferPromise =
    collectStream(
      output
    );

  const indexRows:
    string[] = [
    [
      "Category",
      "Subcategory",
      "Document Title",
      "Original File",
      "Document Date",
      "Reference Number",
    ]
      .map(
        csvEscape
      )
      .join(","),
  ];

  /*
   * FinanceDocument records
   */

  for (
    const document of
    selectedDocuments
  ) {
    if (
      !document.accountingCategory
    ) {
      continue;
    }

    const absolutePath =
      resolvePublicFile(
        document.storagePath
      );

    if (
      !absolutePath ||
      !existsSync(
        absolutePath
      )
    ) {
      missingFiles.push(
        document.originalFileName
      );

      console.warn(
        `Accounting file missing: ${document.storagePath}`
      );

      continue;
    }

    const folderName =
      CATEGORY_FOLDER_NAMES[
        document
          .accountingCategory
      ];

    const archiveFileName =
      safeArchiveFileName(
        document.originalFileName
      );

    archive.file(
      absolutePath,
      {
        name:
          `${folderName}/${archiveFileName}`,
      }
    );

    includedFileCount += 1;

    indexRows.push(
      [
        folderName,
        document.accountingSubcategory ??
          "",
        document.title,
        document.originalFileName,
        document.documentDate
          ? document.documentDate
              .toISOString()
              .slice(
                0,
                10
              )
          : "",
        document.referenceNumber ??
          "",
      ]
        .map(
          csvEscape
        )
        .join(",")
    );
  }

  /*
   * BankStatement records
   * belong only in Part 1.
   */

  if (part === 1) {
    for (
      const statement of
      period.bankStatements
    ) {
      if (
        !statement.fileName
      ) {
        missingFiles.push(
          `Bank statement ${statement.id}`
        );

        continue;
      }

      const absolutePath =
        getBankStatementPath(
          year,
          month,
          statement.fileName
        );

      if (!absolutePath) {
        missingFiles.push(
          statement.fileName
        );

        console.warn(
          `Bank statement file missing: ${statement.fileName}`
        );

        continue;
      }

      const folderName =
        CATEGORY_FOLDER_NAMES[
          AccountingCategory.BANK_STATEMENTS
        ];

      const archiveFileName =
        safeArchiveFileName(
          statement.fileName
        );

      archive.file(
        absolutePath,
        {
          name:
            `${folderName}/${archiveFileName}`,
        }
      );

      includedFileCount += 1;

      indexRows.push(
        [
          folderName,
          statement
            .bankAccount
            .name,
          "Bank Statement",
          statement.fileName,
          statement.statementDate
            .toISOString()
            .slice(
              0,
              10
            ),
          "",
        ]
          .map(
            csvEscape
          )
          .join(",")
      );
    }
  }

  /*
   * For official accountant email sending
   * we will use strict=true.
   *
   * This prevents an incomplete accounting
   * package from being emailed.
   */

  if (
    strict &&
    missingFiles.length > 0
  ) {
    archive.abort();
    output.destroy();

    throw new Error(
      `Accounting package is incomplete. Missing files: ${missingFiles.join(
        ", "
      )}`
    );
  }

  const indexFileName =
    `Epoch-Journeys-Accounting-${year}-${String(
      month
    ).padStart(
      2,
      "0"
    )}-Part-${part}-Index.csv`;

  archive.append(
    indexRows.join(
      "\n"
    ),
    {
      name:
        indexFileName,
    }
  );

  await archive.finalize();

  const buffer =
    await bufferPromise;

  const fileName =
    `Epoch-Journeys-Accounting-${year}-${String(
      month
    ).padStart(
      2,
      "0"
    )}-Part-${part}.zip`;

  return {
    buffer,
    fileName,
    documentCount,
    includedFileCount,
    missingFiles,
  };
}