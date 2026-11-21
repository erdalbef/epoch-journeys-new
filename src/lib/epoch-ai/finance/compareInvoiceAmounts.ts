export type FinancialStatus =
  | "MATCH"
  | "DISCREPANCY"
  | "INSUFFICIENT_EVIDENCE";

export type InvoiceComparisonInput = {
  invoiceAmount: string | null;
  invoiceCurrency: string | null;
  approvedAmount: string;
  payableCurrency: string;
  contractedAmount?: string | null;
};

function parseCents(value: string | null): bigint | null {
  if (value === null) return null;

  const text = value.trim();

  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const [whole, fraction = ""] = text.split(".");

  return BigInt(whole) * 100n +
    BigInt(fraction.padEnd(2, "0"));
}

function formatCents(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;

  const whole = absolute / 100n;
  const fraction = (absolute % 100n)
    .toString()
    .padStart(2, "0");

  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function currencyCode(value: string | null): string | null {
  if (!value) return null;

  const code = value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export function compareInvoiceAmounts(
  input: InvoiceComparisonInput
) {
  const invoice = parseCents(input.invoiceAmount);
  const approved = parseCents(input.approvedAmount);

  const invoiceCurrency = currencyCode(input.invoiceCurrency);
  const payableCurrency = currencyCode(input.payableCurrency);

  const base = {
    invoiceAmount: input.invoiceAmount,
    approvedAmount: input.approvedAmount,
    invoiceCurrency,
    payableCurrency,
    variance: null as string | null,
    contractedVariance: null as string | null,
    status: "INSUFFICIENT_EVIDENCE" as FinancialStatus,
    reason: "",
  };

  if (
    invoice === null ||
    approved === null ||
    !invoiceCurrency ||
    !payableCurrency
  ) {
    return {
      ...base,
      reason: "Missing or invalid financial evidence.",
    };
  }

  if (invoiceCurrency !== payableCurrency) {
    return {
      ...base,
      status: "DISCREPANCY" as FinancialStatus,
      reason: "Invoice and payable currencies differ.",
    };
  }

  const variance = invoice - approved;

  const contracted =
    input.contractedAmount == null
      ? null
      : parseCents(input.contractedAmount);

  const contractedVariance =
    contracted === null
      ? null
      : formatCents(invoice - contracted);

  return {
    ...base,
    variance: formatCents(variance),
    contractedVariance,
    status: (
      variance === 0n ? "MATCH" : "DISCREPANCY"
    ) as FinancialStatus,
    reason:
      variance === 0n
        ? "Invoice total matches the approved payable amount."
        : "Invoice total differs from the approved payable amount.",
  };
}
