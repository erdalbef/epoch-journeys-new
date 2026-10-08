import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import {
  AccountingCategory,
  CashTransactionDirection,
  CashTransactionStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    year: string;
    month: string;
  }>;
};

function formatDate(
  value: Date | null | undefined
) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(value);
}

function textValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function numberValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function getCategoryLabel(
  category:
    | AccountingCategory
    | null
    | undefined
) {
  if (!category) {
    return "";
  }

  switch (category) {
    case AccountingCategory.BANK_STATEMENTS:
      return "Bank Statements";

    case AccountingCategory.SALES_INCOME:
      return "Sales / Income";

    case AccountingCategory.EXPENSES_PURCHASES:
      return "Expenses / Purchases";

    case AccountingCategory.CASH:
      return "Cash";

    case AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS:
      return "Employees / Accountable Persons";

    case AccountingCategory.OWNER_PERSONAL_PAYMENTS:
      return "Owner / Personal Payments";

    case AccountingCategory.OTHER_DOCUMENTS:
      return "Other Documents";

    case AccountingCategory.TRIP_GROUP_DOCUMENTATION:
      return "Trip / Group Documentation";

    default:
      return category;
  }
}

function formatEnumLabel(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function styleHeader(
  row: ExcelJS.Row
) {
  row.font = {
    bold: true,
  };

  row.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  row.height = 22;
}

function styleTitle(
  cell: ExcelJS.Cell
) {
  cell.font = {
    bold: true,
    size: 16,
  };
}

function applyBorders(
  worksheet:
    ExcelJS.Worksheet
) {
  worksheet.eachRow(
    (row) => {
      row.eachCell(
        (cell) => {
          cell.border = {
            top: {
              style: "thin",
            },
            left: {
              style: "thin",
            },
            bottom: {
              style: "thin",
            },
            right: {
              style: "thin",
            },
          };

          cell.alignment = {
            vertical: "top",
            wrapText: true,
          };
        }
      );
    }
  );
}

function autoWidth(
  worksheet:
    ExcelJS.Worksheet
) {
  worksheet.columns.forEach(
    (column) => {
      let maxLength = 10;

      column.eachCell?.(
        {
          includeEmpty: true,
        },
        (cell) => {
          const value =
            cell.value;

          const length =
            value === null ||
            value === undefined
              ? 0
              : String(value)
                  .length;

          if (
            length >
            maxLength
          ) {
            maxLength =
              length;
          }
        }
      );

      column.width =
        Math.min(
          Math.max(
            maxLength + 2,
            12
          ),
          40
        );
    }
  );
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user ||
      session.user.role !==
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      year: yearParam,
      month: monthParam,
    } =
      await context.params;

    const year =
      Number(yearParam);

    const month =
      Number(monthParam);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting year.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting month.",
        },
        {
          status: 400,
        }
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
                documentDate:
                  "asc",
              },
              {
                createdAt:
                  "asc",
              },
            ],

            include: {
              supplier: {
                select: {
                  name: true,
                },
              },

              booking: {
                select: {
                  bookingReference:
                    true,
                  groupName:
                    true,
                },
              },

              tour: {
                select: {
                  title: true,
                },
              },

              bankAccount: {
                select: {
                  name: true,
                  currency:
                    true,
                },
              },

              uploadedBy: {
                select: {
                  fullName:
                    true,
                  email: true,
                },
              },
            },
          },

          bankStatements: {
            where: {
              currency:
                "EUR",
            },

            orderBy: {
              statementDate:
                "asc",
            },

            include: {
              bankAccount: {
                select: {
                  name: true,
                  currency:
                    true,
                },
              },

              uploadedBy: {
                select: {
                  fullName:
                    true,
                  email: true,
                },
              },
            },
          },

          cashTransactions: {
            where: {
              status:
                CashTransactionStatus.POSTED,
            },

            orderBy: [
              {
                transactionDate:
                  "asc",
              },
              {
                createdAt:
                  "asc",
              },
            ],
          },
        },
      });

    if (!period) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Accounting period not found.",
        },
        {
          status: 404,
        }
      );
    }

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Epoch Journeys";

    workbook.company =
      "Epoch Journeys OOD";

    workbook.subject =
      `EUR Accounting ${year}-${String(
        month
      ).padStart(2, "0")}`;

    workbook.created =
      new Date();

    // ======================================================
    // SUMMARY
    // ======================================================

    const summarySheet =
      workbook.addWorksheet(
        "Summary"
      );

    summarySheet.addRow([
      "Epoch Journeys OOD",
    ]);

    summarySheet.mergeCells(
      "A1:D1"
    );

    styleTitle(
      summarySheet.getCell(
        "A1"
      )
    );

    summarySheet.addRow([
      "EUR Monthly Accounting Export",
    ]);

    summarySheet.mergeCells(
      "A2:D2"
    );

    summarySheet.getCell(
      "A2"
    ).font = {
      bold: true,
      size: 13,
    };

    summarySheet.addRow([]);

    summarySheet.addRow([
      "Year",
      year,
    ]);

    summarySheet.addRow([
      "Month",
      month,
    ]);

    summarySheet.addRow([
      "Period Status",
      formatEnumLabel(
        period.status
      ),
    ]);

    summarySheet.addRow([
      "Due Date",
      formatDate(
        period.dueDate
      ),
    ]);

    summarySheet.addRow([]);

    const summaryHeader =
      summarySheet.addRow([
        "Section",
        "Count",
      ]);

    styleHeader(
      summaryHeader
    );

    summarySheet.addRow([
      "Finance Documents",
      period.documents.length,
    ]);

    summarySheet.addRow([
      "EUR Bank Statements",
      period.bankStatements
        .length,
    ]);

    summarySheet.addRow([
      "Posted Cash Transactions",
      period.cashTransactions
        .length,
    ]);

    summarySheet.addRow([
      "Total Items",
      period.documents
        .length +
        period.bankStatements
          .length +
        period.cashTransactions
          .length,
    ]);

    applyBorders(
      summarySheet
    );

    autoWidth(
      summarySheet
    );

    // ======================================================
    // DOCUMENTS
    // ======================================================

    const documentsSheet =
      workbook.addWorksheet(
        "Documents"
      );

    const documentHeader =
      documentsSheet.addRow([
        "Date",
        "Category",
        "Subcategory",
        "Document Type",
        "Title",
        "Supplier",
        "Reference",
        "Booking Reference",
        "Group",
        "Tour",
        "Bank Account",
        "Original File",
        "File Size",
        "Uploaded By",
        "Created",
      ]);

    styleHeader(
      documentHeader
    );

    for (
      const document of
      period.documents
    ) {
      documentsSheet.addRow([
        formatDate(
          document.documentDate ??
            document.createdAt
        ),

        getCategoryLabel(
          document.accountingCategory
        ),

        document.accountingSubcategory ??
          "",

        formatEnumLabel(
          document.type
        ),

        document.title,

        document.supplier?.name ??
          "",

        document.referenceNumber ??
          "",

        document.booking
          ?.bookingReference ??
          "",

        document.booking
          ?.groupName ??
          "",

        document.tour?.title ??
          "",

        document.bankAccount
          ?.name ??
          "",

        document.originalFileName,

        document.fileSize,

        document.uploadedBy
          ?.fullName ??
          document.uploadedBy
            ?.email ??
          "",

        formatDate(
          document.createdAt
        ),
      ]);
    }

    documentsSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    applyBorders(
      documentsSheet
    );

    autoWidth(
      documentsSheet
    );

    // ======================================================
    // BANK STATEMENTS
    // ======================================================

    const bankSheet =
      workbook.addWorksheet(
        "Bank Statements"
      );

    const bankHeader =
      bankSheet.addRow([
        "Statement Date",
        "Bank Account",
        "Currency",
        "Opening Balance",
        "Closing Balance",
        "Status",
        "File",
        "Notes",
        "Uploaded By",
      ]);

    styleHeader(
      bankHeader
    );

    for (
      const statement of
      period.bankStatements
    ) {
      bankSheet.addRow([
        formatDate(
          statement.statementDate
        ),

        statement.bankAccount
          .name,

        statement.currency,

        numberValue(
          statement.openingBalance
        ),

        numberValue(
          statement.closingBalance
        ),

        formatEnumLabel(
          statement.status
        ),

        statement.fileName ??
          "",

        statement.notes ??
          "",

        statement.uploadedBy
          ?.fullName ??
          statement.uploadedBy
            ?.email ??
          "",
      ]);
    }

    bankSheet.getColumn(
      4
    ).numFmt =
      '#,##0.00';

    bankSheet.getColumn(
      5
    ).numFmt =
      '#,##0.00';

    bankSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    applyBorders(
      bankSheet
    );

    autoWidth(
      bankSheet
    );

    // ======================================================
    // CASH
    // ======================================================

    const cashSheet =
      workbook.addWorksheet(
        "Cash"
      );

    const cashHeader =
      cashSheet.addRow([
        "Date",
        "Direction",
        "Counterparty",
        "Description",
        "Reference",
        "Amount",
        "Currency",
      ]);

    styleHeader(
      cashHeader
    );

    let eurCashReceived =
      0;

    let eurCashPaid =
      0;

    for (
      const transaction of
      period.cashTransactions
    ) {
      const amount =
        numberValue(
          transaction.amount
        ) ?? 0;

      const currency =
        transaction.currency
          ?.trim()
          .toUpperCase() ||
        "EUR";

      if (
        currency === "EUR"
      ) {
        if (
          transaction.direction ===
          CashTransactionDirection.RECEIPT
        ) {
          eurCashReceived +=
            amount;
        } else {
          eurCashPaid +=
            amount;
        }
      }

      cashSheet.addRow([
        formatDate(
          transaction.transactionDate
        ),

        formatEnumLabel(
          transaction.direction
        ),

        transaction.counterparty ??
          "",

        transaction.description ??
          "",

        transaction.reference ??
          "",

        amount,

        currency,
      ]);
    }

    cashSheet.getColumn(
      6
    ).numFmt =
      '#,##0.00';

    cashSheet.addRow([]);

    const cashTotalsHeader =
      cashSheet.addRow([
        "",
        "",
        "",
        "",
        "EUR TOTALS",
        "",
        "",
      ]);

    cashTotalsHeader.font = {
      bold: true,
    };

    cashSheet.addRow([
      "",
      "",
      "",
      "",
      "Received",
      eurCashReceived,
      "EUR",
    ]);

    cashSheet.addRow([
      "",
      "",
      "",
      "",
      "Paid",
      eurCashPaid,
      "EUR",
    ]);

    cashSheet.addRow([
      "",
      "",
      "",
      "",
      "Net",
      eurCashReceived -
        eurCashPaid,
      "EUR",
    ]);

    cashSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    applyBorders(
      cashSheet
    );

    autoWidth(
      cashSheet
    );

    // ======================================================
    // CATEGORY SUMMARY
    // ======================================================

    const categorySheet =
      workbook.addWorksheet(
        "Category Summary"
      );

    const categoryHeader =
      categorySheet.addRow([
        "Category",
        "Documents",
      ]);

    styleHeader(
      categoryHeader
    );

    for (
      const category of
      Object.values(
        AccountingCategory
      )
    ) {
      const count =
        period.documents.filter(
          (document) =>
            document.accountingCategory ===
            category
        ).length;

      categorySheet.addRow([
        getCategoryLabel(
          category
        ),
        count,
      ]);
    }

    applyBorders(
      categorySheet
    );

    autoWidth(
      categorySheet
    );

    // ======================================================
    // GENERATE FILE
    // ======================================================

    const buffer =
      await workbook.xlsx.writeBuffer();

    const monthLabel =
      String(month).padStart(
        2,
        "0"
      );

    const fileName =
      `Epoch-Journeys-Accounting-${year}-${monthLabel}-EUR.xlsx`;

    return new NextResponse(
      Buffer.from(buffer),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "ACCOUNTING_EUR_EXCEL_EXPORT_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create accounting Excel file.",
      },
      {
        status: 500,
      }
    );
  }
}