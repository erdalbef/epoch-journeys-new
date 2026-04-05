import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import CreateQuoteButton from "@/components/admin/quote-requests/CreateQuoteButton"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—"

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatMoney(amount: number | null | undefined, currency = "EUR") {
  const value = typeof amount === "number" ? amount : 0

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

function badgeClasses(status: string) {
  switch (status) {
    case "NEW":
    case "DRAFT":
      return "bg-slate-100 text-slate-800 border-slate-200"
    case "IN_REVIEW":
    case "VIEWED":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "QUOTED":
    case "SENT":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "CONFIRMED":
    case "APPROVED":
    case "CONVERTED":
      return "bg-green-100 text-green-800 border-green-200"
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200"
    case "EXPIRED":
      return "bg-zinc-100 text-zinc-700 border-zinc-200"
    default:
      return "bg-muted text-foreground border-border"
  }
}

export default async function AdminQuoteRequestDetailPage({
  params,
}: PageProps) {
  const { id } = await params

  const request = await db.customTourRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          travelAgency: true,
          phone: true,
          agentCode: true,
        },
      },
      requestNotes: {
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      quotes: {
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          activities: {
            include: {
              actor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
          booking: {
            select: {
              id: true,
              bookingReference: true,
              bookingDisplayCode: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      },
      selectedQuote: {
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          activities: {
            include: {
              actor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
          },
          booking: {
            select: {
              id: true,
              bookingReference: true,
              bookingDisplayCode: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
      },
    },
  })

  if (!request) {
    notFound()
  }

  const activeQuote = request.selectedQuote ?? request.quotes[0] ?? null
  const totalPassengers =
    (request.adults ?? 0) + (request.children ?? 0) + (request.infants ?? 0)

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-background p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Quote Request</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="font-mono text-sm">{request.requestReference}</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {request.title ||
                request.requestName ||
                request.groupName ||
                request.customerName ||
                "Untitled Quote Request"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {formatDate(request.createdAt)} • Updated{" "}
              {formatDate(request.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeClasses(
                request.status
              )}`}
            >
              Request: {request.status}
            </span>

            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
              {request.requestType}
            </span>

            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
              {request.bookingType}
            </span>

            {activeQuote ? (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeClasses(
                  activeQuote.status
                )}`}
              >
                Active Quote: {activeQuote.status}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/quote-requests/${request.id}/edit`}
            className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Edit Request
          </Link>

          {activeQuote ? (
            <>
              <Link
                href={`/admin/quotes/${activeQuote.id}`}
                className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Open Quote
              </Link>

              <Link
                href={`/api/quotes/${activeQuote.id}/pdf`}
                className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Preview PDF
              </Link>

              {activeQuote.booking ? (
                <Link
                  href={`/admin/bookings/${activeQuote.booking.id}`}
                  className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Open Booking
                </Link>
              ) : null}
            </>
          ) : (
            <CreateQuoteButton requestId={request.id} label="Create First Quote" />
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-8">
          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Request overview</h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Customer
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {request.customerName || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.customerEmail || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.customerPhone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Lead contact
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {[request.leadFirstName, request.leadLastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.leadEmail || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.leadPhone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Company / Group
                  </p>
                  <p className="mt-1 text-sm">{request.companyName || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    Group: {request.groupName || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Leader: {request.groupLeaderName || "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Trip details
                  </p>
                  <p className="mt-1 text-sm">
                    Destination:{" "}
                    {request.destination ||
                      (request.destinations.length
                        ? request.destinations.join(", ")
                        : "—")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Start: {formatDate(request.startDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    End: {formatDate(request.endDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {request.durationDays ?? "—"} days
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Pax / Rooms
                  </p>
                  <p className="mt-1 text-sm">
                    Estimated pax: {(request.estimatedPax ?? totalPassengers) || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Adults: {request.adults ?? 0} • Children: {request.children ?? 0} •
                    Infants: {request.infants ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    SGL: {request.singleRooms ?? 0} • DBL: {request.doubleRooms ?? 0} •
                    TWN: {request.twinRooms ?? 0} • TRPL: {request.tripleRooms ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Budget / Preferences
                  </p>
                  <p className="mt-1 text-sm">
                    Budget per person:{" "}
                    {request.budgetPerPerson != null
                      ? formatMoney(request.budgetPerPerson, request.currency)
                      : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total budget:{" "}
                    {request.totalBudget != null
                      ? formatMoney(request.totalBudget, request.currency)
                      : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Accommodation: {request.accommodationLevel || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Room preference: {request.roomPreference || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Flights: {request.needsFlights ? "Yes" : "No"} • Land only:{" "}
                    {request.landOnly ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>

            {(request.specialRequests || request.notes || request.internalNotes) && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Special requests
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {request.specialRequests || "—"}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Request notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {request.notes || "—"}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Internal notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {request.internalNotes || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Quotes</h2>
                <p className="text-sm text-muted-foreground">
                  All commercial offers attached to this request.
                </p>
              </div>

              <CreateQuoteButton requestId={request.id} label="New Quote Version" />
            </div>

            {request.quotes.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No quotes created yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {request.quotes.map((quote) => {
                  const isSelected = request.selectedQuoteId === quote.id

                  return (
                    <div
                      key={quote.id}
                      className={`rounded-xl border p-4 ${
                        isSelected ? "border-foreground" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {quote.title ||
                                quote.quoteReference ||
                                `Quote #${quote.quoteNumber}`}
                            </p>

                            {isSelected ? (
                              <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium">
                                Selected
                              </span>
                            ) : null}

                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${badgeClasses(
                                quote.status
                              )}`}
                            >
                              {quote.status}
                            </span>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            Version {quote.version} • Created {formatDate(quote.createdAt)} • Updated{" "}
                            {formatDate(quote.updatedAt)}
                          </div>

                          <div className="text-sm">
                            Total:{" "}
                            <span className="font-medium">
                              {formatMoney(quote.totalAmount, quote.currency)}
                            </span>
                          </div>

                          {quote.expiresAt ? (
                            <div className="text-sm text-muted-foreground">
                              Expires {formatDate(quote.expiresAt)}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/quotes/${quote.id}`}
                            className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                          >
                            Open
                          </Link>

                          <Link
                            href={`/api/quotes/${quote.id}/pdf`}
                            className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                          >
                            PDF
                          </Link>

                          {quote.booking ? (
                            <Link
                              href={`/admin/bookings/${quote.booking.id}`}
                              className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                            >
                              Booking
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {activeQuote ? (
            <div className="rounded-2xl border bg-background p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Active quote</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeQuote.title ||
                      activeQuote.quoteReference ||
                      `Quote #${activeQuote.quoteNumber}`}
                  </p>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Status: </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${badgeClasses(
                      activeQuote.status
                    )}`}
                  >
                    {activeQuote.status}
                  </span>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border">
                <table className="min-w-full divide-y">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-sm">
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Unit Price</th>
                      <th className="px-4 py-3 font-medium">Discount</th>
                      <th className="px-4 py-3 font-medium">Tax</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeQuote.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No quote items yet.
                        </td>
                      </tr>
                    ) : (
                      activeQuote.items.map((item) => (
                        <tr key={item.id} className="text-sm">
                          <td className="px-4 py-4 align-top">
                            <div className="font-medium">{item.title}</div>
                            {item.description ? (
                              <div className="mt-1 text-muted-foreground">
                                {item.description}
                              </div>
                            ) : null}
                            <div className="mt-1 text-xs text-muted-foreground">
                              {item.itemType}
                              {item.optional ? " • Optional" : ""}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">{item.quantity}</td>
                          <td className="px-4 py-4 align-top">
                            {formatMoney(item.unitPrice, item.currency)}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {formatMoney(item.discountAmount, item.currency)}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {item.taxRate != null
                              ? `${item.taxRate}% (${formatMoney(
                                  item.taxAmount,
                                  item.currency
                                )})`
                              : formatMoney(item.taxAmount, item.currency)}
                          </td>
                          <td className="px-4 py-4 align-top font-medium">
                            {formatMoney(item.total, item.currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-muted/20 text-sm">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-medium">
                        Subtotal
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(activeQuote.subtotal, activeQuote.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-medium">
                        Discount
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(activeQuote.discountTotal, activeQuote.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-medium">
                        Tax
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(activeQuote.taxTotal, activeQuote.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-right text-base font-semibold"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-base font-semibold">
                        {formatMoney(activeQuote.totalAmount, activeQuote.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Client message
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {activeQuote.clientMessage || "—"}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Internal notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {activeQuote.internalNotes || "—"}
                  </p>
                </div>
              </div>

              {(activeQuote.validityNotes || activeQuote.termsAndNotes) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Validity notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {activeQuote.validityNotes || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Terms and notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {activeQuote.termsAndNotes || "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <aside className="space-y-8">
          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Agent / source</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Agent
                </p>
                <p className="mt-1 font-medium">{request.user.fullName || "—"}</p>
                <p className="text-muted-foreground">{request.user.email}</p>
                <p className="text-muted-foreground">{request.user.phone || "—"}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Agency
                </p>
                <p className="mt-1">{request.user.travelAgency || "—"}</p>
                <p className="text-muted-foreground">
                  Agent code: {request.user.agentCode || "—"}
                </p>
              </div>
            </div>
          </div>

          {activeQuote ? (
            <div className="rounded-2xl border bg-background p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Quote lifecycle</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(activeQuote.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{formatDate(activeQuote.sentAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Viewed</span>
                  <span>{formatDate(activeQuote.viewedAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Approved</span>
                  <span>{formatDate(activeQuote.approvedAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Rejected</span>
                  <span>{formatDate(activeQuote.rejectedAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Expires</span>
                  <span>{formatDate(activeQuote.expiresAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Converted</span>
                  <span>{formatDate(activeQuote.convertedAt)}</span>
                </div>
              </div>

              {activeQuote.booking ? (
                <div className="mt-6 rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Linked booking
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {activeQuote.booking.bookingDisplayCode ||
                      activeQuote.booking.bookingReference}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Booking status: {activeQuote.booking.status}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Payment status: {activeQuote.booking.paymentStatus}
                  </p>
                  <Link
                    href={`/admin/bookings/${activeQuote.booking.id}`}
                    className="mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Open Booking
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Request notes</h2>

            {request.requestNotes.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No internal notes yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {request.requestNotes.map((note) => (
                  <div key={note.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium">
                        {note.author.fullName || note.author.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeQuote ? (
            <div className="rounded-2xl border bg-background p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Recent quote activity</h2>

              {activeQuote.activities.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {activeQuote.activities.map((activity) => (
                    <div key={activity.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.actor?.fullName ||
                              activity.actor?.email ||
                              "System"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>

                      {(activity.fromStatus || activity.toStatus) && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {activity.fromStatus || "—"} → {activity.toStatus || "—"}
                        </p>
                      )}

                      {activity.message ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {activity.message}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}