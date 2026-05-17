"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TourOption = {
  id: string;
  title: string;
};

type Props = {
  agentId: string;
  tours: TourOption[];
};

export default function AgentTourCommissionForm({
  agentId,
  tours,
}: Props) {
  const router = useRouter();

  const [tourId, setTourId] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [payoutPerPax, setPayoutPerPax] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const parsedCommissionRate =
        commissionRate.trim() === "" ? null : Number(commissionRate);

      const parsedPayoutPerPax =
        payoutPerPax.trim() === "" ? null : Number(payoutPerPax);

      if (
        parsedCommissionRate !== null &&
        (parsedCommissionRate < 0 || parsedCommissionRate > 100)
      ) {
        setError("Commission must be between 0 and 100.");
        setLoading(false);
        return;
      }

      const commissionRateDecimal =
        parsedCommissionRate === null ? null : parsedCommissionRate / 100;

      const response = await fetch(
        `/api/admin/agents/${agentId}/tour-commissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tourId: tourId || null,
            commissionRate: commissionRateDecimal,
            payoutPerPax: parsedPayoutPerPax,
          }),
        }
      );

      let data: { success?: boolean; error?: string } = {};

      try {
        data = (await response.json()) as {
          success?: boolean;
          error?: string;
        };
      } catch {
        setError("The server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to save commission.");
        setLoading(false);
        return;
      }

      setMessage(
        tourId
          ? "Tour commission override saved successfully."
          : "General commission saved successfully."
      );

      setTourId("");
      setCommissionRate("");
      setPayoutPerPax("");

      router.refresh();
    } catch (err) {
      console.error("COMMISSION_FORM_SUBMIT_ERROR", err);
      setError("Something went wrong while saving the commission.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="tourId" className="text-sm font-medium">
          Commission Type
        </label>

        <select
          id="tourId"
          value={tourId}
          onChange={(e) => setTourId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#001F3F]"
        >
          <option value="">General commission for this agent</option>

          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              Tour override: {tour.title}
            </option>
          ))}
        </select>

        <p className="mt-1 text-xs text-muted-foreground">
          Leave this as general commission unless this agent needs a special
          commission for one specific tour.
        </p>
      </div>

      <div>
        <label htmlFor="commissionRate" className="text-sm font-medium">
          Commission Rate (%)
        </label>

        <input
          id="commissionRate"
          type="number"
          min="0"
          max="100"
          step="1"
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
          placeholder="10"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#001F3F]"
        />

        <p className="mt-1 text-xs text-muted-foreground">
          Enter percentage. Example: 10 for 10%.
        </p>
      </div>

      <div>
        <label htmlFor="payoutPerPax" className="text-sm font-medium">
          Payout Per Pax
        </label>

        <input
          id="payoutPerPax"
          type="number"
          min="0"
          step="0.01"
          value={payoutPerPax}
          onChange={(e) => setPayoutPerPax(e.target.value)}
          placeholder="Optional"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#001F3F]"
        />
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save Commission"}
      </button>
    </form>
  );
}