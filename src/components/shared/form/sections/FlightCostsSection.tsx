'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FlightCosts = {
  passengerFlightPerPerson: number
  guideFlightTotal: number
  tourManagerFlightTotal: number
  staffFlightTotal: number
}

type FlightCostsSectionProps = {
  value: FlightCosts
  onChange: (next: FlightCosts) => void
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
  step = 1,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(n(e.target.value))}
      />
    </div>
  )
}

export function FlightCostsSection({
  value,
  onChange,
}: FlightCostsSectionProps) {
  const update = <K extends keyof FlightCosts>(
    key: K,
    nextValue: FlightCosts[K]
  ) => {
    onChange({
      ...value,
      [key]: nextValue,
    })
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Flight Costs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            id="passengerFlightPerPerson"
            label="Passenger Flight / Person"
            value={value.passengerFlightPerPerson}
            onChange={(v) => update('passengerFlightPerPerson', v)}
            step={0.01}
          />
          <NumberField
            id="guideFlightTotal"
            label="Guide Flight Total"
            value={value.guideFlightTotal}
            onChange={(v) => update('guideFlightTotal', v)}
            step={0.01}
          />
          <NumberField
            id="tourManagerFlightTotal"
            label="TM Flight Total"
            value={value.tourManagerFlightTotal}
            onChange={(v) => update('tourManagerFlightTotal', v)}
            step={0.01}
          />
          <NumberField
            id="staffFlightTotal"
            label="Staff Flight Total"
            value={value.staffFlightTotal}
            onChange={(v) => update('staffFlightTotal', v)}
            step={0.01}
          />
        </div>
      </CardContent>
    </Card>
  )
}