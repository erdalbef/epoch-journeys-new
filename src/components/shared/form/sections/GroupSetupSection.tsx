'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type PricingMode = 'LAND_ONLY' | 'LAND_AND_AIR' | 'BOTH'

export type GroupFormValues = {
  totalPassengers: number
  payingPassengers: number
  freePassengers: number
  doubleTwinPassengers: number
  singlePassengers: number
  triplePassengers: number
  nights: number
  durationDays: number
  pricingMode: PricingMode
}

type Props = {
  value: GroupFormValues
  onChange: (next: GroupFormValues) => void
}

function n(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(n(e.target.value))}
      />
    </div>
  )
}

export function GroupSetupSection({ value, onChange }: Props) {
  const update = <K extends keyof GroupFormValues>(key: K, v: GroupFormValues[K]) => {
    onChange({
      ...value,
      [key]: v,
    })
  }

  const occupancyMismatch =
    value.doubleTwinPassengers +
      value.singlePassengers +
      value.triplePassengers !==
    value.totalPassengers

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Group Setup</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            id="totalPassengers"
            label="Total Passengers"
            value={value.totalPassengers}
            onChange={(v) => update('totalPassengers', v)}
          />
          <NumberField
            id="payingPassengers"
            label="Paying Passengers"
            value={value.payingPassengers}
            onChange={(v) => update('payingPassengers', v)}
          />
          <NumberField
            id="freePassengers"
            label="Free Passengers"
            value={value.freePassengers}
            onChange={(v) => update('freePassengers', v)}
          />
          <NumberField
            id="nights"
            label="Nights"
            value={value.nights}
            onChange={(v) => update('nights', v)}
          />
          <NumberField
            id="durationDays"
            label="Duration Days"
            value={value.durationDays}
            onChange={(v) => update('durationDays', v)}
          />
          <NumberField
            id="doubleTwinPassengers"
            label="Double/Twin Pax"
            value={value.doubleTwinPassengers}
            onChange={(v) => update('doubleTwinPassengers', v)}
          />
          <NumberField
            id="singlePassengers"
            label="Single Pax"
            value={value.singlePassengers}
            onChange={(v) => update('singlePassengers', v)}
          />
          <NumberField
            id="triplePassengers"
            label="Triple Pax"
            value={value.triplePassengers}
            onChange={(v) => update('triplePassengers', v)}
          />
        </div>

        {occupancyMismatch && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Occupancy total does not match total passengers.
          </p>
        )}
      </CardContent>
    </Card>
  )
}