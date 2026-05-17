'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { PricingSettings } from '@/features/quotes/types'

type Props = {
  value: PricingSettings
  onChange: (next: PricingSettings) => void
}

export function PricingSettingsSection({ value, onChange }: Props) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Pricing Settings</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* MARKUP */}
        <div className="space-y-2">
          <Label>Markup (%)</Label>
          <Input
            type="number"
            value={value.markupPercent}
            onChange={(e) =>
              onChange({
                ...value,
                markupPercent: Number(e.target.value) || 0,
              })
            }
          />
        </div>

        {/* COMMISSION */}
        <div className="space-y-2">
          <Label>Agent Commission (%)</Label>
          <Input
            type="number"
            value={value.commissionPercent}
            onChange={(e) =>
              onChange({
                ...value,
                commissionPercent: Number(e.target.value) || 0,
              })
            }
          />
        </div>

        {/* ROUNDING */}
        <div className="space-y-2">
          <Label>Rounding</Label>

          <Select
            value={value.rounding}
            onValueChange={(v) =>
              onChange({
                ...value,
                rounding: v as PricingSettings['rounding'],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="NONE">No Rounding</SelectItem>
              <SelectItem value="NEAREST_1">Nearest 1</SelectItem>
              <SelectItem value="NEAREST_5">Nearest 5</SelectItem>
              <SelectItem value="NEAREST_10">Nearest 10</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </CardContent>
    </Card>
  )
}