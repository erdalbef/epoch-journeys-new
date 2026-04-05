'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FixedCosts = {
  entranceFees: number
  lunchUnitCost: number
  lunchQty: number
  dinnerUnitCost: number
  dinnerQty: number
  whisperUnitCost: number
  whisperDays: number
  cityTaxUnitCost: number
  hotelDoubleTwinPerPerson: number
  hotelSinglePerPerson: number
  hotelTriplePerPerson: number
  accommodationTaxPerRoomNight: number
  climateTaxPerRoomNight: number
}

type FixedCostsSectionProps = {
  value: FixedCosts
  onChange: (next: FixedCosts) => void
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

export function FixedCostsSection({
  value,
  onChange,
}: FixedCostsSectionProps) {
  const update = <K extends keyof FixedCosts>(key: K, nextValue: FixedCosts[K]) => {
    onChange({
      ...value,
      [key]: nextValue,
    })
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Fixed Costs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            id="entranceFees"
            label="Entrance Fees Total"
            value={value.entranceFees}
            onChange={(v) => update('entranceFees', v)}
            step={0.01}
          />
          <NumberField
            id="lunchUnitCost"
            label="Lunch Unit Cost"
            value={value.lunchUnitCost}
            onChange={(v) => update('lunchUnitCost', v)}
            step={0.01}
          />
          <NumberField
            id="lunchQty"
            label="Lunch Qty"
            value={value.lunchQty}
            onChange={(v) => update('lunchQty', v)}
          />
          <NumberField
            id="dinnerUnitCost"
            label="Dinner Unit Cost"
            value={value.dinnerUnitCost}
            onChange={(v) => update('dinnerUnitCost', v)}
            step={0.01}
          />
          <NumberField
            id="dinnerQty"
            label="Dinner Qty"
            value={value.dinnerQty}
            onChange={(v) => update('dinnerQty', v)}
          />
          <NumberField
            id="whisperUnitCost"
            label="Whisper Daily Cost"
            value={value.whisperUnitCost}
            onChange={(v) => update('whisperUnitCost', v)}
            step={0.01}
          />
          <NumberField
            id="whisperDays"
            label="Whisper Days"
            value={value.whisperDays}
            onChange={(v) => update('whisperDays', v)}
          />
          <NumberField
            id="cityTaxUnitCost"
            label="City Tax / Person / Night"
            value={value.cityTaxUnitCost}
            onChange={(v) => update('cityTaxUnitCost', v)}
            step={0.01}
          />
          <NumberField
            id="hotelDoubleTwinPerPerson"
            label="Hotel Double/Twin / Person"
            value={value.hotelDoubleTwinPerPerson}
            onChange={(v) => update('hotelDoubleTwinPerPerson', v)}
            step={0.01}
          />
          <NumberField
            id="hotelSinglePerPerson"
            label="Hotel Single / Person"
            value={value.hotelSinglePerPerson}
            onChange={(v) => update('hotelSinglePerPerson', v)}
            step={0.01}
          />
          <NumberField
            id="hotelTriplePerPerson"
            label="Hotel Triple / Person"
            value={value.hotelTriplePerPerson}
            onChange={(v) => update('hotelTriplePerPerson', v)}
            step={0.01}
          />
          <NumberField
            id="accommodationTaxPerRoomNight"
            label="Accommodation Tax / Room / Night"
            value={value.accommodationTaxPerRoomNight}
            onChange={(v) => update('accommodationTaxPerRoomNight', v)}
            step={0.01}
          />
          <NumberField
            id="climateTaxPerRoomNight"
            label="Climate Tax / Room / Night"
            value={value.climateTaxPerRoomNight}
            onChange={(v) => update('climateTaxPerRoomNight', v)}
            step={0.01}
          />
        </div>
      </CardContent>
    </Card>
  )
}