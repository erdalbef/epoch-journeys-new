import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import {
  AccountingCategory,
  BankTransactionStatus,
  ExpenseApprovalStatus,
  PaymentRecordStatus,
  Role,
  SalesDocumentStatus,
  SupplierPayableApprovalStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    year: string;
    month: string;
  }>;
};

const EUR = "EUR";

function getMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end =
    month === 12
      ? new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
      : new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return { start, end };
}

function getMonthName(month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function enumLabel(value: string | null | undefined) {
  if (!value) return "";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function numberValue(value: unknown) {
  if (value === null || value === undefined) return 0;

  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function setStandardSheetLayout(
  sheet: ExcelJS.Worksheet,
  headerRowNumber = 1,
) {
  sheet.views = [{ state: "frozen", ySplit: headerRowNumber }];

  const headerRow = sheet.getRow(headerRowNumber);
  headerRow.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0B1F3A" },
  };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "left",
  };
  headerRow.height = 22;

  if (sheet.columnCount > 0 && sheet.rowCount >= headerRowNumber) {
    sheet.autoFilter = {
      from: {
        row: headerRowNumber,
        column: 1,
      },
      to: {
        row: headerRowNumber,
        column: sheet.columnCount,
      },
    };
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    row.alignment = {
      vertical: "top",
      wrapText: true,
    };
  });
}

function applyCurrencyFormat(
  sheet: ExcelJS.Worksheet,
  columnKeys: string[],
) {
  for (const key of columnKeys) {
    const column = sheet.getColumn(key);
    column.numFmt = '#,##0.00';
  }
}

