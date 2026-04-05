"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type QuoteRequestUpdateFormProps = {
  requestId: string
  initialValues: {
    status: "NEW" | "IN_REVIEW" | "QUOTED" | "CONFIRMED" | "CANCELLED"
    requestType: "TAILOR_MADE" | "BESPOKE_GROUP" | "QUOTE_ONLY"
    bookingType: "FIT" | "GROUP"
    quotedAmount: number | null
    quotedCurrency: string | null
    quotedAt: string | null
    followUpDate: string | null
    adminReply: string | null
    internalNotes: string | null
    convertedToBooking: boolean
    convertedBookingId: string | null
  }
}

function toDateInputValue(value: string | null) {
  if (!value) return ""
  return new Date(value).toISOString().slice(0, 10)
}

export default function QuoteRequestUpdateForm({
  requestId,
  initialValues,
}: QuoteRequestUpdateFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState(initialValues.status)
  const [requestType, setRequestType] = useState(initialValues.requestType)
  const [bookingType, setBookingType] = useState(initialValues.bookingType)
  const [quotedAmount, setQuotedAmount] = useState(
    initialValues.quotedAmount?.toString() ?? ""
  )
  const [quotedCurrency, setQuotedCurrency] = useState(
    initialValues.quotedCurrency ?? "EUR"
  )
  const [quotedAt, setQuotedAt] = useState(
    toDateInputValue(initialValues.quotedAt)
  )
  const [followUpDate, setFollowUpDate] = useState(
    toDateInputValue(initialValues.followUpDate)
  )
  const [adminReply, setAdminReply] = useState(initialValues.adminReply ?? "")
  const [internalNotes, setInternalNotes] = useState(
    initialValues.internalNotes ?? ""
  )
  const [convertedToBooking, setConvertedToBooking] = useState(
    initialValues.convertedToBooking
  )
  const [convertedBookingId, setConvertedBookingId] = useState(
    initialValues.convertedBookingId ?? ""
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    startTransition(async () => {
      try {
        const payload = {
          status,
          requestType,
          bookingType,
          quotedAmount: quotedAmount ? Number(quotedAmount) : null,
          quotedCurrency: quotedCurrency.trim() ? quotedCurrency.trim() : null,
          quotedAt: quotedAt ? new Date(quotedAt).toISOString() : null,
          followUpDate: followUpDate
            ? new Date(followUpDate).toISOString()
            : null,
          adminReply: adminReply.trim() ? adminReply.trim() : null,
          internalNotes: internalNotes.trim() ? internalNotes.trim() : null,
          convertedToBooking,
          convertedBookingId: convertedBookingId.trim()
            ? convertedBookingId.trim()
            : null,
        }

        const response = await fetch(`/api/quote-requests/${requestId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.message || "Failed to update quote request")
          return
        }

        setMessage("Quote request updated successfully.")
        router.refresh()
      } catch (err) {
        console.error(err)
        setError("Something went wrong while updating the quote request.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border p-5">
      <div>
        <h2 className="text-lg font-medium">Update Quote Request</h2>
        <p className="text-sm text-muted-foreground">
          Manage workflow, quote values, and booking conversion status.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as
                  | "NEW"
                  | "IN_REVIEW"
                  | "QUOTED"
                  | "CONFIRMED"
                  | "CANCELLED"
              )
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="NEW">NEW</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="QUOTED">QUOTED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="requestType" className="text-sm font-medium">
            Request Type
          </label>
          <select
            id="requestType"
            value={requestType}
            onChange={(e) =>
              setRequestType(
                e.target.value as
                  | "TAILOR_MADE"
                  | "BESPOKE_GROUP"
                  | "QUOTE_ONLY"
              )
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="TAILOR_MADE">TAILOR_MADE</option>
            <option value="BESPOKE_GROUP">BESPOKE_GROUP</option>
            <option value="QUOTE_ONLY">QUOTE_ONLY</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="bookingType" className="text-sm font-medium">
            Booking Type
          </label>
          <select
            id="bookingType"
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value as "FIT" | "GROUP")}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="FIT">FIT</option>
            <option value="GROUP">GROUP</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="quotedCurrency" className="text-sm font-medium">
            Quoted Currency
          </label>
          <input
            id="quotedCurrency"
            type="text"
            value={quotedCurrency}
            onChange={(e) => setQuotedCurrency(e.target.value)}
            placeholder="EUR"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="quotedAmount" className="text-sm font-medium">
            Quoted Amount
          </label>
          <input
            id="quotedAmount"
            type="number"
            min="0"
            step="0.01"
            value={quotedAmount}
            onChange={(e) => setQuotedAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="quotedAt" className="text-sm font-medium">
            Quoted At
          </label>
          <input
            id="quotedAt"
            type="date"
            value={quotedAt}
            onChange={(e) => setQuotedAt(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="followUpDate" className="text-sm font-medium">
            Follow-up Date
          </label>
          <input
            id="followUpDate"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <input
            id="convertedToBooking"
            type="checkbox"
            checked={convertedToBooking}
            onChange={(e) => setConvertedToBooking(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="convertedToBooking" className="text-sm font-medium">
            Converted to Booking
          </label>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="convertedBookingId" className="text-sm font-medium">
            Converted Booking ID
          </label>
          <input
            id="convertedBookingId"
            type="text"
            value={convertedBookingId}
            onChange={(e) => setConvertedBookingId(e.target.value)}
            placeholder="Booking ID"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="adminReply" className="text-sm font-medium">
            Admin Reply
          </label>
          <textarea
            id="adminReply"
            value={adminReply}
            onChange={(e) => setAdminReply(e.target.value)}
            rows={5}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Write the quote response to the agent or customer"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="internalNotes" className="text-sm font-medium">
            Internal Notes
          </label>
          <textarea
            id="internalNotes"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={5}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Internal admin notes"
          />
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  )
}