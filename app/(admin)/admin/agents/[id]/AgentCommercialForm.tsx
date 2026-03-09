"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PartnerType =
  | "TOUR_OPERATOR"
  | "TRAVEL_AGENCY"
  | "TRAVEL_EXPERT"
  | "GROUP_LEADER";

type Props = {
  agentId: string;
  partnerType: PartnerType | null;
  commissionRate: number | null;
  payoutPerPax: number | null;
};

function usesCommission(pt: PartnerType) {
  return (
    pt === "TOUR_OPERATOR" ||
    pt === "TRAVEL_AGENCY" ||
    pt === "TRAVEL_EXPERT"
  );
}

export function AgentCommercialForm({
  agentId,
  partnerType,
  commissionRate,
  payoutPerPax,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [commission, setCommission] = useState(
    commissionRate ? String(commissionRate * 100) : ""
  );

  const [payout, setPayout] = useState(
    payoutPerPax ? String(payoutPerPax) : ""
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const body = usesCommission(partnerType as PartnerType)
        ? {
            commissionRate: Number(commission) / 100,
            payoutPerPax: null,
          }
        : {
            commissionRate: null,
            payoutPerPax: Number(payout),
          };

      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Failed to save.");
        return;
      }

      setSaved(true);
      location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {usesCommission(partnerType as PartnerType) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Commission (%)</label>
          <Input
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            placeholder="e.g. 12"
          />
        </div>
      )}

      {partnerType === "GROUP_LEADER" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Payout per Passenger ($)</label>
          <Input
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            placeholder="e.g. 150"
          />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      {saved && (
        <div className="text-sm text-green-600">
          Saved successfully.
        </div>
      )}

      <Button onClick={onSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Commercial Settings"}
      </Button>
    </div>
  );
}