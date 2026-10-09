import React from "react";
import fs from "fs/promises";
import path from "path";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  AccountingCategory,
  FinanceDocumentType,
  Role,
  SalesDocumentStatus,
  SalesDocumentType,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { buildSalesPdfData } from "@/lib/sales-document-pdf-data";
import { SalesDocumentPdf } from "@/lib/pdf/SalesDocumentPdf";
import { nextDocumentNumber } from "@/lib/sales-documents";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function safeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .trim();
}

function isAccountingSalesDocument(type: SalesDocumentType) {
  return (
    type === SalesDocumentType.INVOICE ||
    type === SalesDocumentType.CREDIT_NOTE
  );
}

function financeDocumentType(type: SalesDocumentType) {
  return type === SalesDocumentType.CREDIT_NOTE
    ? FinanceDocumentType.CREDIT_NOTE
    : FinanceDocumentType.INVOICE;
}

function accountingSubcategory(type: SalesDocumentType) {
  return type === SalesDocumentType.CREDIT_NOTE
    ? "Credit Notes"
    : "Sales Invoices";
}

function accountingTitle(
  type: SalesDocumentType,
  documentNumber: string,
) {
  return type === SalesDocumentType.CREDIT_NOTE
    ? `Credit Note ${documentNumber}`
    : `Invoice ${documentNumber}`;
}