function addSummaryLine(
  sheet: ExcelJS.Worksheet,
  label: string,
  amount: number | string,
  note = "",
) {
  sheet.addRow({
    metric: label,
    amount,
    currency: typeof amount === "number" ? EUR : "",
    note,
  });
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { year: yearParam, month: monthParam } =
      await context.params;

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      year < 2000 ||
      year > 2100 ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          error: "Invalid accounting period.",
        },
        {
          status: 400,
        },
      );
    }

    const { start, end } = getMonthRange(year, month);

    const [
      salesDocuments,
      customerPayments,
      supplierPayables,
      additionalExpenses,
      ownerPersonalDocuments,
      bankTransactions,
    ] = await Promise.all([
      db.salesDocument.findMany({
        where: {
          currency: EUR,
          issueDate: {
            gte: start,
            lt: end,
          },
          status: {
            in: [
              SalesDocumentStatus.ISSUED,
              SalesDocumentStatus.SENT,
              SalesDocumentStatus.PARTIALLY_PAID,
              SalesDocumentStatus.PAID,
            ],
          },
        },
        orderBy: [
          {
            issueDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          type: true,
          status: true,
          documentNumber: true,
          issueDate: true,
          dueDate: true,
          currency: true,
          subtotal: true,
          discountTotal: true,
          taxTotal: true,
          totalAmount: true,
          amountPaid: true,
          balance: true,
          recipientName: true,
          recipientCompany: true,
          bookingReferenceSnapshot: true,
          tourTitleSnapshot: true,
          groupNameSnapshot: true,
          notes: true,
        },
      }),

      db.payment.findMany({
        where: {
          currency: EUR,
          status: PaymentRecordStatus.RECEIVED,
          paidAt: {
            gte: start,
            lt: end,
          },
        },
        orderBy: [
          {
            paidAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          reference: true,
          notes: true,
          paidAt: true,
          booking: {
            select: {
              bookingReference: true,
              bookingDisplayCode: true,
              groupName: true,
              customerName: true,
              agencyNameSnapshot: true,
              agentNameSnapshot: true,
              tourTitleSnapshot: true,
            },
          },
          bankTransactions: {
            where: {
              status: BankTransactionStatus.POSTED,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              bankAccount: {
                select: {
                  name: true,
                  currency: true,
                },
              },
            },
          },
        },
      }),

      db.supplierPayable.findMany({
        where: {
          currency: EUR,
          approvalStatus: SupplierPayableApprovalStatus.APPROVED,
          OR: [
            {
              invoiceDate: {
                gte: start,
                lt: end,
              },
            },
            {
              invoiceDate: null,
              createdAt: {
                gte: start,
                lt: end,
              },
            },
          ],
        },
        orderBy: [
          {
            invoiceDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          title: true,
          supplierInvoiceNumber: true,
          supplierReference: true,
          invoiceDate: true,
          dueDate: true,
          currency: true,
          contractedAmount: true,
          approvedAmount: true,
          creditAmount: true,
          amountPaid: true,
          balance: true,
          approvalStatus: true,
          paymentStatus: true,
          supplierNameSnapshot: true,
          serviceNameSnapshot: true,
          rateNameSnapshot: true,
          internalNotes: true,
          tour: {
            select: {
              title: true,
            },
          },
          booking: {
            select: {
              bookingReference: true,
              bookingDisplayCode: true,
              groupName: true,
            },
          },
        },
      }),

      db.expense.findMany({
        where: {
          currency: EUR,
          approvalStatus: ExpenseApprovalStatus.APPROVED,
          expenseDate: {
            gte: start,
            lt: end,
          },
        },
        orderBy: [
          {
            expenseDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          currency: true,
          category: true,
          paymentStatus: true,
          vendorName: true,
          expenseDate: true,
          paidAt: true,
          notes: true,
          costCenter: true,
          costType: true,
          expenseItem: true,
          paymentMethod: true,
          paymentReference: true,
          supplierInvoiceNumber: true,
          bankAccount: {
            select: {
              name: true,
              currency: true,
            },
          },
          tour: {
            select: {
              title: true,
            },
          },
          booking: {
            select: {
              bookingReference: true,
              bookingDisplayCode: true,
              groupName: true,
            },
          },
        },
      }),

      db.financeDocument.findMany({
        where: {
          accountingCategory:
            AccountingCategory.OWNER_PERSONAL_PAYMENTS,
          accountingPeriod: {
            is: {
              year,
              month,
            },
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
          type: true,
          title: true,
          description: true,
          documentDate: true,
          referenceNumber: true,
          notes: true,
          originalFileName: true,
          accountingSubcategory: true,
          bankAccount: {
            select: {
              name: true,
              currency: true,
            },
          },
          bankTransaction: {
            select: {
              amount: true,
              currency: true,
              direction: true,
              transactionDate: true,
              reference: true,
              description: true,
            },
          },
        },
      }),

      db.bankTransaction.findMany({
        where: {
          currency: EUR,
          status: BankTransactionStatus.POSTED,
          transactionDate: {
            gte: start,
            lt: end,
          },
        },
        orderBy: [
          {
            transactionDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          type: true,
          direction: true,
          status: true,
          amount: true,
          currency: true,
          transactionDate: true,
          valueDate: true,
          reference: true,
          description: true,
          notes: true,
          bankAccount: {
            select: {
              name: true,
              currency: true,
            },
          },
          booking: {
            select: {
              bookingReference: true,
              bookingDisplayCode: true,
              groupName: true,
            },
          },
          tour: {
            select: {
              title: true,
            },
          },
        },
      }),
    ]);

    const eurOwnerPersonalDocuments =
      ownerPersonalDocuments.filter((document) => {
        const currency =
          document.bankTransaction?.currency ??
          document.bankAccount?.currency ??
          null;

        return currency === EUR;
      });

    const salesInvoicedTotal = salesDocuments
      .filter((document) => document.type !== "CREDIT_NOTE")
      .reduce(
        (sum, document) =>
          sum + numberValue(document.totalAmount),
        0,
      );

    const salesCreditNoteTotal = salesDocuments
      .filter((document) => document.type === "CREDIT_NOTE")
      .reduce(
        (sum, document) =>
          sum + numberValue(document.totalAmount),
        0,
      );

    const customerPaymentsReceivedTotal =
      customerPayments.reduce(
        (sum, payment) => sum + numberValue(payment.amount),
        0,
      );

    const supplierApprovedTotal =
      supplierPayables.reduce(
        (sum, payable) =>
          sum +
          Math.max(
            0,
            numberValue(payable.approvedAmount) -
              numberValue(payable.creditAmount),
          ),
        0,
      );

    const supplierPaidTotal =
      supplierPayables.reduce(
        (sum, payable) =>
          sum + numberValue(payable.amountPaid),
        0,
      );

    const additionalExpensesTotal =
      additionalExpenses.reduce(
        (sum, expense) => sum + numberValue(expense.amount),
        0,
      );

    const ownerPersonalTotal =
      eurOwnerPersonalDocuments.reduce(
        (sum, document) =>
          sum + numberValue(document.bankTransaction?.amount),
        0,
      );

    const bankInTotal = bankTransactions
      .filter((transaction) => transaction.direction === "IN")
      .reduce(
        (sum, transaction) =>
          sum + numberValue(transaction.amount),
        0,
      );

    const bankOutTotal = bankTransactions
      .filter((transaction) => transaction.direction === "OUT")
      .reduce(
        (sum, transaction) =>
          sum + numberValue(transaction.amount),
        0,
      );

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Epoch Journeys";
    workbook.company = "Epoch Journeys OOD";
    workbook.subject =
      `EUR Accounting Summary - ${getMonthName(month)} ${year}`;
    workbook.title =
      `Epoch Journeys Accounting ${year}-${String(month).padStart(2, "0")} EUR`;
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet("Summary");

    summarySheet.columns = [
      {
        header: "Metric",
        key: "metric",
        width: 34,
      },
      {
        header: "Amount",
        key: "amount",
        width: 18,
      },
      {
        header: "Currency",
        key: "currency",
        width: 12,
      },
      {
        header: "Note",
        key: "note",
        width: 60,
      },
    ];

    addSummaryLine(
      summarySheet,
      "Accounting Period",
      `${getMonthName(month)} ${year}`,
      "EUR-only accountant export",
    );
    addSummaryLine(
      summarySheet,
      "Sales Documents - Gross Invoiced",
      salesInvoicedTotal,
      "Issued sales documents excluding credit notes",
    );
    addSummaryLine(
      summarySheet,
      "Sales Credit Notes",
      salesCreditNoteTotal,
      "Shown separately; do not add to gross invoiced total",
    );
    addSummaryLine(
      summarySheet,
      "Customer Payments Received",
      customerPaymentsReceivedTotal,
      "Cash received from customers during this month",
    );
    addSummaryLine(
      summarySheet,
      "Supplier Costs - Net Approved",
      supplierApprovedTotal,
      "Approved amount less supplier credit notes",
    );
    addSummaryLine(
      summarySheet,
      "Supplier Payments Recorded",
      supplierPaidTotal,
      "Amount paid against the supplier payables listed for this month",
    );
    addSummaryLine(
      summarySheet,
      "Additional Expenses",
      additionalExpensesTotal,
      "Approved standalone expenses",
    );
    addSummaryLine(
      summarySheet,
      "Owner / Personal Payments",
      ownerPersonalTotal,
      "Amount is taken from the linked EUR bank transaction",
    );
    addSummaryLine(
      summarySheet,
      "Bank Ledger In",
      bankInTotal,
      "All posted EUR ledger inflows; includes movements that may also appear on other sheets",
    );
    addSummaryLine(
      summarySheet,
      "Bank Ledger Out",
      bankOutTotal,
      "All posted EUR ledger outflows; includes movements that may also appear on other sheets",
    );
    addSummaryLine(
      summarySheet,
      "Net Bank Ledger Movement",
      bankInTotal - bankOutTotal,
      "Bank Ledger In minus Bank Ledger Out",
    );

    setStandardSheetLayout(summarySheet);
    applyCurrencyFormat(summarySheet, ["amount"]);

    const incomeSheet = workbook.addWorksheet("Income");

    incomeSheet.columns = [
      {
        header: "Record Type",
        key: "recordType",
        width: 22,
      },
      {
        header: "Date",
        key: "date",
        width: 14,
      },
      {
        header: "Document / Reference",
        key: "reference",
        width: 24,
      },
      {
        header: "Client / Group",
        key: "client",
        width: 32,
      },
      {
        header: "Booking",
        key: "booking",
        width: 22,
      },
      {
        header: "Tour",
        key: "tour",
        width: 34,
      },
      {
        header: "Status / Method",
        key: "status",
        width: 22,
      },
      {
        header: "Amount",
        key: "amount",
        width: 16,
      },
      {
        header: "Currency",
        key: "currency",
        width: 10,
      },
      {
        header: "Notes",
        key: "notes",
        width: 44,
      },
    ];

    for (const document of salesDocuments) {
      incomeSheet.addRow({
        recordType:
          document.type === "CREDIT_NOTE"
            ? "Sales Credit Note"
            : `Sales ${enumLabel(document.type)}`,
        date: isoDate(document.issueDate),
        reference: document.documentNumber ?? "",
        client:
          document.recipientCompany ??
          document.recipientName ??
          document.groupNameSnapshot ??
          "",
        booking: document.bookingReferenceSnapshot ?? "",
        tour: document.tourTitleSnapshot ?? "",
        status: enumLabel(document.status),
        amount: numberValue(document.totalAmount),
        currency: document.currency,
        notes: document.notes ?? "",
      });
    }

    for (const payment of customerPayments) {
      incomeSheet.addRow({
        recordType: "Customer Payment",
        date: isoDate(payment.paidAt),
        reference: payment.reference ?? "",
        client:
          payment.booking?.agencyNameSnapshot ??
          payment.booking?.agentNameSnapshot ??
          payment.booking?.groupName ??
          payment.booking?.customerName ??
          "",
        booking:
          payment.booking?.bookingDisplayCode ??
          payment.booking?.bookingReference,
        tour: payment.booking?.tourTitleSnapshot ?? "",
        status: enumLabel(payment.method),
        amount: numberValue(payment.amount),
        currency: payment.currency,
        notes: payment.notes ?? "",
      });
    }

    setStandardSheetLayout(incomeSheet);
    applyCurrencyFormat(incomeSheet, ["amount"]);

    const supplierSheet =
      workbook.addWorksheet("Supplier Expenses");

    supplierSheet.columns = [
      {
        header: "Invoice Date",
        key: "invoiceDate",
        width: 14,
      },
      {
        header: "Supplier",
        key: "supplier",
        width: 30,
      },
      {
        header: "Service",
        key: "service",
        width: 28,
      },
      {
        header: "Title",
        key: "title",
        width: 36,
      },
      {
        header: "Supplier Invoice No.",
        key: "invoiceNo",
        width: 22,
      },
      {
        header: "Supplier Reference",
        key: "supplierReference",
        width: 22,
      },
      {
        header: "Tour / Group",
        key: "tourGroup",
        width: 34,
      },
      {
        header: "Approved",
        key: "approved",
        width: 16,
      },
      {
        header: "Credit",
        key: "credit",
        width: 14,
      },
      {
        header: "Net Expense",
        key: "netExpense",
        width: 16,
      },
      {
        header: "Paid",
        key: "paid",
        width: 16,
      },
      {
        header: "Balance",
        key: "balance",
        width: 16,
      },
      {
        header: "Currency",
        key: "currency",
        width: 10,
      },
      {
        header: "Payment Status",
        key: "paymentStatus",
        width: 20,
      },
      {
        header: "Due Date",
        key: "dueDate",
        width: 14,
      },
      {
        header: "Notes",
        key: "notes",
        width: 40,
      },
    ];

    for (const payable of supplierPayables) {
      const approved = numberValue(payable.approvedAmount);
      const credit = numberValue(payable.creditAmount);

      supplierSheet.addRow({
        invoiceDate: isoDate(payable.invoiceDate),
        supplier: payable.supplierNameSnapshot,
        service: payable.serviceNameSnapshot ?? "",
        title: payable.title,
        invoiceNo: payable.supplierInvoiceNumber ?? "",
        supplierReference: payable.supplierReference ?? "",
        tourGroup:
          payable.tour?.title ??
          payable.booking?.groupName ??
          payable.booking?.bookingDisplayCode ??
          payable.booking?.bookingReference ??
          "",
        approved,
        credit,
        netExpense: Math.max(0, approved - credit),
        paid: numberValue(payable.amountPaid),
        balance: numberValue(payable.balance),
        currency: payable.currency,
        paymentStatus: enumLabel(payable.paymentStatus),
        dueDate: isoDate(payable.dueDate),
        notes: payable.internalNotes ?? "",
      });
    }

    setStandardSheetLayout(supplierSheet);
    applyCurrencyFormat(supplierSheet, [
      "approved",
      "credit",
      "netExpense",
      "paid",
      "balance",
    ]);

    const expenseSheet =
      workbook.addWorksheet("Additional Expenses");

    expenseSheet.columns = [
      {
        header: "Date",
        key: "date",
        width: 14,
      },
      {
        header: "Title",
        key: "title",
        width: 34,
      },
      {
        header: "Vendor",
        key: "vendor",
        width: 28,
      },
      {
        header: "Category",
        key: "category",
        width: 22,
      },
      {
        header: "Expense Item",
        key: "expenseItem",
        width: 28,
      },
      {
        header: "Cost Center",
        key: "costCenter",
        width: 22,
      },
      {
        header: "Cost Type",
        key: "costType",
        width: 18,
      },
      {
        header: "Tour / Group",
        key: "tourGroup",
        width: 34,
      },
      {
        header: "Bank Account",
        key: "bankAccount",
        width: 24,
      },
      {
        header: "Payment Method",
        key: "paymentMethod",
        width: 20,
      },
      {
        header: "Payment Reference",
        key: "paymentReference",
        width: 24,
      },
      {
        header: "Amount",
        key: "amount",
        width: 16,
      },
      {
        header: "Currency",
        key: "currency",
        width: 10,
      },
      {
        header: "Payment Status",
        key: "paymentStatus",
        width: 20,
      },
      {
        header: "Notes",
        key: "notes",
        width: 42,
      },
    ];

    for (const expense of additionalExpenses) {
      expenseSheet.addRow({
        date: isoDate(expense.expenseDate),
        title: expense.title,
        vendor: expense.vendorName ?? "",
        category: enumLabel(expense.category),
        expenseItem: enumLabel(expense.expenseItem),
        costCenter: enumLabel(expense.costCenter),
        costType: enumLabel(expense.costType),
        tourGroup:
          expense.tour?.title ??
          expense.booking?.groupName ??
          expense.booking?.bookingDisplayCode ??
          expense.booking?.bookingReference ??
          "",
        bankAccount: expense.bankAccount?.name ?? "",
        paymentMethod: enumLabel(expense.paymentMethod),
        paymentReference:
          expense.paymentReference ??
          expense.supplierInvoiceNumber ??
          "",
        amount: numberValue(expense.amount),
        currency: expense.currency,
        paymentStatus: enumLabel(expense.paymentStatus),
        notes:
          expense.notes ??
          expense.description ??
          "",
      });
    }

    setStandardSheetLayout(expenseSheet);
    applyCurrencyFormat(expenseSheet, ["amount"]);

    const ownerSheet =
      workbook.addWorksheet("Owner Personal Payments");

    ownerSheet.columns = [
      {
        header: "Date",
        key: "date",
        width: 14,
      },
      {
        header: "Document Type",
        key: "type",
        width: 24,
      },
      {
        header: "Title",
        key: "title",
        width: 36,
      },
      {
        header: "Reference",
        key: "reference",
        width: 24,
      },
      {
        header: "Bank Account",
        key: "bankAccount",
        width: 24,
      },
      {
        header: "Direction",
        key: "direction",
        width: 14,
      },
      {
        header: "Amount",
        key: "amount",
        width: 16,
      },
      {
        header: "Currency",
        key: "currency",
        width: 10,
      },
      {
        header: "Supporting File",
        key: "file",
        width: 34,
      },
      {
        header: "Notes",
        key: "notes",
        width: 46,
      },
    ];

    for (const document of eurOwnerPersonalDocuments) {
      const transaction = document.bankTransaction;

      ownerSheet.addRow({
        date: isoDate(
          document.documentDate ??
            transaction?.transactionDate ??
            null,
        ),
        type: enumLabel(document.type),
        title: document.title,
        reference:
          document.referenceNumber ??
          transaction?.reference ??
          "",
        bankAccount: document.bankAccount?.name ?? "",
        direction: enumLabel(transaction?.direction),
        amount: numberValue(transaction?.amount),
        currency:
          transaction?.currency ??
          document.bankAccount?.currency ??
          "",
        file: document.originalFileName,
        notes:
          document.notes ??
          document.description ??
          transaction?.description ??
          "",
      });
    }

    setStandardSheetLayout(ownerSheet);
    applyCurrencyFormat(ownerSheet, ["amount"]);

    const bankSheet =
      workbook.addWorksheet("Bank Transactions");

    bankSheet.columns = [
      {
        header: "Transaction Date",
        key: "date",
        width: 16,
      },
      {
        header: "Value Date",
        key: "valueDate",
        width: 14,
      },
      {
        header: "Bank Account",
        key: "bankAccount",
        width: 26,
      },
      {
        header: "Type",
        key: "type",
        width: 24,
      },
      {
        header: "Direction",
        key: "direction",
        width: 14,
      },
      {
        header: "Reference",
        key: "reference",
        width: 24,
      },
      {
        header: "Description",
        key: "description",
        width: 44,
      },
      {
        header: "Booking / Group",
        key: "booking",
        width: 30,
      },
      {
        header: "Tour",
        key: "tour",
        width: 32,
      },
      {
        header: "Amount",
        key: "amount",
        width: 16,
      },
      {
        header: "Currency",
        key: "currency",
        width: 10,
      },
      {
        header: "Notes",
        key: "notes",
        width: 40,
      },
    ];

    for (const transaction of bankTransactions) {
      bankSheet.addRow({
        date: isoDate(transaction.transactionDate),
        valueDate: isoDate(transaction.valueDate),
        bankAccount: transaction.bankAccount.name,
        type: enumLabel(transaction.type),
        direction: enumLabel(transaction.direction),
        reference: transaction.reference ?? "",
        description: transaction.description ?? "",
        booking:
          transaction.booking?.groupName ??
          transaction.booking?.bookingDisplayCode ??
          transaction.booking?.bookingReference ??
          "",
        tour: transaction.tour?.title ?? "",
        amount: numberValue(transaction.amount),
        currency: transaction.currency,
        notes: transaction.notes ?? "",
      });
    }

    setStandardSheetLayout(bankSheet);
    applyCurrencyFormat(bankSheet, ["amount"]);

    for (const sheet of workbook.worksheets) {
      sheet.properties.defaultRowHeight = 18;
      sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };
      sheet.headerFooter.oddFooter =
        "&LEpoch Journeys OOD&CConfidential Accounting Export&RPage &P of &N";
    }

    const output = await workbook.xlsx.writeBuffer();
    const fileName =
      `Epoch-Journeys-Accounting-${year}-${String(month).padStart(2, "0")}-EUR.xlsx`;

    return new NextResponse(Buffer.from(output), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="${fileName}"`,
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error(
      "EUR_ACCOUNTING_EXCEL_EXPORT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create EUR accounting Excel workbook.",
      },
      {
        status: 500,
      },
    );
  }
}
