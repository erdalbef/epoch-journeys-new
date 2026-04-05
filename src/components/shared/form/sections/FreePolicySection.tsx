'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type FreeMethod = 'SPREAD_ACROSS_PAYING_PASSENGERS' | 'ABSORBED_INTERNALLY'

export type FreePolicyValues = {
  enabled: boolean
  method: FreeMethod
}

type Props = {
  value: FreePolicyValues
  onChange: (next: FreePolicyValues) => void
}

export function FreePolicySection({ value, onChange }: Props) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Free Policy</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={value.enabled}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  enabled: checked,
                })
              }
            />
            <div>
              <p className="font-medium text-slate-900">Enable Free Policy</p>
              <p className="text-sm text-slate-600">
                Spread free cost across paying pax or absorb internally.
              </p>
            </div>
          </div>

          <Tabs
            value={value.method}
            onValueChange={(v) =>
              onChange({
                ...value,
                method: v as FreeMethod,
              })
            }
          >
            <TabsList className="grid w-full grid-cols-2 md:w-90">
              <TabsTrigger value="SPREAD_ACROSS_PAYING_PASSENGERS">
                Spread Across Paying
              </TabsTrigger>
              <TabsTrigger value="ABSORBED_INTERNALLY">
                Absorb Internally
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}