'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export type VariableCostItem = {
  id: string
  label: string
  amount: number
}

type VariableCostsSectionProps = {
  value: VariableCostItem[]
  onChange: (next: VariableCostItem[]) => void
}

function n(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function uid() {
  return `vc-${crypto.randomUUID()}`
}

export function VariableCostsSection({
  value,
  onChange,
}: VariableCostsSectionProps) {
  const updateItem = (
    id: string,
    patch: Partial<VariableCostItem>
  ) => {
    onChange(
      value.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      )
    )
  }

  const removeItem = (id: string) => {
    onChange(value.filter((item) => item.id !== id))
  }

  const addItem = () => {
    onChange([
      ...value,
      {
        id: uid(),
        label: 'New Cost',
        amount: 0,
      },
    ])
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Variable Costs</CardTitle>
        <Button type="button" onClick={addItem}>
          Add Row
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {value.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_100px]"
            >
              <div className="space-y-2">
                <Label htmlFor={`${item.id}-label`}>Label</Label>
                <Input
                  id={`${item.id}-label`}
                  value={item.label}
                  onChange={(e) =>
                    updateItem(item.id, { label: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${item.id}-amount`}>Amount</Label>
                <Input
                  id={`${item.id}-amount`}
                  type="number"
                  step={0.01}
                  value={item.amount}
                  onChange={(e) =>
                    updateItem(item.id, { amount: n(e.target.value) })
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

          {value.length === 0 && (
            <p className="text-sm text-slate-500">
              No variable cost rows yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}