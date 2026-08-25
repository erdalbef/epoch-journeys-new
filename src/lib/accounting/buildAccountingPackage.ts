import {
  AccountingCategory,
  BankTransactionDirection,
  BookingStatus,
  ExpenseApprovalStatus,
  ExpensePaymentStatus,
  PaymentRecordStatus,
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
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text =
    String(value);

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

function buildCsv(
  headers: string[],
  rows: Array<
    Array<
      | string
      | number
      | null
      | undefined
    >
  >,
) {
  return [
    headers
      .map(csvEscape)
      .join(","),

    ...rows.map(
      (row) =>
        row
          .map(csvEscape)
          .join(","),
    ),
  ].join("\n");
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
    String(month).padStart(
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
          ).toFixed(2);

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
        .map(csvEscape)
        .join(","),
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
        ).toFixed(2),

      currency:
        document.payment
          .currency,
    };
  }

  /*
   * Supplier payment proof.
   *
   * This is deliberately before
   * SupplierPayable because a payment
   * proof normally has BOTH relations.
   *
   * Example:
   * invoice = EUR 100
   * payment proof = EUR 40
   *
   * The index must display EUR 40.
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
        ).toFixed(2),

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
        ).toFixed(2),

      currency:
        document
          .supplierPayable
          .currency,
    };
  }

  /*
   * Sales document.
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
        ).toFixed(2),

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

  // ========================================================
  // ACCOUNTING PERIOD
  // ========================================================

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
                id: true,

                supplierNameSnapshot:
                  true,

                approvedAmount:
                  true,

                amountPaid:
                  true,

                balance:
                  true,

                currency:
                  true,
              },
            },

            salesDocument: {
              select: {
                id: true,

                bookingId:
                  true,

                totalAmount:
                  true,

                amountPaid:
                  true,

                balance:
                  true,

                currency:
                  true,

                recipientName:
                  true,

                recipientCompany:
                  true,
              },
            },

            expense: {
              select: {
                id: true,

                vendorName:
                  true,

                category:
                  true,

                amount:
                  true,

                currency:
                  true,

                paymentStatus:
                  true,

                approvalStatus:
                  true,

                taxAmount:
                  true,
              },
            },

            booking: {
              select: {
                id: true,

                status: true,

                currency:
                  true,

                totalPrice:
                  true,

                amountPaid:
                  true,

                agencyNameSnapshot:
                  true,

                agentNameSnapshot:
                  true,

                customerName:
                  true,

                groupName:
                  true,

                partnerCompany: {
                  select: {
                    name: true,
                  },
                },

                user: {
                  select: {
                    fullName:
                      true,

                    email:
                      true,

                    travelAgency:
                      true,
                  },
                },

                payments: {
                  where: {
                    status:
                      PaymentRecordStatus.RECEIVED,
                  },

                  select: {
                    amount:
                      true,

                    currency:
                      true,
                  },
                },
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

  // ========================================================
  // ARCHIVE
  // ========================================================

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

  // ========================================================
  // DETAILED DOCUMENT INDEX
  // ========================================================

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
      .map(csvEscape)
      .join(","),
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
        .map(csvEscape)
        .join(","),
    );
  }

  // ========================================================
  // BANK STATEMENTS
  // ========================================================

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
            .map(csvEscape)
            .join(","),
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
          .map(csvEscape)
          .join(","),
      );
    }
  }

  // ========================================================
  // PART 1 CONSOLIDATED SUMMARIES
  //
  // These summaries DO NOT replace the detailed index.
  //
  // They provide a management/accountant overview while all
  // original source documents remain separately available.
  // ========================================================

  if (
    part === 1
  ) {
    // ======================================================
    // 1. SUPPLIER SUMMARY
    //
    // Dedupe by SupplierPayable ID.
    //
    // This prevents:
    // Invoice EUR 100
    // Payment proof EUR 40
    //
    // from appearing as two liabilities.
    //
    // Instead:
    // Approved 100 / Paid 40 / Balance 60
    // ======================================================

    type SupplierSummary = {
      supplierName: string;
      currency: string;
      payableCount: number;
      approved: number;
      paid: number;
      balance: number;
    };

    const uniquePayables =
      new Map<
        string,
        NonNullable<
          (typeof selectedDocuments)[number]["supplierPayable"]
        >
      >();

    for (
      const document of
      selectedDocuments
    ) {
      if (
        document.supplierPayable
      ) {
        uniquePayables.set(
          document
            .supplierPayable
            .id,

          document.supplierPayable,
        );
      }
    }

    const supplierSummaryMap =
      new Map<
        string,
        SupplierSummary
      >();

    for (
      const payable of
      uniquePayables.values()
    ) {
      const supplierName =
        payable.supplierNameSnapshot ||
        "Unspecified Supplier";

      const currency =
        payable.currency ||
        "EUR";

      const key =
        `${supplierName}::${currency}`;

      const existing =
        supplierSummaryMap.get(
          key,
        ) ?? {
          supplierName,
          currency,
          payableCount: 0,
          approved: 0,
          paid: 0,
          balance: 0,
        };

      existing.payableCount +=
        1;

      existing.approved +=
        Number(
          payable.approvedAmount ??
            0,
        );

      existing.paid +=
        Number(
          payable.amountPaid ??
            0,
        );

      existing.balance +=
        Number(
          payable.balance ??
            0,
        );

      supplierSummaryMap.set(
        key,
        existing,
      );
    }

    const supplierRows =
      Array.from(
        supplierSummaryMap.values(),
      )
        .sort(
          (
            a,
            b,
          ) => {
            if (
              a.currency !==
              b.currency
            ) {
              return a.currency.localeCompare(
                b.currency,
              );
            }

            return a.supplierName.localeCompare(
              b.supplierName,
            );
          },
        )
        .map(
          (
            summary,
          ) => [
            summary.supplierName,

            summary.currency,

            summary.payableCount,

            summary.approved.toFixed(
              2,
            ),

            summary.paid.toFixed(
              2,
            ),

            summary.balance.toFixed(
              2,
            ),

            summary.balance <=
            0.005
              ? "SETTLED"
              : "OUTSTANDING",
          ],
        );

    const supplierSummaryCsv =
      buildCsv(
        [
          "Supplier",
          "Currency",
          "Payables",
          "Approved / Invoice Total",
          "Paid",
          "Balance",
          "Position",
        ],
        supplierRows,
      );

    archive.append(
      `\uFEFF${supplierSummaryCsv}`,
      {
        name:
          "SUMMARY/Supplier-Summary.csv",
      },
    );

    // ======================================================
    // 2. CUSTOMER / AGENT SUMMARY
    //
    // Primary source: Booking.
    //
    // If a sales document is not linked to a booking,
    // it is included separately using its recipient.
    // ======================================================

    type CustomerSummary = {
      payer: string;
      currency: string;
      recordCount: number;
      sales: number;
      received: number;
      outstanding: number;
    };

    const customerSummaryMap =
      new Map<
        string,
        CustomerSummary
      >();

    const uniqueBookings =
      new Map<
        string,
        NonNullable<
          (typeof selectedDocuments)[number]["booking"]
        >
      >();

    for (
      const document of
      selectedDocuments
    ) {
      if (
        document.booking
      ) {
        uniqueBookings.set(
          document.booking.id,
          document.booking,
        );
      }
    }

    for (
      const booking of
      uniqueBookings.values()
    ) {
      if (
        booking.status ===
        BookingStatus.CANCELLED
      ) {
        continue;
      }

      const payer =
        booking.agencyNameSnapshot ||
        booking.partnerCompany
          ?.name ||
        booking.user
          .travelAgency ||
        booking.customerName ||
        booking.groupName ||
        booking.agentNameSnapshot ||
        booking.user
          .fullName ||
        booking.user
          .email ||
        "Unspecified Customer / Agent";

      const currency =
        booking.currency ||
        "EUR";

      const receivedFromPayments =
        booking.payments.reduce(
          (
            sum,
            payment,
          ) =>
            sum +
            Number(
              payment.amount ??
                0,
            ),
          0,
        );

      const received =
        Number(
          booking.amountPaid ??
            0,
        ) > 0
          ? Number(
              booking.amountPaid,
            )
          : receivedFromPayments;

      const sales =
        Number(
          booking.totalPrice ??
            0,
        );

      const outstanding =
        Math.max(
          sales -
            received,
          0,
        );

      const key =
        `${payer}::${currency}`;

      const existing =
        customerSummaryMap.get(
          key,
        ) ?? {
          payer,
          currency,
          recordCount: 0,
          sales: 0,
          received: 0,
          outstanding: 0,
        };

      existing.recordCount +=
        1;

      existing.sales +=
        sales;

      existing.received +=
        received;

      existing.outstanding +=
        outstanding;

      customerSummaryMap.set(
        key,
        existing,
      );
    }

    /*
     * Include unlinked sales documents.
     *
     * They are excluded when the FinanceDocument
     * already has a Booking relation because that
     * booking has already been summarized above.
     */
    const uniqueUnlinkedSalesDocuments =
      new Map<
        string,
        NonNullable<
          (typeof selectedDocuments)[number]["salesDocument"]
        >
      >();

    for (
      const document of
      selectedDocuments
    ) {
      if (
        document.salesDocument &&
        !document.booking
      ) {
        uniqueUnlinkedSalesDocuments.set(
          document
            .salesDocument
            .id,

          document.salesDocument,
        );
      }
    }

    for (
      const salesDocument of
      uniqueUnlinkedSalesDocuments.values()
    ) {
      const payer =
        salesDocument.recipientCompany ||
        salesDocument.recipientName ||
        "Unspecified Customer / Agent";

      const currency =
        salesDocument.currency ||
        "EUR";

      const sales =
        Number(
          salesDocument.totalAmount ??
            0,
        );

      const received =
        Number(
          salesDocument.amountPaid ??
            0,
        );

      const outstanding =
        Number(
          salesDocument.balance ??
            Math.max(
              sales -
                received,
              0,
            ),
        );

      const key =
        `${payer}::${currency}`;

      const existing =
        customerSummaryMap.get(
          key,
        ) ?? {
          payer,
          currency,
          recordCount: 0,
          sales: 0,
          received: 0,
          outstanding: 0,
        };

      existing.recordCount +=
        1;

      existing.sales +=
        sales;

      existing.received +=
        received;

      existing.outstanding +=
        Math.max(
          outstanding,
          0,
        );

      customerSummaryMap.set(
        key,
        existing,
      );
    }

    const customerRows =
      Array.from(
        customerSummaryMap.values(),
      )
        .sort(
          (
            a,
            b,
          ) => {
            if (
              a.currency !==
              b.currency
            ) {
              return a.currency.localeCompare(
                b.currency,
              );
            }

            if (
              a.outstanding !==
              b.outstanding
            ) {
              return (
                b.outstanding -
                a.outstanding
              );
            }

            return a.payer.localeCompare(
              b.payer,
            );
          },
        )
        .map(
          (
            summary,
          ) => [
            summary.payer,

            summary.currency,

            summary.recordCount,

            summary.sales.toFixed(
              2,
            ),

            summary.received.toFixed(
              2,
            ),

            summary.outstanding.toFixed(
              2,
            ),

            summary.outstanding <=
            0.005
              ? "SETTLED"
              : "OUTSTANDING",
          ],
        );

    const customerSummaryCsv =
      buildCsv(
        [
          "Customer / Agent",
          "Currency",
          "Bookings / Sales Records",
          "Sales",
          "Received",
          "Outstanding",
          "Position",
        ],
        customerRows,
      );

    archive.append(
      `\uFEFF${customerSummaryCsv}`,
      {
        name:
          "SUMMARY/Customer-Agent-Summary.csv",
      },
    );

    // ======================================================
    // 3. ADDITIONAL EXPENSE SUMMARY
    //
    // Group by:
    // Vendor / Payee + Category + Currency
    //
    // Each Expense ID is counted only once even if more than
    // one supporting FinanceDocument points to it.
    // ======================================================

    type AdditionalExpenseSummary = {
      vendorName: string;
      category: string;
      currency: string;
      expenseCount: number;
      total: number;
      paid: number;
      pending: number;
      tax: number;
    };

    const uniqueExpenses =
      new Map<
        string,
        NonNullable<
          (typeof selectedDocuments)[number]["expense"]
        >
      >();

    for (
      const document of
      selectedDocuments
    ) {
      if (
        document.expense
      ) {
        uniqueExpenses.set(
          document.expense.id,
          document.expense,
        );
      }
    }

    const additionalExpenseSummaryMap =
      new Map<
        string,
        AdditionalExpenseSummary
      >();

    for (
      const expense of
      uniqueExpenses.values()
    ) {
      if (
        expense.paymentStatus ===
          ExpensePaymentStatus.CANCELLED ||
        expense.approvalStatus ===
          ExpenseApprovalStatus.REJECTED ||
        expense.approvalStatus ===
          ExpenseApprovalStatus.CANCELLED
      ) {
        continue;
      }

      const vendorName =
        expense.vendorName ||
        "Unspecified Payee";

      const category =
        String(
          expense.category,
        )
          .replaceAll(
            "_",
            " ",
          )
          .toLowerCase()
          .replace(
            /\b\w/g,
            (
              letter,
            ) =>
              letter.toUpperCase(),
          );

      const currency =
        expense.currency ||
        "EUR";

      const key =
        `${vendorName}::${expense.category}::${currency}`;

      const existing =
        additionalExpenseSummaryMap.get(
          key,
        ) ?? {
          vendorName,
          category,
          currency,
          expenseCount: 0,
          total: 0,
          paid: 0,
          pending: 0,
          tax: 0,
        };

      const amount =
        Number(
          expense.amount ??
            0,
        );

      existing.expenseCount +=
        1;

      existing.total +=
        amount;

      existing.tax +=
        Number(
          expense.taxAmount ??
            0,
        );

      if (
        expense.paymentStatus ===
        ExpensePaymentStatus.PAID
      ) {
        existing.paid +=
          amount;
      }

      if (
        expense.paymentStatus ===
        ExpensePaymentStatus.PENDING
      ) {
        existing.pending +=
          amount;
      }

      additionalExpenseSummaryMap.set(
        key,
        existing,
      );
    }

    const additionalExpenseRows =
      Array.from(
        additionalExpenseSummaryMap.values(),
      )
        .sort(
          (
            a,
            b,
          ) => {
            if (
              a.currency !==
              b.currency
            ) {
              return a.currency.localeCompare(
                b.currency,
              );
            }

            if (
              a.vendorName !==
              b.vendorName
            ) {
              return a.vendorName.localeCompare(
                b.vendorName,
              );
            }

            return a.category.localeCompare(
              b.category,
            );
          },
        )
        .map(
          (
            summary,
          ) => [
            summary.vendorName,

            summary.category,

            summary.currency,

            summary.expenseCount,

            summary.total.toFixed(
              2,
            ),

            summary.paid.toFixed(
              2,
            ),

            summary.pending.toFixed(
              2,
            ),

            summary.tax.toFixed(
              2,
            ),

            summary.pending >
            0.005
              ? "OUTSTANDING"
              : "SETTLED",
          ],
        );

    const additionalExpenseSummaryCsv =
      buildCsv(
        [
          "Vendor / Payee",
          "Category",
          "Currency",
          "Expenses",
          "Total",
          "Paid",
          "Pending",
          "VAT / Tax",
          "Position",
        ],
        additionalExpenseRows,
      );

    archive.append(
      `\uFEFF${additionalExpenseSummaryCsv}`,
      {
        name:
          "SUMMARY/Additional-Expenses-Summary.csv",
      },
    );
  }

  // ========================================================
  // STRICT PACKAGE CHECK
  // ========================================================

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

  // ========================================================
  // DETAILED INDEX
  // ========================================================

  const indexFileName =
    `Epoch-Journeys-Accounting-${year}-${String(
      month,
    ).padStart(
      2,
      "0",
    )}-Part-${part}-Index.csv`;

  archive.append(
    `\uFEFF${indexRows.join(
      "\n",
    )}`,
    {
      name:
        indexFileName,
    },
  );

  // ========================================================
  // FINALIZE
  // ========================================================

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