"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OfferReminderButton({offerId, enabled}: {offerId: string; enabled: boolean}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(enabled);

  async function toggle() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/hotel-offers/${encodeURIComponent(offerId)}/reminders`, {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({enabled: !current}),
      });
      const result = await response.json() as {enabled?: boolean; error?: string};
      if (!response.ok || typeof result.enabled !== "boolean") throw new Error(result.error || "Could not update deadline reminders.");
      setCurrent(result.enabled);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update deadline reminders.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-1">
    <button type="button" disabled={saving} onClick={() => void toggle()}
      className="rounded border border-blue-500 bg-white px-3 py-2 font-semibold disabled:opacity-50">
      {saving ? "Saving…" : current ? "Disable deadline reminders" : "Enable deadline reminders"}
    </button>
    {current && <p role="status">Admin alerts are enabled for this offer.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
