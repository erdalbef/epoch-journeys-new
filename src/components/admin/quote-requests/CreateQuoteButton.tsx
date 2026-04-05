"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type CreateQuoteButtonProps = {
  requestId: string
  label?: string
}

export default function CreateQuoteButton({
  requestId,
  label = "Create Quote",
}: CreateQuoteButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/quote-requests/${requestId}/quotes`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Failed to create quote.")
      }

      router.push(`/admin/quotes/${result.quoteId}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to create quote.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={isLoading}
      className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? "Creating..." : label}
    </button>
  )
}