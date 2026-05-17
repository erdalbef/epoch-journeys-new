'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { QuoteDetails } from '@/features/quotes/types'

type Props = {
  value: QuoteDetails
  onChange: (next: QuoteDetails) => void
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function QuoteDetailsSection({ value, onChange }: Props) {
  const update = <K extends keyof QuoteDetails>(key: K, v: string) => {
    onChange({ ...value, [key]: v })
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Quote Details</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-2">

        <Field
          label="Quote Title"
          value={value.quoteTitle}
          onChange={(v) => update('quoteTitle', v)}
        />

        <Field
          label="Agent Name"
          value={value.agentName}
          onChange={(v) => update('agentName', v)}
        />

        <Field
          label="Client Name"
          value={value.clientName}
          onChange={(v) => update('clientName', v)}
        />

        <Field
          label="Destination"
          value={value.destination}
          onChange={(v) => update('destination', v)}
        />

        <Field
          label="Travel Dates"
          value={value.travelDates}
          onChange={(v) => update('travelDates', v)}
        />

        <Field
          label="Valid Until"
          value={value.validUntil}
          onChange={(v) => update('validUntil', v)}
        />

        <div className="space-y-2 md:col-span-2">
          <Label>Notes</Label>
          <textarea
            value={value.notes}
            onChange={(e) => update('notes', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
            rows={3}
          />
        </div>

      </CardContent>
    </Card>
  )
}