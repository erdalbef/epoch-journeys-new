import { FinanceTaxType, SalesDocumentType } from "@prisma/client";
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
  vatEn: "VAT not charged according to Article 21 of the Bulgarian VAT Act (Reverse Charge).",
  vatBg: "Основание за неначисляване на ДДС: чл.21 от Закона за ДДС – Обратно начисляване.",
  paymentEn: "Please include the document number and booking reference in the bank transfer.",
  paymentBg: "Моля посочете номера на документа и референтния номер на резервацията при банковия превод.",
  footerEn: "Thank you for your cooperation.",
  footerBg: "Благодарим Ви за сътрудничеството.",
};

export function documentPrefix(type: SalesDocumentType) {
  if (type === SalesDocumentType.INVOICE) return "INV";
  if (type === SalesDocumentType.CREDIT_NOTE) return "CN";
  return "PF";
}

export async function nextDocumentNumber(type: SalesDocumentType, year: number) {
  const prefix = `${documentPrefix(type)}-${year}-`;
  const last = await db.salesDocument.findFirst({
    where: { type, documentNumber: { startsWith: prefix } },
    orderBy: { documentNumber: "desc" },
    select: { documentNumber: true },
  });
  const current = Number(last?.documentNumber?.split("-").at(-1) || "0");
  return `${prefix}${String(current + 1).padStart(4, "0")}`;
}

export function calculateLine(input: {
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxType?: FinanceTaxType;
  taxRate?: number | null;
}) {
  const quantity = Math.max(0, input.quantity);
  const unitPrice = Math.max(0, input.unitPrice);
  const discountAmount = Math.max(0, input.discountAmount || 0);
  const netAmount = Math.max(0, quantity * unitPrice - discountAmount);
  const taxRate = input.taxRate || 0;
  const taxAmount = input.taxType === FinanceTaxType.NONE ? 0 : netAmount * (taxRate / 100);
  return { netAmount, taxAmount, grossAmount: netAmount + taxAmount };
}
