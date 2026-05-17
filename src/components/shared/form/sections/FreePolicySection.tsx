'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type FreeMethod =
  | 'SPREAD_ACROSS_PAYING_PASSENGERS'
  | 'ABSORBED_INTERNALLY'

export type FreePolicyValues = {
  enabled: boolean
  freePer: number   // ✅ CRITICAL
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

      <CardContent className="space-y-5">

        {/* ENABLE SWITCH */}
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
              Apply free-of-charge passengers logic
            </p>
          </div>
        </div>

        {/* FREE RATIO */}
        {value.enabled && (
          <div className="space-y-2">
            <Label>Free Ratio</Label>
            <Input
              type="number"
              min={1}
              value={value.freePer}
              onChange={(e) =>
                onChange({
                  ...value,
                  freePer: Number(e.target.value) || 0,
                })
              }
              placeholder="e.g. 20 (1 free per 20 pax)"
            />
          </div>
        )}

        {/* METHOD */}
        {value.enabled && (
          <Tabs
            value={value.method}
            onValueChange={(v) =>
              onChange({
                ...value,
                method: v as FreeMethod,
              })
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="SPREAD_ACROSS_PAYING_PASSENGERS">
                Spread Across Paying
              </TabsTrigger>

              <TabsTrigger value="ABSORBED_INTERNALLY">
                Absorb Internally
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

      </CardContent>
    </Card>
  )
}