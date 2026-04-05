import { QuoteItem } from "@prisma/client";

export function calculateQuoteTotals(items: Array<Pick<QuoteItem, "quantity" | "unitPrice" | "discountAmount" | "taxAmount">>) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const totalAmount = subtotal - discountTotal + taxTotal;

  return {
    subtotal,
    discountTotal,
    taxTotal,
    totalAmount,
  };
}

export function generateQuoteReference(quoteNumber: number) {
  return `QT-${String(quoteNumber).padStart(6, "0")}`;
}