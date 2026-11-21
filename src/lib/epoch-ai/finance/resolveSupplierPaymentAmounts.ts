import { Prisma } from "@prisma/client";

export type SupplierPaymentAmountsInput = {
  payableCurrency: string;
  bankCurrency: string;
  supplierAmount: string | Prisma.Decimal;
  bankDebitAmount?: string | Prisma.Decimal | null;
};

function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("A valid three-letter currency code is required.");
  }

  return currency;
}

function parseAmount(
  value: string | Prisma.Decimal,
  field: string,
): Prisma.Decimal {
  let amount: Prisma.Decimal;

  try {
    amount = new Prisma.Decimal(value);
  } catch {
    throw new Error(`${field} is not a valid amount.`);
  }

  if (!amount.isFinite() || amount.lte(0)) {
    throw new Error(`${field} must be a positive finite amount.`);
  }

  // Existing supplier-payment and bank-ledger columns use Decimal(12,2).
  if (amount.decimalPlaces() > 2) {
    throw new Error(`${field} cannot exceed two decimal places.`);
  }

  if (amount.gt("9999999999.99")) {
    throw new Error(`${field} exceeds the supported amount range.`);
  }

  return amount;
}

/**
 * Resolves payment amounts without converting currencies implicitly.
 *
 * The supplier amount settles the payable in its invoice currency.
 * The bank debit is expressed in the selected bank account currency.
 *
 * For cross-currency payments, the caller must provide the actual
 * bank debit or a separately confirmed debit amount.
 *
 * This function never looks up or invents an exchange rate.
 * It does not calculate accounting FX gains or losses.
 */
export function resolveSupplierPaymentAmounts(
  input: SupplierPaymentAmountsInput,
) {
  const supplierCurrency = normalizeCurrency(input.payableCurrency);
  const bankCurrency = normalizeCurrency(input.bankCurrency);

  const supplierAmount = parseAmount(
    input.supplierAmount,
    "Supplier payment amount",
  );

  const hasBankDebit =
    input.bankDebitAmount !== undefined &&
    input.bankDebitAmount !== null &&
    String(input.bankDebitAmount).trim() !== "";

  if (supplierCurrency !== bankCurrency && !hasBankDebit) {
    throw new Error(
      "Actual bank debit is required when bank and supplier currencies differ.",
    );
  }

  const bankDebitAmount = hasBankDebit
    ? parseAmount(input.bankDebitAmount!, "Bank debit amount")
    : supplierAmount;

  if (
    supplierCurrency === bankCurrency &&
    !bankDebitAmount.eq(supplierAmount)
  ) {
    throw new Error(
      "For same-currency payments, bank debit must equal the supplier amount. Record separate bank fees independently.",
    );
  }

  return {
    supplierCurrency,
    bankCurrency,
    supplierAmount,
    bankDebitAmount,
    isCrossCurrency: supplierCurrency !== bankCurrency,
  };
}