import fs from "node:fs";
import path from "node:path";

import { db } from "@/lib/db";
import type { SalesPdfData } from "@/lib/pdf/SalesDocumentPdf";

function date(value: Date | null) {
  return value
    ? value.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;
}

function noteValue(
  notes: string | null,
  key: string,
) {
  const line = notes
    ?.split("\n")
    .find((value) =>
      value.startsWith(`${key}:`),
    );

  return (
    line
      ?.slice(key.length + 1)
      .trim() || ""
  );
}

function additionalNotes(
  notes: string | null,
) {
  if (!notes) {
    return "";
  }

  return notes
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith(
          "PAYMENT_EN:",
        ) &&
        !line.startsWith(
          "PAYMENT_BG:",
        ) &&
        !line.startsWith(
          "ORIGINAL_INVOICE:",
        ),
    )
    .join("\n")
    .trim();
}

function dataUri(file: string) {
  try {
    const buffer =
      fs.readFileSync(file);

    return `data:image/png;base64,${buffer.toString(
      "base64",
    )}`;
  } catch {
    return null;
  }
}

export async function buildSalesPdfData(
  id: string,
): Promise<SalesPdfData | null> {
  const document =
    await db.salesDocument.findUnique({
      where: {
        id,
      },

      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        booking: {
          select: {
            bookingReference: true,
          },
        },

        originalDocument: {
          select: {
            documentNumber: true,
            issueDate: true,
          },
        },
      },
    });

  if (
    !document ||
    !document.documentNumber
  ) {
    return null;
  }

  const [
    serviceEn = "",
    serviceBg = "",
  ] =
    document.paymentTerms?.split(
      "\n---BG---\n",
    ) || [];

  const [
    vatEn = "",
    vatBg = "",
  ] =
    document.footerNotes?.split(
      "\n---BG---\n",
    ) || [];

  const logo = dataUri(
    path.join(
      process.cwd(),
      "public",
      "brand",
      "epoch-invoice-logo.png",
    ),
  );

  const fontRegular =
    path.join(
      process.cwd(),
      "public",
      "fonts",
      "NotoSans-Regular.ttf",
    );

  const fontBold =
    path.join(
      process.cwd(),
      "public",
      "fonts",
      "NotoSans-Bold.ttf",
    );

  return {
    type:
      document.type,

    documentNumber:
      document.documentNumber,

    issueDate:
      date(
        document.issueDate,
      ) || "-",

    dueDate:
      date(
        document.dueDate,
      ),

    currency:
      document.currency,

    originalDocumentNumber:
      document.originalDocument
        ?.documentNumber ??
      null,

    originalDocumentIssueDate:
      date(
        document.originalDocument
          ?.issueDate ??
          null,
      ),

    recipientName:
      document.recipientName,

    recipientCompany:
      document.recipientCompany,

    recipientEmail:
      document.recipientEmail,

    recipientEmailSecondary:
      document.recipientEmailSecondary,

    recipientAddress:
      document.recipientAddress,

    recipientCity:
      document.recipientCity,

    recipientPostalCode:
      document.recipientPostalCode,

    recipientCountry:
      document.recipientCountry,

    recipientTaxNumber:
      document.recipientTaxNumber,

    recipientVatNumber:
      document.recipientVatNumber,

    issuerName:
      document.issuerName,

    issuerAddress:
      document.issuerAddress,

    issuerCountry:
      document.issuerCountry,

    issuerVatNumber:
      document.issuerVatNumber,

    bankName:
      document.bankName,

    bankAccountName:
      document.bankAccountName,

    iban:
      document.iban,

    swiftBic:
      document.swiftBic,

    bookingReference:
      document.booking
        ?.bookingReference ||
      document.bookingReferenceSnapshot,

    groupName:
      document.groupNameSnapshot,

    tourTitle:
      document.tourTitleSnapshot,

    departureDate:
      date(
        document.departureDateSnapshot,
      ),

    subtotal:
      Number(
        document.subtotal,
      ),

    taxTotal:
      Number(
        document.taxTotal,
      ),

    totalAmount:
      Number(
        document.totalAmount,
      ),

    amountPaid:
      Number(
        document.amountPaid,
      ),

    balance:
      Number(
        document.balance,
      ),

    serviceEn,

    serviceBg,

    vatEn,

    vatBg,

    paymentEn:
      noteValue(
        document.notes,
        "PAYMENT_EN",
      ),

    paymentBg:
      noteValue(
        document.notes,
        "PAYMENT_BG",
      ),

    additionalNotes:
      additionalNotes(
        document.notes,
      ),

    items:
      document.items.map(
        (item) => ({
          description:
            item.description,

          quantity:
            Number(
              item.quantity,
            ),

          unitPrice:
            Number(
              item.unitPrice,
            ),

          taxRate:
            item.taxRate ===
            null
              ? null
              : Number(
                  item.taxRate,
                ),

          grossAmount:
            Number(
              item.grossAmount,
            ),
        }),
      ),

    logoDataUri:
      logo,

    fontRegular:
      fs.existsSync(
        fontRegular,
      )
        ? fontRegular
        : null,

    fontBold:
      fs.existsSync(
        fontBold,
      )
        ? fontBold
        : null,
  };
}