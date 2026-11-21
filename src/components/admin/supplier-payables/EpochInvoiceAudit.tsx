"use client";

import { useState } from "react";

type FinancialStatus =
  | "MATCH"
  | "DISCREPANCY"
  | "INSUFFICIENT_EVIDENCE";

type AuditResponse = {
  verificationStatus?: string;
  fullyVerified?: boolean;
  analysis?: string;
  error?: string;
  commercialEvidenceStatus?: string;
  documentsExamined?: Array<{
    id: string;
    fileName: string;
  }>;
  extraction?: {
    supplierName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    invoiceTotal: string | null;
    currency: string | null;
    serviceDescription: string | null;
    evidence: string | null;
  };
  financialComparison?: {
    status: FinancialStatus;
    invoiceAmount: string | null;
    approvedAmount: string;
    invoiceCurrency: string | null;
    payableCurrency: string | null;
    variance: string | null;
    contractedVariance: string | null;
    reason: string;
  };
  preliminary?: {
    financials?: {
      approvedAmount?: string;
      contractedAmount?: string | null;
      recordedVariance?: string | null;
    };
    currency?: string;
  };
};

function money(
  amount: string | null | undefined,
  currency?: string | null
): string {
  if (amount == null || amount === "") {
    return "Not available";
  }

  if (!currency) return amount;

  const number = Number(amount);

  if (!Number.isFinite(number)) {
    return `${amount} ${currency}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `${amount} ${currency}`;
  }
}

function statusDetails(status?: FinancialStatus) {
  switch (status) {
    case "MATCH":
      return {
        title: "Financial amounts match",
        label: "MATCH",
        icon: "✓",
        background: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-900",
        badge: "bg-emerald-100 text-emerald-800",
      };
    case "DISCREPANCY":
      return {
        title: "Financial discrepancy detected",
        label: "DISCREPANCY",
        icon: "!",
        background: "bg-red-50 border-red-200",
        text: "text-red-900",
        badge: "bg-red-100 text-red-800",
      };
    default:
      return {
        title: "Financial review required",
        label: "INSUFFICIENT EVIDENCE",
        icon: "?",
        background: "bg-amber-50 border-amber-200",
        text: "text-amber-900",
        badge: "bg-amber-100 text-amber-800",
      };
  }
}

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>
      <p
        className={
          "mt-2 break-words text-xl font-bold tabular-nums " +
          (emphasis ? "text-emerald-800" : "text-[#001F3F]")
        }
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <th
        scope="row"
        className="px-4 py-3 text-left text-sm font-medium text-slate-600"
      >
        {label}
      </th>
      <td
        className={
          "break-words px-4 py-3 text-right text-sm tabular-nums " +
          (strong
            ? "font-bold text-[#001F3F]"
            : "font-medium text-slate-800")
        }
      >
        {value}
      </td>
    </tr>
  );
}

export default function EpochInvoiceAudit({
  payableId,
}: {
  payableId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (loading) return;

    const confirmed = window.confirm(
      "Analyze this supplier invoice with Epoch AI? " +
      "The invoice PDF and payable audit information will " +
      "be sent to the configured OpenAI API for analysis. " +
      "No financial records will be changed."
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/epoch-ai/finance/supplier-invoice-audit/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payableId }),
          cache: "no-store",
        }
      );

      const data = (await response.json()) as AuditResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Invoice analysis failed (${response.status}).`
        );
      }

      if (!data.financialComparison || !data.extraction) {
        throw new Error(
          "The API did not return structured financial results."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete invoice analysis."
      );
    } finally {
      setLoading(false);
    }
  }

  const comparison = result?.financialComparison;
  const extraction = result?.extraction;
  const preliminary = result?.preliminary;
  const currency = comparison?.payableCurrency ?? preliminary?.currency;

  const visual = statusDetails(comparison?.status);

  const contracted = preliminary?.financials?.contractedAmount;
  const hasContracted = contracted != null;

  const contractedException =
    comparison?.contractedVariance != null &&
    comparison.contractedVariance !== "0.00";

  const currencyMismatch =
    comparison?.invoiceCurrency != null &&
    comparison?.payableCurrency != null &&
    comparison.invoiceCurrency !== comparison.payableCurrency;

  const commercialVerified =
    result?.commercialEvidenceStatus === "VERIFIED";

  const evidenceAvailable =
    Boolean(extraction?.evidence?.trim());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Epoch AI / Finance
          </p>
          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Supplier Invoice Audit
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Invoice examination and financial comparison.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Read-only
        </span>
      </div>

      <button
        type="button"
        onClick={analyze}
        disabled={loading}
        className="mt-5 rounded-xl bg-[#001F3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003366] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Analyzing invoice..."
          : result
            ? "Run Audit Again"
            : "Analyze Invoice with Epoch AI"}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {result && comparison && extraction && (
        <div className="mt-6 space-y-5 border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-[#001F3F]">
                Executive Audit Summary
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {extraction.supplierName ?? "Supplier not established"}
                {" · "}
                {extraction.invoiceNumber ?? "Invoice number unavailable"}
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
              PRELIMINARY
            </span>
          </div>

          <div
            className={
              "rounded-xl border p-4 " +
              visual.background
            }
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold " +
                  visual.text
                }
              >
                {visual.icon}
              </span>

              <div className="min-w-0">
                <p className={"font-bold " + visual.text}>
                  {visual.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {comparison.reason}
                </p>
              </div>
            </div>

            <span
              className={
                "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold " +
                visual.badge
              }
            >
              {visual.label}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Invoice total"
              value={money(
                extraction.invoiceTotal,
                extraction.currency
              )}
            />
            <Metric
              label="Approved payable"
              value={money(comparison.approvedAmount, currency)}
            />
            <Metric
              label="Approved variance"
              value={
                comparison.variance === null
                  ? "Not calculable"
                  : money(comparison.variance, currency)
              }
              emphasis={
                comparison.status === "MATCH" &&
                comparison.variance === "0.00"
              }
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h4 className="font-semibold text-[#001F3F]">
                Financial Details
              </h4>
            </div>

            <table className="w-full table-fixed">
              <tbody>
                <DetailRow
                  label="Invoice date"
                  value={extraction.invoiceDate ?? "Not established"}
                />
                <DetailRow
                  label="Invoice total"
                  value={money(
                    extraction.invoiceTotal,
                    extraction.currency
                  )}
                  strong
                />
                <DetailRow
                  label="Approved payable"
                  value={money(comparison.approvedAmount, currency)}
                />
                <DetailRow
                  label="Contracted amount (recorded)"
                  value={money(contracted, currency)}
                />
                <DetailRow
                  label="Approved amount variance"
                  value={
                    comparison.variance === null
                      ? "Not calculable"
                      : money(comparison.variance, currency)
                  }
                  strong
                />
                <DetailRow
                  label="Contracted amount variance"
                  value={
                    comparison.contractedVariance === null
                      ? "Not calculable"
                      : money(comparison.contractedVariance, currency)
                  }
                />
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="font-semibold text-amber-950">
              Commercial Evidence
            </h4>
            <p className="mt-2 text-sm text-amber-900">
              {commercialVerified
                ? "Commercial evidence is marked verified."
                : "Accepted supplier terms have not been verified from their source documents."}
            </p>
            <p className="mt-2 text-xs text-amber-800">
              Matching amounts do not constitute invoice approval
              or confirmation of agreed services and rates.
            </p>
          </div>

          {(contractedException ||
            currencyMismatch ||
            !hasContracted ||
            !evidenceAvailable ||
            comparison.status === "INSUFFICIENT_EVIDENCE") && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="font-semibold text-[#001F3F]">
                Exceptions Requiring Review
              </h4>

              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                {contractedException && (
                  <li>
                    The invoice differs from the recorded
                    contracted amount.
                  </li>
                )}
                {currencyMismatch && (
                  <li>
                    Invoice and payable currencies differ.
                    No monetary variance can be calculated
                    without an approved conversion basis.
                  </li>
                )}
                {!hasContracted && (
                  <li>
                    No contracted amount is recorded.
                  </li>
                )}
                {!evidenceAvailable && (
                  <li>
                    Invoice extraction evidence is insufficient.
                  </li>
                )}
                {comparison.status === "INSUFFICIENT_EVIDENCE" && (
                  <li>
                    The financial comparison cannot be completed
                    using the available extracted values.
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="rounded-xl border-l-4 border-[#001F3F] bg-slate-50 p-4">
            <h4 className="font-semibold text-[#001F3F]">
              Required Next Action
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Review the extracted invoice details and confirm
              accepted supplier terms using the original
              contract, quotation, or email correspondence.
              Investigate any displayed financial exceptions
              before considering payment approval.
            </p>
          </div>

          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-[#001F3F]">
              Supporting Evidence and Full Report
            </summary>

            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <p className="font-semibold">Invoice evidence</p>
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {extraction.evidence ?? "Not available"}
                </p>
              </div>

              {extraction.serviceDescription && (
                <div>
                  <p className="font-semibold">Services identified</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {extraction.serviceDescription}
                  </p>
                </div>
              )}

              {result.documentsExamined &&
                result.documentsExamined.length > 0 && (
                  <div>
                    <p className="font-semibold">
                      Documents submitted
                    </p>
                    {result.documentsExamined.map((doc) => (
                      <p
                        key={doc.id}
                        className="mt-1 break-all text-slate-600"
                      >
                        {doc.fileName}
                      </p>
                    ))}
                  </div>
                )}

              {result.analysis && (
                <div>
                  <p className="font-semibold">Full audit report</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-sans text-sm leading-6">
                    {result.analysis}
                  </pre>
                </div>
              )}
            </div>
          </details>

          <p className="text-xs leading-5 text-slate-500">
            Epoch AI provides preliminary, read-only analysis.
            Extracted invoice data requires source review.
            No supplier payable, approval, or payment records
            were changed.
          </p>
        </div>
      )}
    </section>
  );
}