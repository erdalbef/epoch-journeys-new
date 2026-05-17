"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

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

export type BuilderQuoteItem = {
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

type TemplateListItem = {
  id: string
  title: string
  currency: string
}

type TemplateDetailItem = {
  id: string
  itemType: QuoteItemType
  title: string
  description: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate: number | null
  optional: boolean
  sortOrder: number
}

type TemplateDetail = {
  id: string
  title: string
  description: string | null
  currency: string
  items: TemplateDetailItem[]
}

type Props = {
  onApplyTemplate: (args: {
    templateId: string
    templateTitle: string
    currency: string
    items: BuilderQuoteItem[]
  }) => void
}

function toBuilderItems(items: TemplateDetailItem[]): BuilderQuoteItem[] {
  return items.map((item, index) => ({
    id: `template-${item.id}-${index}`,
    itemType: item.itemType,
    title: item.title,
    description: item.description ?? "",
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discountAmount: String(item.discountAmount ?? 0),
    taxRate: item.taxRate != null ? String(item.taxRate) : "",
    optional: item.optional,
    sortOrder: item.sortOrder ?? index,
  }))
}

export default function QuoteTemplatePicker({ onApplyTemplate }: Props) {
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true)

        const res = await fetch("/api/quote-templates", {
          cache: "no-store",
        })

        const json = (await res.json()) as
          | TemplateListItem[]
          | { message?: string }

        if (!res.ok || !Array.isArray(json)) {
          throw new Error(
            !Array.isArray(json) && json.message
              ? json.message
              : "Failed to load templates."
          )
        }

        setTemplates(
          json.map((template) => ({
            id: template.id,
            title: template.title,
            currency: template.currency,
          }))
        )
      } catch (error) {
        console.error("Failed to load templates", error)
        toast.error("Failed to load templates.")
      } finally {
        setLoading(false)
      }
    }

    void loadTemplates()
  }, [])

  const handleApply = async () => {
    if (!selectedTemplateId) {
      toast.error("Select a template first.")
      return
    }

    try {
      setApplying(true)

      const res = await fetch(`/api/quote-templates/${selectedTemplateId}`, {
        cache: "no-store",
      })

      const json = (await res.json()) as TemplateDetail | { message?: string }

      if (!res.ok || !("id" in json)) {
        throw new Error(
          "message" in json && json.message
            ? json.message
            : "Failed to load template details."
        )
      }

      onApplyTemplate({
        templateId: json.id,
        templateTitle: json.title,
        currency: json.currency,
        items: toBuilderItems(json.items),
      })

      toast.success(`Template applied: ${json.title}`)
    } catch (error) {
      console.error("Failed to apply template", error)
      toast.error("Failed to apply template.")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Use Template</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Load a reusable quote structure into the builder.
      </p>

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          disabled={loading || applying}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="">
            {loading ? "Loading templates..." : "Select a template"}
          </option>

          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title} ({template.currency})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleApply}
          disabled={loading || applying || !selectedTemplateId}
          className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applying ? "Applying..." : "Apply Template"}
        </button>
      </div>
    </div>
  )
}