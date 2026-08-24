import {
  AccountingCategory,
  BankTransactionDirection,
} from "@prisma/client";
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
  value: string | number | null | undefined,
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
      '""',
    )}"`;
  }

  return text;
}

function safeArchiveFileName(
  fileName: string,
) {
  return fileName
    .replace(
      /[<>:"/\\|?*]/g,
      "-",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function safeStoredFileName(
  fileName: string,
) {
  return fileName
    .replace(
      /\s+/g,
      "-",
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "",
    );
}

function resolvePublicFile(
  storagePath: string,
) {
  const relativePath =
    storagePath.replace(
      /^\/+/,
      "",
    );

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
    relativeToPublic.startsWith(
      "..",
    ) ||
    path.isAbsolute(
      relativeToPublic,
    )
  ) {
    return null;
  }

  return absolutePath;
}

function getBankStatementPath(
  year: number,
  month: number,
  statementId: string,
  fileName: string,
) {
  const monthFolder =
    String(
      month,
    ).padStart(
      2,
      "0",
    );

  const storedFileName =
    safeStoredFileName(
      fileName,
    ) ||
    "bank-statement.csv";

  const financeIdPath =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "bank-statements",
      statementId,
      storedFileName,
    );

  if (
    existsSync(
      financeIdPath,
    )
  ) {
    return financeIdPath;
  }

  const financeFlatPath =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "bank-statements",
      storedFileName,
    );

  if (
    existsSync(
      financeFlatPath,
    )
  ) {
    return financeFlatPath;
  }

  const directAccountingPath =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "accounting",
      String(year),
      monthFolder,
      fileName,
    );

  if (
    existsSync(
      directAccountingPath,
    )
  ) {
    return directAccountingPath;
  }

  const legacyAccountingBankStatementPath =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "accounting",
      String(year),
      monthFolder,
      "bank-statements",
      fileName,
    );

  if (
    existsSync(
      legacyAccountingBankStatementPath,
    )
  ) {
    return legacyAccountingBankStatementPath;
  }

  return null;
}

function buildReconstructedStatementCsv(
  lines: Array<{
    transactionDate: Date;
    valueDate: Date | null;
    description: string | null;
    reference: string | null;
    amount: unknown;
    direction: BankTransactionDirection;
    balance: unknown;
  }>,
) {
  const rows = [
    [
      "Date",
      "Value Date",
      "Description",
      "Reference",
      "Debit",
      "Credit",
      "Balance",
    ].join(","),
  ];

  for (
    const line of
    lines
  ) {
    const amount =
      Number(
        line.amount,
      );

    const balance =
      line.balance === null
        ? ""
        : Number(
            line.balance,
          ).toFixed(
            2,
          );

    rows.push(
      [
        line.transactionDate
          .toISOString()
          .slice(
            0,
            10,
          ),

        line.valueDate
          ? line.valueDate
              .toISOString()
              .slice(
                0,
                10,
              )
          : "",

        line.description ??
          "",

        line.reference ??
          "",

        line.direction ===
        BankTransactionDirection.OUT
          ? amount.toFixed(
              2,
            )
          : "",

        line.direction ===
        BankTransactionDirection.IN
          ? amount.toFixed(
              2,
            )
          : "",

        balance,
      ]
        .map(
          csvEscape,
        )
        .join(
          ",",
        ),
    );
  }

  return rows.join(
    "\n",
  );
}

