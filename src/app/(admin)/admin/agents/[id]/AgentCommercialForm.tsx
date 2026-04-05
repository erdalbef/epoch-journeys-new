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

function usesCommission(partnerType: PartnerType | null) {
  return (
    partnerType === "TOUR_OPERATOR" ||
    partnerType === "TRAVEL_AGENCY" ||
    partnerType === "TRAVEL_EXPERT"
  );
}

function usesPayoutPerPax(partnerType: PartnerType | null) {
  return partnerType === "GROUP_LEADER";
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? NaN : parsed;
}

export function AgentCommercialForm({
  agentId,
  partnerType,
  commissionRate,
  payoutPerPax,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [commission, setCommission] = useState(
    commissionRate !== null && commissionRate !== undefined
      ? String(commissionRate * 100)
      : ""
  );

  const [payout, setPayout] = useState(
    payoutPerPax !== null && payoutPerPax !== undefined
      ? String(payoutPerPax)
      : ""
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSave() {
    setError(null);
    setSaved(false);

    const parsedCommission = parseOptionalNumber(commission);
    const parsedPayout = parseOptionalNumber(payout);

    if (usesCommission(partnerType)) {
      if (Number.isNaN(parsedCommission)) {
        setError("Commission must be a valid number.");
        return;
      }

      if (
        parsedCommission !== null &&
        (parsedCommission < 0 || parsedCommission > 100)
      ) {
        setError("Commission must be between 0 and 100.");
        return;
      }
    }

    if (usesPayoutPerPax(partnerType)) {
      if (Number.isNaN(parsedPayout)) {
        setError("Payout per passenger must be a valid number.");
        return;
      }

      if (parsedPayout !== null && parsedPayout < 0) {
        setError("Payout per passenger cannot be negative.");
        return;
      }
    }

    startTransition(async () => {
      const body = usesCommission(partnerType)
        ? {
            commissionRate:
              parsedCommission === null ? null : parsedCommission / 100,
            payoutPerPax: null,
          }
        : usesPayoutPerPax(partnerType)
        ? {
            commissionRate: null,
            payoutPerPax: parsedPayout,
          }
        : {
            commissionRate: null,
            payoutPerPax: null,
          };

      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          typeof data?.error === "string" ? data.error : "Failed to save."
        );
        return;
      }

      setSaved(true);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {usesCommission(partnerType) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Commission (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={commission}
            onChange={(e) => {
              setCommission(e.target.value);
              setError(null);
              setSaved(false);
            }}
            placeholder="e.g. 12"
            disabled={isPending}
          />
        </div>
      )}

      {usesPayoutPerPax(partnerType) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Payout per Passenger ($)
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={payout}
            onChange={(e) => {
              setPayout(e.target.value);
              setError(null);
              setSaved(false);
            }}
            placeholder="e.g. 150"
            disabled={isPending}
          />
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {saved && (
        <div className="text-sm text-green-600">Saved successfully.</div>
      )}

      <Button onClick={onSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Commercial Settings"}
      </Button>
    </div>
  );
}