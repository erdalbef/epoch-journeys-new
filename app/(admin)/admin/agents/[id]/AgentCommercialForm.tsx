"use client";

import { useMemo, useState, useTransition } from "react";
import type { $Enums } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PartnerType = $Enums.PartnerType | null;

type Props = {
  agentId: string;
  partnerType: $Enums.PartnerType; // comes from Prisma
  commissionRate: number | null; // stored as 0.12
  fixedPayoutPerPax: number | null; // stored as 150
};

function usesCommission(pt: $Enums.PartnerType) {
  return pt === "TOUR_OPERATOR" || pt === "TRAVEL_AGENCY" || pt === "TRAVEL_EXPERT";
}

export function AgentCommercialForm({
  agentId,
  partnerType: initialPartnerType,
  commissionRate,
  fixedPayoutPerPax,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [partnerType, setPartnerType] = useState<PartnerType>(initialPartnerType);

  // UI shows percent: 0.12 -> "12"
  const initialCommissionPercent = useMemo(() => {
    if (commissionRate == null) return "";
    return String(Math.round(commissionRate * 100));
  }, [commissionRate]);

  const [commissionPercent, setCommissionPercent] = useState<string>(
    initialCommissionPercent
  );

  const initialPayout = useMemo(() => {
    if (fixedPayoutPerPax == null) return "";
    return String(Math.round(fixedPayoutPerPax));
  }, [fixedPayoutPerPax]);

  const [payoutPerPax, setPayoutPerPax] = useState<string>(initialPayout);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  function validate(): string | null {
    if (!partnerType) return "Please select a partner type.";

    if (usesCommission(partnerType)) {
      if (!commissionPercent.trim()) return "Commission % is required.";
      const n = Number(commissionPercent);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return "Commission % must be between 0 and 100.";
      }
      return null;
    }

    // GROUP_LEADER
    if (!payoutPerPax.trim()) return "Payout per passenger is required.";
    const n = Number(payoutPerPax);
    if (!Number.isFinite(n) || n < 0) {
      return "Payout per passenger must be 0 or higher.";
    }

    return null;
  }

  function onPartnerTypeChange(next: PartnerType) {
    setPartnerType(next);
    setError(null);
    setSaved(false);

    // reset irrelevant fields
    if (next && usesCommission(next)) {
      setPayoutPerPax("");
    } else if (next === "GROUP_LEADER") {
      setCommissionPercent("");
    }
  }

  function onSave() {
    setError(null);
    setSaved(false);

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    if (!partnerType) {
      setError("Please select a partner type.");
      return;
    }

    const body = usesCommission(partnerType)
      ? {
          partnerType,
          commissionRate: Number(commissionPercent) / 100,
          fixedPayoutPerPax: null,
        }
      : {
          partnerType, // GROUP_LEADER
          commissionRate: null,
          fixedPayoutPerPax: Number(payoutPerPax),
        };

    startTransition(async () => {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error ? String(data.error) : `Failed to save changes (HTTP ${res.status}).`
        );
        return;
      }

      setSaved(true);
      window.location.reload();
    });
  }

  const showCommission = partnerType ? usesCommission(partnerType) : false;
  const showPayout = partnerType === "GROUP_LEADER";

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Partner Type</label>
        <select
          value={partnerType ?? ""}
          onChange={(e) => {
            const v = e.target.value as $Enums.PartnerType | "";
            onPartnerTypeChange(v === "" ? null : v);
          }}
          className="h-10 w-full rounded-md border bg-white px-3 text-sm"
          disabled={isPending}
        >
          <option value="">Select...</option>
          <option value="TOUR_OPERATOR">Tour Operator</option>
          <option value="TRAVEL_AGENCY">Travel Agency</option>
          <option value="TRAVEL_EXPERT">Travel Expert</option>
          <option value="GROUP_LEADER">Group Leader</option>
        </select>
      </div>

      {showCommission ? (
        <div className="grid gap-2">
          <label className="text-sm font-medium">Commission (%)</label>
          <Input
            type="number"
            inputMode="decimal"
            value={commissionPercent}
            onChange={(e) => {
              setCommissionPercent(e.target.value);
              setError(null);
              setSaved(false);
            }}
            placeholder="e.g. 12"
            disabled={isPending}
            min={0}
            max={100}
            step="0.1"
          />
          <p className="text-xs text-muted-foreground">
            Stored as decimal (12% = 0.12).
          </p>
        </div>
      ) : null}

      {showPayout ? (
        <div className="grid gap-2">
          <label className="text-sm font-medium">Payout per Passenger ($)</label>
          <Input
            type="number"
            inputMode="decimal"
            value={payoutPerPax}
            onChange={(e) => {
              setPayoutPerPax(e.target.value);
              setError(null);
              setSaved(false);
            }}
            placeholder="e.g. 150"
            disabled={isPending}
            min={0}
            step="1"
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}