function collectStream(
  stream: PassThrough,
): Promise<Buffer> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const chunks: Buffer[] =
        [];

      stream.on(
        "data",
        (
          chunk:
            | Buffer
            | Uint8Array,
        ) => {
          chunks.push(
            Buffer.isBuffer(
              chunk,
            )
              ? chunk
              : Buffer.from(
                  chunk,
                ),
          );
        },
      );

      stream.on(
        "end",
        () => {
          resolve(
            Buffer.concat(
              chunks,
            ),
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

function getDocumentFinancialValue(
  document: {
    payment: {
      amount: unknown;
      currency: string;
    } | null;

    supplierPayablePayment: {
      amount: unknown;
      currency: string;
    } | null;

    supplierPayable: {
      approvedAmount: unknown;
      currency: string;
    } | null;

    salesDocument: {
      totalAmount: unknown;
      currency: string;
    } | null;
  },
) {
  /*
   * Customer receipt / advance.
   */
  if (
    document.payment
  ) {
    return {
      amount:
        Number(
          document.payment
            .amount,
        ).toFixed(
          2,
        ),

      currency:
        document.payment
          .currency,
    };
  }

  /*
   * Supplier payment proof.
   *
   * IMPORTANT:
   * This must be checked BEFORE
   * supplierPayable because the
   * document is normally linked to
   * both records.
   *
   * We want the actual installment
   * paid, not the full invoice value.
   */
  if (
    document.supplierPayablePayment
  ) {
    return {
      amount:
        Number(
          document
            .supplierPayablePayment
            .amount,
        ).toFixed(
          2,
        ),

      currency:
        document
          .supplierPayablePayment
          .currency,
    };
  }

  /*
   * Supplier invoice.
   */
  if (
    document.supplierPayable
  ) {
    return {
      amount:
        Number(
          document
            .supplierPayable
            .approvedAmount,
        ).toFixed(
          2,
        ),

      currency:
        document
          .supplierPayable
          .currency,
    };
  }

  /*
   * Sales invoice / credit note.
   */
  if (
    document.salesDocument
  ) {
    return {
      amount:
        Number(
          document
            .salesDocument
            .totalAmount,
        ).toFixed(
          2,
        ),

      currency:
        document
          .salesDocument
          .currency,
    };
  }

  return {
    amount: "",
    currency: "",
  };
}

export async function buildAccountingPackage({
  year,
  month,
  part,
  strict = false,
}: BuildAccountingPackageOptions): Promise<AccountingPackageResult> {
  if (
    !Number.isInteger(
      year,
    ) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new Error(
      "Invalid accounting year.",
    );
  }

  if (
    !Number.isInteger(
      month,
    ) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Invalid accounting month.",
    );
  }

  if (
    part !== 1 &&
    part !== 2
  ) {
    throw new Error(
      "Invalid accounting package part.",
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
          include: {
            payment: {
              select: {
                amount: true,
                currency: true,
              },
            },

            supplierPayablePayment: {
              select: {
                amount: true,
                currency: true,
              },
            },

            supplierPayable: {
              select: {
                approvedAmount:
                  true,
                currency:
                  true,
              },
            },

            salesDocument: {
              select: {
                totalAmount:
                  true,
                currency:
                  true,
              },
            },
          },

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
            currency:
              "EUR",
          },

          include: {
            bankAccount: {
              select: {
                name:
                  true,
              },
            },

            lines: {
              orderBy: {
                transactionDate:
                  "asc",
              },

              select: {
                transactionDate:
                  true,
                valueDate:
                  true,
                description:
                  true,
                reference:
                  true,
                amount:
                  true,
                direction:
                  true,
                balance:
                  true,
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
      "Accounting period not found.",
    );
  }

  const selectedCategories =
    part === 1
      ? PART_1_CATEGORIES
      : PART_2_CATEGORIES;

  const selectedDocuments =
    period.documents.filter(
      (document) =>
        document.accountingCategory !==
          null &&
        selectedCategories.includes(
          document.accountingCategory,
        ),
    );

  const statementCount =
    part === 1
      ? period
          .bankStatements
          .length
      : 0;

  const documentCount =
    selectedDocuments.length +
    statementCount;

  if (
    documentCount ===
    0
  ) {
    throw new Error(
      `Accounting ZIP Part ${part} has no documents.`,
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
        "Accounting ZIP warning:",
        warning,
      );
    },
  );

  archive.on(
    "error",
    (
      error: Error,
    ) => {
      output.destroy(
        error,
      );
    },
  );

  archive.pipe(
    output,
  );

  const bufferPromise =
    collectStream(
      output,
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
      "Amount",
      "Currency",
    ]
      .map(
        csvEscape,
      )
      .join(
        ",",
      ),
  ];

  for (
    const document of
    selectedDocuments
  ) {
    if (
      !document.accountingCategory
    ) {
      continue;
    }

    const financialValue =
      getDocumentFinancialValue(
        document,
      );

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
        `Accounting file missing: ${document.storagePath}`,
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
        document.originalFileName,
      );

    archive.file(
      absolutePath,
      {
        name:
          `${folderName}/${archiveFileName}`,
      },
    );

    includedFileCount +=
      1;

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
                10,
              )
          : "",

        document.referenceNumber ??
          "",

        financialValue.amount,

        financialValue.currency,
      ]
        .map(
          csvEscape,
        )
        .join(
          ",",
        ),
    );
  }

  if (
    part === 1
  ) {
    for (
      const statement of
      period.bankStatements
    ) {
      const folderName =
        CATEGORY_FOLDER_NAMES[
          AccountingCategory.BANK_STATEMENTS
        ];

      const accountFolder =
        safeArchiveFileName(
          `${statement.bankAccount.name}-${statement.currency}`,
        );

      const absolutePath =
        statement.fileName
          ? getBankStatementPath(
              year,
              month,
              statement.id,
              statement.fileName,
            )
          : null;

      if (
        absolutePath
      ) {
        const archiveFileName =
          safeArchiveFileName(
            statement.fileName ||
              `bank-statement-${statement.id}.csv`,
          );

        archive.file(
          absolutePath,
          {
            name:
              `${folderName}/${accountFolder}/${archiveFileName}`,
          },
        );

        includedFileCount +=
          1;

        indexRows.push(
          [
            folderName,

            statement.bankAccount
              .name,

            "Bank Statement",

            statement.fileName ??
              "",

            statement.statementDate
              .toISOString()
              .slice(
                0,
                10,
              ),

            "",

            "",

            "",
          ]
            .map(
              csvEscape,
            )
            .join(
              ",",
            ),
        );

        continue;
      }

      const reconstructedCsv =
        buildReconstructedStatementCsv(
          statement.lines,
        );

      const baseName =
        statement.fileName
          ? path.parse(
              statement.fileName,
            ).name
          : `bank-statement-${statement.id}`;

      const reconstructedFileName =
        safeArchiveFileName(
          `${baseName}-reconstructed.csv`,
        );

      archive.append(
        reconstructedCsv,
        {
          name:
            `${folderName}/${accountFolder}/${reconstructedFileName}`,
        },
      );

      includedFileCount +=
        1;

      indexRows.push(
        [
          folderName,

          statement.bankAccount
            .name,

          "Bank Statement (Reconstructed)",

          reconstructedFileName,

          statement.statementDate
            .toISOString()
            .slice(
              0,
              10,
            ),

          "",

          "",

          "",
        ]
          .map(
            csvEscape,
          )
          .join(
            ",",
          ),
      );
    }
  }

  if (
    strict &&
    missingFiles.length >
      0
  ) {
    archive.abort();
    output.destroy();

    throw new Error(
      `Accounting package is incomplete. Missing files: ${missingFiles.join(
        ", ",
      )}`,
    );
  }

  const indexFileName =
    `Epoch-Journeys-Accounting-${year}-${String(
      month,
    ).padStart(
      2,
      "0",
    )}-Part-${part}-Index.csv`;

  archive.append(
    indexRows.join(
      "\n",
    ),
    {
      name:
        indexFileName,
    },
  );

  await archive.finalize();

  const buffer =
    await bufferPromise;

  const fileName =
    `Epoch-Journeys-Accounting-${year}-${String(
      month,
    ).padStart(
      2,
      "0",
    )}-Part-${part}.zip`;

  return {
    buffer,
    fileName,
    documentCount,
    includedFileCount,
    missingFiles,
  };
}