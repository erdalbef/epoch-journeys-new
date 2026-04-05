"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tour = {
  id: string;
  title: string;
};

type Props = {
  agentId: string;
  tours: Tour[];
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? NaN : parsed;
}

export function AgentTourCommissionForm({ agentId, tours }: Props) {
  const [isPending, startTransition] = useTransition();

  const [tourId, setTourId] = useState("");
  const [commission, setCommission] = useState("");
  const [payoutPerPax, setPayoutPerPax] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function resetForm() {
    setTourId("");
    setCommission("");
    setPayoutPerPax("");
  }

  function onSave() {
    setError(null);
    setSaved(false);

    if (!tourId) {
      setError("Please select a tour.");
      return;
    }

    const parsedCommission = parseOptionalNumber(commission);
    const parsedPayout = parseOptionalNumber(payoutPerPax);

    if (Number.isNaN(parsedCommission)) {
      setError("Commission must be a valid number.");
      return;
    }

    if (Number.isNaN(parsedPayout)) {
      setError("Payout per pax must be a valid number.");
      return;
    }

    if (
      parsedCommission !== null &&
      (parsedCommission < 0 || parsedCommission > 100)
    ) {
      setError("Commission must be between 0 and 100.");
      return;
    }

    if (parsedPayout !== null && parsedPayout < 0) {
      setError("Payout per pax cannot be negative.");
      return;
    }

    if (parsedCommission === null && parsedPayout === null) {
      setError("Enter either commission or payout per pax.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/agents/${agentId}/tour-commissions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tourId,
            commissionRate:
              parsedCommission === null ? null : parsedCommission / 100,
            payoutPerPax: parsedPayout,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : "Failed to save override."
          );
          return;
        }

        setSaved(true);
        resetForm();
        window.location.reload();
      } catch (err) {
        console.error("AGENT_TOUR_COMMISSION_FORM_ERROR", err);
        setError("Unexpected error. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Tour</label>
        <select
          value={tourId}
          onChange={(e) => {
            setTourId(e.target.value);
            setError(null);
            setSaved(false);
          }}
          disabled={isPending}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select a tour</option>
          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {tour.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
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
            disabled={isPending}
            placeholder="e.g. 12"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Payout per Pax</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={payoutPerPax}
            onChange={(e) => {
              setPayoutPerPax(e.target.value);
              setError(null);
              setSaved(false);
            }}
            disabled={isPending}
            placeholder="e.g. 50"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use commission % for agencies / advisors. Use payout per pax for group
        leader-style overrides. If both are entered, both will be saved.
      </p>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Override saved successfully.
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Override"}
        </Button>
      </div>
    </div>
  );
}