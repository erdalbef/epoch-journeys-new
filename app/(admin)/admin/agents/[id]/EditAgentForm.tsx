"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  agentId: string;
  fullName: string | null;
  travelAgency: string | null;
  phone: string | null;
  website: string | null;
  membership: string | null;
  notes: string | null;
};

export function EditAgentForm({
  agentId,
  fullName,
  travelAgency,
  phone,
  website,
  membership,
  notes,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    fullName: fullName ?? "",
    travelAgency: travelAgency ?? "",
    phone: phone ?? "",
    website: website ?? "",
    membership: membership ?? "",
    notes: notes ?? "",
  });

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
    setSaved(false);
  }

  function onSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName || null,
          travelAgency: form.travelAgency || null,
          phone: form.phone || null,
          website: form.website || null,
          membership: form.membership || null,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error
            ? String(data.error)
            : `Failed to save changes (HTTP ${res.status})`
        );
        return;
      }

      setSaved(true);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {/* Full Name */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Full Name</label>
        <Input
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          disabled={isPending}
        />
      </div>

      {/* Travel Agency */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Travel Agency</label>
        <Input
          name="travelAgency"
          value={form.travelAgency}
          onChange={handleChange}
          disabled={isPending}
        />
      </div>

      {/* Phone */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Phone</label>
        <Input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          disabled={isPending}
        />
      </div>

      {/* Website */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Website</label>
        <Input
          name="website"
          value={form.website}
          onChange={handleChange}
          disabled={isPending}
        />
      </div>

      {/* Membership */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Membership (ASTA / NTA / IATA / CLIA)
        </label>
        <Input
          name="membership"
          value={form.membership}
          onChange={handleChange}
          disabled={isPending}
        />
      </div>

      {/* Notes */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Internal Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          className="min-h-25 w-full rounded-md border px-3 py-2 text-sm"
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved successfully.
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
