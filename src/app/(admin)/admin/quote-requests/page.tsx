import Link from "next/link";
import { db } from "@/lib/db";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(amount: number | null | undefined, currency = "EUR") {
  if (amount == null) return "—";

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function badgeClasses(status: string) {
  switch (status) {
    case "NEW":
    case "DRAFT":
      return "border-slate-200 bg-slate-100 text-slate-800";
    case "IN_REVIEW":
    case "VIEWED":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "QUOTED":
    case "SENT":
      return "border-blue-200 bg-blue-100 text-blue-800";
    case "CONFIRMED":
    case "APPROVED":
    case "CONVERTED":
      return "border-green-200 bg-green-100 text-green-800";
    case "REJECTED":
    case "CANCELLED":
      return "border-red-200 bg-red-100 text-red-800";
    case "EXPIRED":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export default async function AdminQuoteRequestsPage() {
  const quoteRequests = await db.customTourRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      requestReference: true,
      status: true,
      requestType: true,
      bookingType: true,
      title: true,
      requestName: true,
      destination: true,
      destinations: true,
      customerName: true,
      customerEmail: true,
      companyName: true,
      groupName: true,
      estimatedPax: true,
      adults: true,
      children: true,
      infants: true,
      createdAt: true,
      selectedQuoteId: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          travelAgency: true,
        },
      },
      selectedQuote: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          quoteNumber: true,
          quoteReference: true,
        },
      },
      quotes: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          quoteNumber: true,
          quoteReference: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Quote Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Review incoming custom tour requests, monitor quote progress, and
            open the active commercial offer.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-350 text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Request Status</th>
                <th className="px-4 py-3 text-left font-medium">Quote Status</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Booking</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Agency / Company</th>
                <th className="px-4 py-3 text-left font-medium">Destination</th>
                <th className="px-4 py-3 text-left font-medium">Pax</th>
                <th className="px-4 py-3 text-left font-medium">Active Quote</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {quoteRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No quote requests found.
                  </td>
                </tr>
              ) : (
                quoteRequests.map((request) => {
                  const destinationText =
                    request.destination ||
                    (request.destinations.length > 0
                      ? request.destinations.join(", ")
                      : "—");

                  const agencyText =
                    request.companyName ||
                    request.user.travelAgency ||
                    request.user.fullName ||
                    "—";

                  const paxText =
                    request.estimatedPax ??
                    ((request.adults ?? 0) +
                      (request.children ?? 0) +
                      (request.infants ?? 0) ||
                      "—");

                  const latestQuote = request.quotes[0] ?? null;
                  const activeQuote = request.selectedQuote ?? latestQuote;

                  const quoteAmountText = activeQuote
                    ? formatMoney(activeQuote.totalAmount, activeQuote.currency)
                    : "—";

                  const quoteLabel = activeQuote
                    ? activeQuote.quoteReference || `#${activeQuote.quoteNumber}`
                    : null;

                  const requestDisplayName =
                    request.title ||
                    request.requestName ||
                    request.groupName ||
                    request.customerName ||
                    "Untitled";

                  return (
                    <tr key={request.id} className="border-b last:border-0">
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {request.requestReference}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {requestDisplayName}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${badgeClasses(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {activeQuote ? (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-medium ${badgeClasses(
                                activeQuote.status
                              )}`}
                            >
                              {activeQuote.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {quoteLabel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">{request.requestType}</td>
                      <td className="px-4 py-3 align-top">{request.bookingType}</td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <span>{request.customerName || "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {request.customerEmail || request.user.email}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">{agencyText}</td>
                      <td className="px-4 py-3 align-top">{destinationText}</td>
                      <td className="px-4 py-3 align-top">{paxText}</td>

                      <td className="px-4 py-3 align-top">
                        {activeQuote ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{quoteAmountText}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(activeQuote.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No quote yet</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {formatDate(request.createdAt)}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/quote-requests/${request.id}`}
                            className="inline-flex rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                          >
                            View
                          </Link>

                          {activeQuote ? (
                            <Link
                              href={`/admin/quotes/${activeQuote.id}`}
                              className="inline-flex rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                            >
                              Open Quote
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}