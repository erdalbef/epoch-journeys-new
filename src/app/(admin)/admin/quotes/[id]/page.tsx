"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"

type QuoteStatus =
  | "DRAFT"
  | "FINALIZED"
  | "SENT"
  | "CANCELLED"
  | "CONVERTED"

type QuotePurpose = "CUSTOM_REQUEST" | "TOUR_SETUP"

type QuoteItemType =
  | "SERVICE"
  | "ACCOMMODATION"
  | "TRANSPORT"
  | "GUIDE"
  | "ACTIVITY"
  | "FLIGHT"
  | "FEE"
  | "DISCOUNT"
  | "CUSTOM"

type QuoteItem = {
  id: string
  itemType: QuoteItemType
  title: string
  description: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate: number | null
  taxAmount: number
  total: number
  currency: string
  optional: boolean
  sortOrder: number
}

type QuoteActivity = {
  id: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  message: string | null
  createdAt: string
  actor: {
    id: string
    fullName: string | null
    email: string
  } | null
}

type QuotePageData = {
  id: string
  requestId: string | null
  tourId: string | null
  departureDateId: string | null
  quoteNumber: number
  quoteReference: string | null
  version: number
  purpose: QuotePurpose
  status: QuoteStatus
  currency: string

  title: string | null
  clientMessage: string | null
  internalNotes: string | null
  termsAndNotes: string | null
  validityNotes: string | null

  recipientName: string | null
  recipientEmail: string | null
  recipientType: string | null

  subtotal: number
  discountTotal: number
  taxTotal: number
  totalAmount: number

  pdfUrl: string | null
  pdfGeneratedAt: string | null

  finalizedAt: string | null
  finalizedBy: {
    id: string
    fullName: string | null
    email: string
  } | null

  sentAt: string | null
  sentBy: {
    id: string
    fullName: string | null
    email: string
  } | null

  convertedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string

  items: QuoteItem[]
  activities: QuoteActivity[]

  request: {
    id: string
    requestReference: string
    status: string
    requestType: string
    bookingType: string
    title: string | null
    requestName: string | null
    destination: string | null
    destinations: string[]
    customerName: string | null
    customerEmail: string | null
    customerPhone: string | null
    companyName: string | null
    groupName: string | null
    groupLeaderName: string | null
    estimatedPax: number | null
    adults: number | null
    children: number | null
    infants: number | null
    startDate: string | null
    endDate: string | null
    durationDays: number | null
    budgetPerPerson: number | null
    totalBudget: number | null
    currency: string
    accommodationLevel: string | null
    roomPreference: string | null
    needsFlights: boolean
    landOnly: boolean
    specialRequests: string | null
    notes: string | null
    internalNotes: string | null
    user: {
      id: string
      email: string
      fullName: string | null
      travelAgency: string | null
      phone: string | null
      agentCode: string | null
    }
  } | null

  tour: {
    id: string
    title: string
    category: string
  } | null

  departureDate: {
    id: string
    date: string
    price: number
    status: string
    season: string
  } | null

  booking: {
    id: string
    bookingReference: string
    bookingDisplayCode: string | null
    status: string
    paymentStatus: string
  } | null
}

type EditableQuoteItem = {
  id: string
  itemType: QuoteItemType
  title: string
  description: string
  quantity: string
  unitPrice: string
  discountAmount: string
  taxRate: string
  optional: boolean
  sortOrder: number
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatDateInput(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
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
    case "DRAFT":
      return "border-slate-200 bg-slate-100 text-slate-800"
    case "FINALIZED":
      return "border-amber-200 bg-amber-100 text-amber-800"
    case "SENT":
      return "border-blue-200 bg-blue-100 text-blue-800"
    case "CONVERTED":
      return "border-green-200 bg-green-100 text-green-800"
    case "CANCELLED":
      return "border-red-200 bg-red-100 text-red-800"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function toEditableItems(items: QuoteItem[]): EditableQuoteItem[] {
  return items.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    description: item.description ?? "",
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discountAmount: String(item.discountAmount ?? 0),
    taxRate: item.taxRate != null ? String(item.taxRate) : "",
    optional: item.optional,
    sortOrder: item.sortOrder,
  }))
}

