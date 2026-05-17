"use client";

import type { ChangeEvent } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { GroupSetup } from "@/features/quotes/types";

type Props = {
  value: GroupSetup;
  onChange: (next: GroupSetup) => void;
};

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function n(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: NumberFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(n(e.target.value));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

export function GroupSetupSection({ value, onChange }: Props) {
  const update = <K extends keyof GroupSetup>(
    key: K,
    nextValue: GroupSetup[K]
  ) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  const occupancyMismatch =
    value.doubleCount + value.singleCount + value.tripleCount !== value.groupSize;

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Group Setup</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField
            id="groupSize"
            label="Total Passengers"
            value={value.groupSize}
            onChange={(nextValue) => update("groupSize", nextValue)}
          />
          <NumberField
            id="payingPax"
            label="Paying Passengers"
            value={value.payingPax}
            onChange={(nextValue) => update("payingPax", nextValue)}
          />
          <NumberField
            id="doubleCount"
            label="Double/Twin Pax"
            value={value.doubleCount}
            onChange={(nextValue) => update("doubleCount", nextValue)}
          />
          <NumberField
            id="singleCount"
            label="Single Pax"
            value={value.singleCount}
            onChange={(nextValue) => update("singleCount", nextValue)}
          />
          <NumberField
            id="tripleCount"
            label="Triple Pax"
            value={value.tripleCount}
            onChange={(nextValue) => update("tripleCount", nextValue)}
          />
        </div>

        {occupancyMismatch ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Occupancy total does not match total passengers.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}