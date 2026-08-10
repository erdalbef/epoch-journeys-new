import {
  FinanceTaxType,
  SalesDocumentType,
} from "@prisma/client";

import { db } from "@/lib/db";

export const SALES_DOCUMENT_DEFAULTS = {
  issuerName: "EPOCH Journeys OOD",
  issuerLegalName: "EPOCH Journeys OOD",
  issuerAddress: "Sofia, Bulgaria",
  issuerCountry: "Bulgaria",
  issuerVatNumber: "BG208727060",

  bankName: "ProCredit Bank (Bulgaria) EAD",
  bankAccountName: "EPOCH Journeys OOD",
  iban: "BG03PRCB92301455719401",
  swiftBic: "PRCBBGSF",

  vatEn:
    "VAT not charged according to Article 21 of the Bulgarian VAT Act (Reverse Charge).",

  vatBg:
    "Основание за неначисляване на ДДС: чл.21 от Закона за ДДС – Обратно начисляване.",

  paymentEn:
    "Please include the document number and booking reference in the bank transfer.",

  paymentBg:
    "Моля посочете номера на документа и референтния номер на резервацията при банковия превод.",

  footerEn:
    "Thank you for your cooperation.",

  footerBg:
    "Благодарим Ви за сътрудничеството.",
};

const PROFORMA_START_NUMBER = 7;
const INVOICE_START_NUMBER = 5;
const CREDIT_NOTE_START_NUMBER = 1;

export function documentPrefix(
  type: SalesDocumentType,
) {
  if (type === SalesDocumentType.INVOICE) {
    return "INV";
  }

  if (type === SalesDocumentType.CREDIT_NOTE) {
    return "CN";
  }

  return "PF";
}

export async function nextDocumentNumber(
  type: SalesDocumentType,
  year: number,
) {
  /*
   * PROFORMA
   * Example:
   * PF-2026-0007
   *
   * Proforma numbering is independent by year.
   */
  if (type === SalesDocumentType.PROFORMA) {
    const prefix = `PF-${year}-`;

    const documents =
      await db.salesDocument.findMany({
        where: {
          type: SalesDocumentType.PROFORMA,
          documentNumber: {
            startsWith: prefix,
          },
        },
        select: {
          documentNumber: true,
        },
      });

    const highestExisting = documents.reduce(
      (highest, document) => {
        const numberPart =
          document.documentNumber
            ?.split("-")
            .at(-1) || "0";

        const parsed = Number(numberPart);

        if (
          Number.isFinite(parsed) &&
          parsed > highest
        ) {
          return parsed;
        }

        return highest;
      },
      0,
    );

    const nextNumber = Math.max(
      PROFORMA_START_NUMBER,
      highestExisting + 1,
    );

    return `${prefix}${String(nextNumber).padStart(
      4,
      "0",
    )}`;
  }

  /*
   * OFFICIAL INVOICE
   *
   * Starts from:
   * 0000000005
   *
   * Then:
   * 0000000006
   * 0000000007
   *
   * This is intentionally independent from
   * Proforma numbering.
   */
  if (type === SalesDocumentType.INVOICE) {
    const documents =
      await db.salesDocument.findMany({
        where: {
          type: SalesDocumentType.INVOICE,
          documentNumber: {
            not: null,
          },
        },
        select: {
          documentNumber: true,
        },
      });

    const highestExisting = documents.reduce(
      (highest, document) => {
        if (!document.documentNumber) {
          return highest;
        }

        /*
         * Supports both:
         *
         * 0000000005
         *
         * and any older test format such as:
         *
         * INV-2026-0004
         */
        const numericPart =
          document.documentNumber.includes("-")
            ? document.documentNumber
                .split("-")
                .at(-1)
            : document.documentNumber;

        const parsed = Number(numericPart);

        if (
          Number.isFinite(parsed) &&
          parsed > highest
        ) {
          return parsed;
        }

        return highest;
      },
      0,
    );

    const nextNumber = Math.max(
      INVOICE_START_NUMBER,
      highestExisting + 1,
    );

    return String(nextNumber).padStart(10, "0");
  }

  /*
   * CREDIT NOTE
   *
   * Separate sequence:
   * CN-2026-0001
   */
  const prefix = `CN-${year}-`;

  const documents =
    await db.salesDocument.findMany({
      where: {
        type: SalesDocumentType.CREDIT_NOTE,
        documentNumber: {
          startsWith: prefix,
        },
      },
      select: {
        documentNumber: true,
      },
    });

  const highestExisting = documents.reduce(
    (highest, document) => {
      const numberPart =
        document.documentNumber
          ?.split("-")
          .at(-1) || "0";

      const parsed = Number(numberPart);

      if (
        Number.isFinite(parsed) &&
        parsed > highest
      ) {
        return parsed;
      }

      return highest;
    },
    0,
  );

  const nextNumber = Math.max(
    CREDIT_NOTE_START_NUMBER,
    highestExisting + 1,
  );

  return `${prefix}${String(nextNumber).padStart(
    4,
    "0",
  )}`;
}

export function calculateLine(input: {
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxType?: FinanceTaxType;
  taxRate?: number | null;
}) {
  const quantity = Math.max(0, input.quantity);

  const unitPrice = Math.max(
    0,
    input.unitPrice,
  );

  const discountAmount = Math.max(
    0,
    input.discountAmount || 0,
  );

  const netAmount = Math.max(
    0,
    quantity * unitPrice - discountAmount,
  );

  const taxRate = input.taxRate || 0;

  const taxAmount =
    input.taxType === FinanceTaxType.NONE
      ? 0
      : netAmount * (taxRate / 100);

  return {
    netAmount,
    taxAmount,
    grossAmount: netAmount + taxAmount,
  };
}