function createEmptyItem(index: number): EditableQuoteItem {
  return {
    id: `new-${index}-${Date.now()}`,
    itemType: "SERVICE",
    title: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
    discountAmount: "0",
    taxRate: "",
    optional: false,
    sortOrder: index,
  }
}

function parseTaxRate(value: string) {
  return value && value.trim() !== "" ? Number(value) : null
}

export default function AdminQuotePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [data, setData] = useState<QuotePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [currency, setCurrency] = useState("EUR")
  const [title, setTitle] = useState("")
  const [clientMessage, setClientMessage] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [termsAndNotes, setTermsAndNotes] = useState("")
  const [validityNotes, setValidityNotes] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [items, setItems] = useState<EditableQuoteItem[]>([])

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<
    "save" | "finalize" | "send" | "convert" | null
  >(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(`/api/quotes/${params.id}`, {
          cache: "no-store",
        })

        const result = await response.json()

        if (!response.ok) {
          setLoadError(result.message || "Failed to load quote.")
          setLoading(false)
          return
        }

        const quote: QuotePageData = result

        setData(quote)
        setCurrency(quote.currency || "EUR")
        setTitle(quote.title ?? "")
        setClientMessage(quote.clientMessage ?? "")
        setInternalNotes(quote.internalNotes ?? "")
        setTermsAndNotes(quote.termsAndNotes ?? "")
        setValidityNotes(quote.validityNotes ?? "")
        setRecipientName(quote.recipientName ?? "")
        setRecipientEmail(quote.recipientEmail ?? "")
        setExpiresAt(formatDateInput(quote.expiresAt))
        setItems(toEditableItems(quote.items))
      } catch (err) {
        console.error(err)
        setLoadError("Something went wrong while loading the quote.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [params.id])

  const totals = useMemo(() => {
    let subtotal = 0
    let discountTotal = 0
    let taxTotal = 0

    const normalizedItems = items.map((item, index) => {
      const quantity = Number(item.quantity || 0)
      const unitPrice = Number(item.unitPrice || 0)
      const discountAmount = Number(item.discountAmount || 0)
      const taxRate = parseTaxRate(item.taxRate)

      const baseAmount = quantity * unitPrice
      const taxableAmount = Math.max(baseAmount - discountAmount, 0)
      const taxAmount =
        taxRate != null && !Number.isNaN(taxRate)
          ? (taxableAmount * taxRate) / 100
          : 0
      const total = taxableAmount + taxAmount

      subtotal += baseAmount
      discountTotal += discountAmount
      taxTotal += taxAmount

      return {
        id: item.id.startsWith("new-") ? null : item.id,
        itemType: item.itemType,
        title: item.title.trim(),
        description: item.description.trim() || null,
        quantity: Number.isNaN(quantity) ? 0 : quantity,
        unitPrice: Number.isNaN(unitPrice) ? 0 : unitPrice,
        discountAmount: Number.isNaN(discountAmount) ? 0 : discountAmount,
        taxRate: taxRate == null || Number.isNaN(taxRate) ? null : taxRate,
        taxAmount,
        total,
        currency,
        optional: item.optional,
        sortOrder: index,
      }
    })

    return {
      normalizedItems,
      subtotal,
      discountTotal,
      taxTotal,
      totalAmount: subtotal - discountTotal + taxTotal,
    }
  }, [items, currency])

  const requestDisplayName =
    data?.request?.title ||
    data?.request?.requestName ||
    data?.request?.groupName ||
    data?.request?.customerName ||
    data?.tour?.title ||
    "Untitled Quote"

  const totalPassengers = data?.request
    ? data.request.estimatedPax ??
      (data.request.adults ?? 0) +
        (data.request.children ?? 0) +
        (data.request.infants ?? 0)
    : 0

  const isDraft = data?.status === "DRAFT"
  const isFinalized = data?.status === "FINALIZED"
  const isSent = data?.status === "SENT"
  const isConverted = data?.status === "CONVERTED"
  const isLocked = isFinalized || isSent || isConverted
  const hasItems = items.length > 0
  const tempActorId = "TEMP_ADMIN_ID"

  const handleAddItem = () => {
    setItems((current) => [...current, createEmptyItem(current.length)])
  }

  const handleRemoveItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const handleItemChange = <K extends keyof EditableQuoteItem>(
    id: string,
    field: K,
    value: EditableQuoteItem[K]
  ) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleSave = async () => {
    if (!data) return

    setMessage(null)
    setError(null)

    if (data.status !== "DRAFT") {
      setError("Only draft quotes can be edited.")
      return
    }

    const invalidItem = totals.normalizedItems.find((item) => !item.title)
    if (invalidItem) {
      setError("Every quote item must have a title.")
      return
    }

    setActiveAction("save")

    startTransition(async () => {
      try {
        const payload = {
          currency: currency.trim().toUpperCase() || "EUR",
          title: title.trim() || null,
          clientMessage: clientMessage.trim() || null,
          internalNotes: internalNotes.trim() || null,
          termsAndNotes: termsAndNotes.trim() || null,
          validityNotes: validityNotes.trim() || null,
          recipientName: recipientName.trim() || null,
          recipientEmail: recipientEmail.trim() || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          totalAmount: totals.totalAmount,
          items: totals.normalizedItems,
        }

        const response = await fetch(`/api/quotes/${params.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.message || "Failed to save quote.")
          return
        }

        const updated: QuotePageData = result
        setData(updated)
        setItems(toEditableItems(updated.items))
        setMessage("Quote draft saved successfully.")
        router.refresh()
      } catch (err) {
        console.error(err)
        setError("Something went wrong while saving the quote.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const handleFinalize = async () => {
    if (!data) return

    setMessage(null)
    setError(null)

    const invalidItem = totals.normalizedItems.find((item) => !item.title)
    if (invalidItem) {
      setError("Every quote item must have a title before finalizing.")
      return
    }

    if (!recipientEmail.trim()) {
      setError("Recipient email is required before finalizing.")
      return
    }

    const confirmed = window.confirm(
      "Finalize this quote? This will lock pricing and prepare the PDF. It will not send the quote."
    )

    if (!confirmed) return

    setActiveAction("finalize")

    startTransition(async () => {
      try {
        const savePayload = {
          currency: currency.trim().toUpperCase() || "EUR",
          title: title.trim() || null,
          clientMessage: clientMessage.trim() || null,
          internalNotes: internalNotes.trim() || null,
          termsAndNotes: termsAndNotes.trim() || null,
          validityNotes: validityNotes.trim() || null,
          recipientName: recipientName.trim() || null,
          recipientEmail: recipientEmail.trim() || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          totalAmount: totals.totalAmount,
          items: totals.normalizedItems,
        }

        const saveResponse = await fetch(`/api/quotes/${params.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(savePayload),
        })

        const saveResult = await saveResponse.json()

        if (!saveResponse.ok) {
          setError(saveResult.message || "Failed to save quote before finalizing.")
          return
        }

        const finalizeResponse = await fetch(`/api/quotes/${params.id}/finalize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actorId: tempActorId,
          }),
        })

        const finalizeResult = await finalizeResponse.json()

        if (!finalizeResponse.ok) {
          setError(finalizeResult.message || "Failed to finalize quote.")
          return
        }

        const updated: QuotePageData = finalizeResult
        setData(updated)
        setMessage("Quote finalized. It is ready to be sent, but has not been emailed yet.")
        router.refresh()
      } catch (err) {
        console.error(err)
        setError("Something went wrong while finalizing the quote.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const handleSend = async () => {
    if (!data) return

    setMessage(null)
    setError(null)

    const confirmed = window.confirm(
      `Send this finalized quote manually to ${data.recipientEmail || recipientEmail || "the recipient"}?`
    )

    if (!confirmed) return

    setActiveAction("send")

    startTransition(async () => {
      try {
        const response = await fetch(`/api/quotes/${params.id}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actorId: tempActorId,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.message || "Failed to send quote.")
          return
        }

        const updated: QuotePageData = result
        setData(updated)
        setMessage("Quote sent successfully.")
        router.refresh()
      } catch (err) {
        console.error(err)
        setError("Something went wrong while sending the quote.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  const handleConvertToBooking = async () => {
    if (!data) return

    setMessage(null)
    setError(null)
    setActiveAction("convert")

    startTransition(async () => {
      try {
        const response = await fetch(`/api/quotes/${params.id}/convert`, {
          method: "POST",
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.message || "Failed to convert quote to booking.")
          return
        }

        setMessage("Quote converted to booking successfully.")
        router.push(`/admin/bookings/${result.bookingId}`)
      } catch (err) {
        console.error(err)
        setError("Something went wrong while converting the quote.")
      } finally {
        setActiveAction(null)
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className="space-y-4 p-6">
        <Link
          href="/admin/quote-requests"
          className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          Back to Quote Requests
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {loadError || "Quote not found."}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <div className="sticky top-0 z-20 -mx-6 border-b bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href="/admin/quote-requests" className="hover:text-foreground">
                Quote Requests
              </Link>

              {data.request ? (
                <>
                  <span>/</span>
                  <Link
                    href={`/admin/quote-requests/${data.request.id}`}
                    className="hover:text-foreground"
                  >
                    {data.request.requestReference}
                  </Link>
                </>
              ) : null}

              <span>/</span>
              <span className="font-mono text-foreground">
                {data.quoteReference || `Quote #${data.quoteNumber}`}
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {title || data.quoteReference || `Quote #${data.quoteNumber}`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.purpose === "CUSTOM_REQUEST" ? "Custom Request" : "Tour Setup"} • Version {data.version} • Created{" "}
                {formatDate(data.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeClasses(
                  data.status
                )}`}
              >
                Quote: {data.status}
              </span>

              {data.request ? (
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
                  Request: {data.request.status}
                </span>
              ) : null}

              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
                {data.purpose}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {data.request ? (
              <Link
                href={`/admin/quote-requests/${data.request.id}`}
                className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                View Request
              </Link>
            ) : null}

            <Link
              href={data.pdfUrl || `/admin/quotes/${data.id}/pdf`}
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              target="_blank"
            >
              Preview PDF
            </Link>

            {isDraft ? (
              <>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isPending || !hasItems}
                  className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeAction === "finalize" ? "Finalizing..." : "Finalize Quote"}
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending || !hasItems}
                  className="inline-flex items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeAction === "save" ? "Saving..." : "Save Draft"}
                </button>
              </>
            ) : null}

            {isFinalized ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending}
                className="inline-flex items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === "send" ? "Sending..." : "Send Quote"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isFinalized ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This quote is finalized and locked. It is ready to be sent, but has not been emailed automatically.
        </div>
      ) : null}

      {isSent ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          This quote has been sent manually.
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-8">
          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Quote settings</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Quote Title
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLocked}
                  placeholder="Custom itinerary quote"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="currency" className="text-sm font-medium">
                  Currency
                </label>
                <input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  disabled={isLocked}
                  placeholder="EUR"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="recipientName" className="text-sm font-medium">
                  Recipient Name
                </label>
                <input
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={isLocked}
                  placeholder="Recipient name"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="recipientEmail" className="text-sm font-medium">
                  Recipient Email
                </label>
                <input
                  id="recipientEmail"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  disabled={isLocked}
                  placeholder="recipient@example.com"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="expiresAt" className="text-sm font-medium">
                  Expiry Date
                </label>
                <input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="clientMessage" className="text-sm font-medium">
                  Client Message
                </label>
                <textarea
                  id="clientMessage"
                  rows={6}
                  value={clientMessage}
                  onChange={(e) => setClientMessage(e.target.value)}
                  disabled={isLocked}
                  placeholder="Dear partner, please find our quotation below..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="termsAndNotes" className="text-sm font-medium">
                  Terms and Notes
                </label>
                <textarea
                  id="termsAndNotes"
                  rows={4}
                  value={termsAndNotes}
                  onChange={(e) => setTermsAndNotes(e.target.value)}
                  disabled={isLocked}
                  placeholder="Payment terms, cancellation terms, inclusions/exclusions..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="validityNotes" className="text-sm font-medium">
                  Validity Notes
                </label>
                <textarea
                  id="validityNotes"
                  rows={3}
                  value={validityNotes}
                  onChange={(e) => setValidityNotes(e.target.value)}
                  disabled={isLocked}
                  placeholder="Rates valid until..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="internalNotes" className="text-sm font-medium">
                  Internal Notes
                </label>
                <textarea
                  id="internalNotes"
                  rows={4}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  disabled={isLocked}
                  placeholder="Internal pricing logic, supplier notes, operational notes..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Quote items</h2>
                <p className="text-sm text-muted-foreground">
                  Add pricing lines for accommodation, transport, guide, activities, flights, fees, and discounts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                disabled={isLocked}
                className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Item
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No quote items yet.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                      <div className="space-y-2 xl:col-span-2">
                        <label className="text-sm font-medium">Title</label>
                        <input
                          value={item.title}
                          onChange={(e) =>
                            handleItemChange(item.id, "title", e.target.value)
                          }
                          disabled={isLocked}
                          placeholder="Hotel package"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                          value={item.itemType}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "itemType",
                              e.target.value as QuoteItemType
                            )
                          }
                          disabled={isLocked}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        >
                          <option value="SERVICE">SERVICE</option>
                          <option value="ACCOMMODATION">ACCOMMODATION</option>
                          <option value="TRANSPORT">TRANSPORT</option>
                          <option value="GUIDE">GUIDE</option>
                          <option value="ACTIVITY">ACTIVITY</option>
                          <option value="FLIGHT">FLIGHT</option>
                          <option value="FEE">FEE</option>
                          <option value="DISCOUNT">DISCOUNT</option>
                          <option value="CUSTOM">CUSTOM</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, "quantity", e.target.value)
                          }
                          disabled={isLocked}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(item.id, "unitPrice", e.target.value)
                          }
                          disabled={isLocked}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Discount</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discountAmount}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "discountAmount",
                              e.target.value
                            )
                          }
                          disabled={isLocked}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tax %</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.taxRate}
                          onChange={(e) =>
                            handleItemChange(item.id, "taxRate", e.target.value)
                          }
                          disabled={isLocked}
                          placeholder="0"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-2 xl:col-span-5">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                          rows={3}
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(item.id, "description", e.target.value)
                          }
                          disabled={isLocked}
                          placeholder="Describe what is included in this line item"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                        />
                      </div>

                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={item.optional}
                            onChange={(e) =>
                              handleItemChange(item.id, "optional", e.target.checked)
                            }
                            disabled={isLocked}
                            className="h-4 w-4"
                          />
                          Optional
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isLocked}
                          className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-muted-foreground">
                      Line total:{" "}
                      <span className="font-medium text-foreground">
                        {formatMoney(
                          (() => {
                            const quantity = Number(item.quantity || 0)
                            const unitPrice = Number(item.unitPrice || 0)
                            const discountAmount = Number(item.discountAmount || 0)
                            const taxRate = parseTaxRate(item.taxRate)

                            const base = quantity * unitPrice
                            const taxable = Math.max(base - discountAmount, 0)
                            const tax =
                              taxRate != null && !Number.isNaN(taxRate)
                                ? (taxable * taxRate) / 100
                                : 0

                            return taxable + tax
                          })(),
                          currency
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatMoney(totals.subtotal, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">Discount Total</span>
                <span className="font-medium">
                  {formatMoney(totals.discountTotal, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">Tax Total</span>
                <span className="font-medium">
                  {formatMoney(totals.taxTotal, currency)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t pt-3 text-base">
                <span className="font-semibold">Grand Total</span>
                <span className="font-semibold">
                  {formatMoney(totals.totalAmount, currency)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          {(data.request || data.tour) && (
            <div className="rounded-2xl border bg-background p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Quote context</h2>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Purpose
                  </p>
                  <p className="mt-1 font-medium">{data.purpose}</p>
                </div>

                {data.request ? (
                  <>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Request
                      </p>
                      <p className="mt-1 font-medium">{requestDisplayName}</p>
                      <p className="text-muted-foreground">
                        {data.request.requestReference}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Customer
                      </p>
                      <p className="mt-1">{data.request.customerName || "—"}</p>
                      <p className="text-muted-foreground">
                        {data.request.customerEmail || "—"}
                      </p>
                      <p className="text-muted-foreground">
                        {data.request.customerPhone || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Agency / Source
                      </p>
                      <p className="mt-1">
                        {data.request.companyName ||
                          data.request.user.travelAgency ||
                          data.request.user.fullName ||
                          "—"}
                      </p>
                      <p className="text-muted-foreground">{data.request.user.email}</p>
                      <p className="text-muted-foreground">
                        Agent code: {data.request.user.agentCode || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Trip
                      </p>
                      <p className="mt-1">
                        {data.request.destination ||
                          (data.request.destinations.length > 0
                            ? data.request.destinations.join(", ")
                            : "—")}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(data.request.startDate)} →{" "}
                        {formatDate(data.request.endDate)}
                      </p>
                      <p className="text-muted-foreground">
                        Duration: {data.request.durationDays ?? "—"} days
                      </p>
                      <p className="text-muted-foreground">
                        Pax: {totalPassengers || "—"}
                      </p>
                    </div>
                  </>
                ) : null}

                {data.tour ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tour
                    </p>
                    <p className="mt-1 font-medium">{data.tour.title}</p>
                    <p className="text-muted-foreground">{data.tour.category}</p>
                    <p className="text-muted-foreground">
                      Departure: {formatDate(data.departureDate?.date)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Quote lifecycle</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(data.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(data.updatedAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">PDF Generated</span>
                <span>{formatDate(data.pdfGeneratedAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Finalized</span>
                <span>{formatDate(data.finalizedAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Finalized By</span>
                <span>{data.finalizedBy?.fullName || data.finalizedBy?.email || "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Sent</span>
                <span>{formatDate(data.sentAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Sent By</span>
                <span>{data.sentBy?.fullName || data.sentBy?.email || "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Expires</span>
                <span>{formatDate(data.expiresAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Converted</span>
                <span>{formatDate(data.convertedAt)}</span>
              </div>
            </div>

            {data.booking ? (
              <div className="mt-6 rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Linked Booking
                </p>
                <p className="mt-2 text-sm font-medium">
                  {data.booking.bookingDisplayCode ||
                    data.booking.bookingReference}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {data.booking.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  Payment: {data.booking.paymentStatus}
                </p>
              </div>
            ) : data.status === "SENT" ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleConvertToBooking}
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeAction === "convert" ? "Converting..." : "Convert to Booking"}
                </button>
                <p className="mt-2 text-xs text-muted-foreground">
                  This will create a booking from this quote.
                </p>
              </div>
            ) : (
              <p className="mt-6 text-xs text-muted-foreground">
                Conversion is available after the quote is sent.
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Recent activity</h2>

            {data.activities.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {data.activities.map((activity) => (
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
        </aside>
      </div>
    </div>
  )
}