'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

import type { VariableCostItem, QuoteLineType } from '@/features/quotes/types'

type Props = {
  value: VariableCostItem[]
  onChange: (next: VariableCostItem[]) => void
}

function n(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `vc-${crypto.randomUUID()}`
  }
  return `vc-${Date.now()}-${Math.floor(Math.random() * 100000)}`
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

export function VariableCostsSection({ value, onChange }: Props) {
  const items = Array.isArray(value) ? value : []

  const updateItem = (id: string, patch: Partial<VariableCostItem>) => {
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
        costPerPerson: 0,
        appliesTo: 'ALL',
      },
    ])
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Variable Costs</CardTitle>
        <Button type="button" onClick={addItem}>
          Add Row
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)_160px_140px_100px]"
            >
              {/* TYPE */}
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  value={item.type}
                  onChange={(e) =>
                    updateItem(item.id, {
                      type: e.target.value as QuoteLineType,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={item.description ?? ''}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                  placeholder="e.g. Lunch / Guide / Tickets"
                />
              </div>

              {/* COST */}
              <div className="space-y-2">
                <Label>Cost / Person</Label>
                <Input
                  type="number"
                  step={0.01}
                  value={item.costPerPerson}
                  onChange={(e) =>
                    updateItem(item.id, {
                      costPerPerson: n(e.target.value),
                    })
                  }
                />
              </div>

              {/* APPLIES TO */}
              <div className="space-y-2">
                <Label>Applies To</Label>
                <select
                  value={item.appliesTo}
                  onChange={(e) =>
                    updateItem(item.id, {
                      appliesTo: e.target.value as VariableCostItem['appliesTo'],
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="ALL">All Pax</option>
                  <option value="PAYING_ONLY">Paying Only</option>
                </select>
              </div>

              {/* REMOVE */}
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
            <p className="text-sm text-slate-500">
              No variable cost rows yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}