'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

import type { FlightCostItem } from '@/features/quotes/types'

type Props = {
  value: FlightCostItem[]
  onChange: (next: FlightCostItem[]) => void
}

function n(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fl-${crypto.randomUUID()}`
  }
  return `fl-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

export function FlightCostsSection({ value, onChange }: Props) {
  const items = Array.isArray(value) ? value : []

  const updateItem = (id: string, patch: Partial<FlightCostItem>) => {
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
        description: '',
        costPerPerson: 0,
      },
    ])
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Flight Costs</CardTitle>
        <Button type="button" onClick={addItem}>
          Add Row
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px_100px]"
            >
              {/* DESCRIPTION */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={item.description ?? ''}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                  placeholder="e.g. Passenger Flight / Guide / Staff"
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
              No flight cost rows yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}