async function createAccountingPdf(
  salesDocumentId: string,
  userId: string,
) {
  const document =
    await db.salesDocument.findUnique({
      where: {
        id: salesDocumentId,
      },
      select: {
        id: true,
        type: true,
        status: true,
        documentNumber: true,
        issueDate: true,
        bookingId: true,
        financeDocument: {
          select: {
            id: true,
            storagePath: true,
          },
        },
      },
    });

  if (!document) {
    throw new Error("Document not found.");
  }

  if (!isAccountingSalesDocument(document.type)) {
    return;
  }

  if (!document.documentNumber || !document.issueDate) {
    throw new Error(
      "The sales document must be issued before its accounting PDF can be created.",
    );
  }

  if (document.status === SalesDocumentStatus.CANCELLED) {
    throw new Error(
      "Cancelled sales documents cannot be added to the accounting package.",
    );
  }

  if (document.financeDocument) {
    return;
  }

  const pdfData =
    await buildSalesPdfData(document.id);

  if (!pdfData) {
    throw new Error(
      "Could not prepare the issued document for PDF generation.",
    );
  }

  if (!pdfData.fontRegular || !pdfData.fontBold) {
    throw new Error(
      "Bulgarian PDF font files are missing. Add NotoSans-Regular.ttf and NotoSans-Bold.ttf under public/fonts.",
    );
  }

  const pdfElement = React.createElement(
    SalesDocumentPdf,
    {
      data: pdfData,
    },
  ) as Parameters<typeof renderToBuffer>[0];

  const rendered =
    await renderToBuffer(
      pdfElement,
    );

  const pdfBuffer = Buffer.from(rendered);

  const year =
    document.issueDate.getUTCFullYear();

  const month =
    document.issueDate.getUTCMonth() + 1;

  const monthFolder =
    String(month).padStart(2, "0");

  const documentNumberFile =
    safeFileName(document.documentNumber);

  const storedFileName =
    `${documentNumberFile}.pdf`;

  const relativeStoragePath =
    `/uploads/accounting/${year}/${monthFolder}/02-sales-income/${storedFileName}`;

  const absoluteDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "accounting",
    String(year),
    monthFolder,
    "02-sales-income",
  );

  const absoluteFilePath =
    path.join(
      absoluteDirectory,
      storedFileName,
    );

  await fs.mkdir(
    absoluteDirectory,
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    absoluteFilePath,
    pdfBuffer,
  );

  try {
    await db.$transaction(
      async (tx) => {
        const period =
          await tx.accountingPeriod.upsert({
            where: {
              year_month: {
                year,
                month,
              },
            },
            update: {},
            create: {
              year,
              month,
            },
            select: {
              id: true,
            },
          });

        await tx.financeDocument.create({
          data: {
            type:
              financeDocumentType(
                document.type,
              ),

            title:
              accountingTitle(
                document.type,
                document.documentNumber!,
              ),

            description:
              "Automatically created from an issued Epoch Journeys sales document.",

            originalFileName:
              storedFileName,

            storedFileName,

            storagePath:
              relativeStoragePath,

            mimeType:
              "application/pdf",

            fileSize:
              pdfBuffer.length,

            documentDate:
              document.issueDate,

            referenceNumber:
              document.documentNumber,

            notes:
              "Official issued sales document. Generated automatically for the monthly accounting package.",

            salesDocumentId:
              document.id,

            bookingId:
              document.bookingId,

            uploadedById:
              userId,

            accountingCategory:
              AccountingCategory.SALES_INCOME,

            accountingPeriodId:
              period.id,

            accountingSubcategory:
              accountingSubcategory(
                document.type,
              ),
          },
        });

        await tx.salesDocument.update({
          where: {
            id: document.id,
          },
          data: {
            pdfUrl:
              relativeStoragePath,
            pdfGeneratedAt:
              new Date(),
          },
        });
      },
    );
  } catch (error) {
    try {
      await fs.unlink(
        absoluteFilePath,
      );
    } catch {
      // The database error is the important error.
      // Ignore cleanup failure here.
    }

    throw error;
  }
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } =
      await context.params;

    let current =
      await db.salesDocument.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          type: true,
          status: true,
          issueDate: true,
          documentNumber: true,
          financeDocument: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          error:
            "Document not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Normal issue flow.
     *
     * Only drafts receive a new official
     * document number.
     */
    if (
      current.status ===
      SalesDocumentStatus.DRAFT
    ) {
      let issued = false;

      for (
        let attempt = 0;
        attempt < 3;
        attempt += 1
      ) {
        try {
          const now =
            new Date();

          const issueDate =
            current.issueDate ||
            now;

          const number =
            await nextDocumentNumber(
              current.type,
              issueDate.getUTCFullYear(),
            );

          await db.salesDocument.update({
            where: {
              id,
            },
            data: {
              documentNumber:
                number,
              status:
                SalesDocumentStatus.ISSUED,
              issueDate,
              issuedAt:
                now,
              issuedById:
                session.user.id,
            },
          });

          issued = true;
          break;
        } catch (error) {
          if (attempt === 2) {
            console.error(
              "ISSUE_SALES_DOCUMENT_NUMBER_ERROR",
              error,
            );

            return NextResponse.json(
              {
                error:
                  "Could not assign the document number. Please try again.",
              },
              {
                status: 409,
              },
            );
          }
        }
      }

      if (!issued) {
        return NextResponse.json(
          {
            error:
              "Could not issue document.",
          },
          {
            status: 500,
          },
        );
      }

      current =
        await db.salesDocument.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            type: true,
            status: true,
            issueDate: true,
            documentNumber: true,
            financeDocument: {
              select: {
                id: true,
              },
            },
          },
        });

      if (!current) {
        return NextResponse.json(
          {
            error:
              "Issued document could not be reloaded.",
          },
          {
            status: 500,
          },
        );
      }
    } else {
      /*
       * Allow a safe repair/retry for an
       * already-issued Invoice or Credit Note
       * if its accounting PDF was not created.
       *
       * This is useful if PDF/file creation
       * failed after the official number was
       * assigned.
       */
      const repairableStatus =
        current.status ===
          SalesDocumentStatus.ISSUED ||
        current.status ===
          SalesDocumentStatus.SENT ||
        current.status ===
          SalesDocumentStatus.PARTIALLY_PAID ||
        current.status ===
          SalesDocumentStatus.PAID;

      const canRepairAccountingPdf =
        repairableStatus &&
        isAccountingSalesDocument(
          current.type,
        ) &&
        !current.financeDocument;

      if (!canRepairAccountingPdf) {
        return NextResponse.json(
          {
            error:
              "Only draft documents can be issued.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /*
     * Proformas remain Sales Documents but
     * are intentionally excluded from the
     * official monthly accounting package.
     */
    if (
      isAccountingSalesDocument(
        current.type,
      )
    ) {
      try {
        await createAccountingPdf(
          current.id,
          session.user.id,
        );
      } catch (error) {
        console.error(
          "CREATE_SALES_ACCOUNTING_PDF_ERROR",
          error,
        );

        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? `Document issued, but the accounting PDF could not be created: ${error.message}`
                : "Document issued, but the accounting PDF could not be created.",
            issued:
              true,
            id:
              current.id,
            documentNumber:
              current.documentNumber,
          },
          {
            status: 500,
          },
        );
      }
    }

    const result =
      await db.salesDocument.findUnique({
        where: {
          id: current.id,
        },
        select: {
          id: true,
          documentNumber: true,
          type: true,
          status: true,
          pdfUrl: true,
          financeDocument: {
            select: {
              id: true,
              accountingCategory: true,
              accountingSubcategory: true,
              accountingPeriod: {
                select: {
                  year: true,
                  month: true,
                },
              },
            },
          },
        },
      });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Issued document could not be loaded.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      id:
        result.id,
      documentNumber:
        result.documentNumber,
      type:
        result.type,
      status:
        result.status,
      pdfUrl:
        result.pdfUrl,
      accountingDocument:
        result.financeDocument,
    });
  } catch (error) {
    console.error(
      "ISSUE_SALES_DOCUMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not issue document.",
      },
      {
        status: 500,
      },
    );
  }
}
