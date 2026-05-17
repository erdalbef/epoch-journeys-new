"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GroupSetupSection } from "./sections/GroupSetupSection";
import { FixedCostsSection } from "./sections/FixedCostsSection";
import { VariableCostsSection } from "./sections/VariableCostsSection";
import { FlightCostsSection } from "./sections/FlightCostsSection";
import { FreePolicySection } from "./sections/FreePolicySection";
import { PricingSettingsSection } from "./sections/PricingSettingsSection";
import { QuoteDetailsSection } from "./sections/QuoteDetailsSection";

import { initialFormState } from "@/features/quotes/defaults";
import { toQuoteInput } from "@/features/quotes/toQuoteInput";
import { calculateQuote } from "@/lib/quotes/calculateQuote";
import type { FormState } from "@/features/quotes/types";

const QuotePdfDownloadButton = dynamic(
  () => import("./QuotePdfDownloadButton"),
  {
    ssr: false,
    loading: () => (
      <div className="block rounded-lg bg-black py-2 text-center text-sm text-white opacity-80">
        Preparing PDF...
      </div>
    ),
  }
);

function money(v: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(v ?? 0);
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

export default function QuoteForm() {
  const [form, setForm] = useState<FormState>(initialFormState);

  const input = useMemo(() => toQuoteInput(form), [form]);
  const summary = useMemo(() => calculateQuote(input), [input]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Tabs
            value={form.group.pricingMode}
            onValueChange={(v) =>
              setForm((p) => ({
                ...p,
                group: {
                  ...p.group,
                  pricingMode: v as FormState["group"]["pricingMode"],
                },
              }))
            }
          >
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="LAND_ONLY">Land</TabsTrigger>
              <TabsTrigger value="LAND_AND_AIR">Land + Air</TabsTrigger>
              <TabsTrigger value="BOTH">Both</TabsTrigger>
            </TabsList>
          </Tabs>

          <QuoteDetailsSection
            value={form.details}
            onChange={(details) => setForm((p) => ({ ...p, details }))}
          />

          <GroupSetupSection
            value={form.group}
            onChange={(group) => setForm((p) => ({ ...p, group }))}
          />

          <FixedCostsSection
            value={form.fixedCosts}
            onChange={(fixedCosts) => setForm((p) => ({ ...p, fixedCosts }))}
          />

          <VariableCostsSection
            value={form.variableCosts}
            onChange={(variableCosts) =>
              setForm((p) => ({ ...p, variableCosts }))
            }
          />

          <FlightCostsSection
            value={form.flightCosts}
            onChange={(flightCosts) => setForm((p) => ({ ...p, flightCosts }))}
          />

          <FreePolicySection
            value={form.freePolicy}
            onChange={(freePolicy) => setForm((p) => ({ ...p, freePolicy }))}
          />

          <PricingSettingsSection
            value={form.pricing}
            onChange={(pricing) => setForm((p) => ({ ...p, pricing }))}
          />
        </div>

        <div className="sticky top-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Row label="Fixed" value={money(summary.totals.totalFixedCost)} />
              <Row
                label="Variable"
                value={money(summary.totals.totalVariableCost)}
              />
              <Row label="Flight" value={money(summary.totals.totalFlightCost)} />
              <Row
                label="Total"
                value={money(summary.totals.totalTourCost)}
                strong
              />

              <Separator />

              <Row label="DT Base" value={money(summary.baseCosts.doubleTwin)} />
              <Row label="SGL Base" value={money(summary.baseCosts.single)} />
              <Row label="TPL Base" value={money(summary.baseCosts.triple)} />

              <Separator />

              <Row
                label="DT Final"
                value={money(summary.freeAdjusted.doubleTwin)}
              />
              <Row label="SGL Final" value={money(summary.freeAdjusted.single)} />
              <Row label="TPL Final" value={money(summary.freeAdjusted.triple)} />

              {summary.pricing.landOnly && (
                <>
                  <Separator />
                  <Row
                    label="DT Sell"
                    value={money(summary.pricing.landOnly.doubleTwin.sellingPrice)}
                  />
                  <Row
                    label="SGL Sell"
                    value={money(summary.pricing.landOnly.single.sellingPrice)}
                  />
                  <Row
                    label="TPL Sell"
                    value={money(summary.pricing.landOnly.triple.sellingPrice)}
                  />
                </>
              )}

              {summary.pricing.landAndAir && (
                <>
                  <Separator />
                  <Row
                    label="DT Sell + Air"
                    value={money(summary.pricing.landAndAir.doubleTwin.sellingPrice)}
                  />
                  <Row
                    label="SGL Sell + Air"
                    value={money(summary.pricing.landAndAir.single.sellingPrice)}
                  />
                  <Row
                    label="TPL Sell + Air"
                    value={money(summary.pricing.landAndAir.triple.sellingPrice)}
                  />
                </>
              )}

              <Separator />

              <QuotePdfDownloadButton
                summary={summary}
                details={{
                  ...form.details,
                  groupSize: form.group.groupSize,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}