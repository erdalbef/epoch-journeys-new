'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

import type { FixedCostItem, QuoteLineType } from '@/features/quotes/types'

type Props = {
  value: FixedCostItem[]
  onChange: (next: FixedCostItem[]) => void
}

function n(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fc-${crypto.randomUUID()}`
  }

  return `fc-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

const typeOptions: QuoteLineType[] = [
  'HOTEL',
  'ENTRANCE',
  'LUNCH',
  'DINNER',
  'WHISPER_SET',
  'CITY_TAX',
  'ACCOMMODATION_TAX',
  'GUIDE',
  'TRANSPORT',
  'FLIGHT',
  'CUSTOM',
]

export function FixedCostsSection({ value, onChange }: Props) {
  const items = Array.isArray(value) ? value : []

  const updateItem = (id: string, patch: Partial<FixedCostItem>) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const addItem = () => {
    onChange([
      ...items,
      {
        id: createId(),
        type: 'CUSTOM',
        description: '',
        totalCost: 0,
      },
    ])
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Fixed Costs</CardTitle>
        <Button type="button" onClick={addItem}>
          Add Row
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_180px_100px]"
            >
              <div className="space-y-2">
                <Label htmlFor={`${item.id}-type`}>Type</Label>
                <select
                  id={`${item.id}-type`}
                  value={item.type}
                  onChange={(e) =>
                    updateItem(item.id, {
                      type: e.target.value as QuoteLineType,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                >
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${item.id}-description`}>Description</Label>
                <Input
                  id={`${item.id}-description`}
                  value={item.description ?? ''}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                  placeholder="e.g. Museum package / Hotel block / Taxes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${item.id}-amount`}>Total Cost</Label>
                <Input
                  id={`${item.id}-amount`}
                  type="number"
                  step={0.01}
                  value={item.totalCost}
                  onChange={(e) =>
                    updateItem(item.id, { totalCost: n(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-sm text-slate-500">No fixed cost rows yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}