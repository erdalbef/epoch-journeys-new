"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TourOption = {
  id: string;
  title: string;
  category: string;
};

type DepartureOption = {
  id: string;
  date: string;
  price: number;
  status: string;
  season: string;
};

type Props = {
  tours: TourOption[];
};

type QuoteItemForm = {
  title: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
};

export default function QuoteCreateForm({ tours }: Props) {
  const router = useRouter();

  const [purpose, setPurpose] = useState<"CUSTOM_REQUEST" | "TOUR_SETUP">("CUSTOM_REQUEST");
  const [tourId, setTourId] = useState("");
  const [departureDateId, setDepartureDateId] = useState("");
  const [departures, setDepartures] = useState<DepartureOption[]>([]);
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [termsAndNotes, setTermsAndNotes] = useState("");
  const [currency] = useState("EUR");
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<QuoteItemForm[]>([
    {
      title: "Tour package",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxAmount: 0,
    },
  ]);

  useEffect(() => {
    if (!tourId) {
      setDepartures([]);
      setDepartureDateId("");
      return;
    }

    const run = async () => {
      const res = await fetch(`/api/tours/${tourId}/departures`);
      const data = await res.json();
      if (data.ok) {
        setDepartures(data.departures);
      }
    };

    run();
  }, [tourId]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, totalAmount };
  }, [items]);

  function updateItem(index: number, patch: Partial<QuoteItemForm>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { title: "", quantity: 1, unitPrice: 0, discountAmount: 0, taxAmount: 0 },
    ]);
  }

  async function onSubmit() {
    setLoading(true);
    try {
      const actorId = "ADMIN_USER_ID_HERE";

      const payload = {
        purpose,
        tourId: tourId || null,
        departureDateId: departureDateId || null,
        title,
        recipientName,
        recipientEmail,
        internalNotes,
        termsAndNotes,
        currency,
        actorId,
        items: items.map((item, index) => ({
          title: item.title,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountAmount: Number(item.discountAmount),
          taxAmount: Number(item.taxAmount),
          total:
            Number(item.quantity) * Number(item.unitPrice) -
            Number(item.discountAmount) +
            Number(item.taxAmount),
          sortOrder: index,
        })),
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to create quote.");
      }

      router.push(`/admin/quotes/${data.quote.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create quote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Quote Context</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Purpose</span>
            <select
              className="w-full rounded-md border p-2"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as "CUSTOM_REQUEST" | "TOUR_SETUP")}
            >
              <option value="CUSTOM_REQUEST">Custom Request</option>
              <option value="TOUR_SETUP">Tour Setup</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Title</span>
            <input
              className="w-full rounded-md border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Egypt Private Family Quote"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Tour</span>
            <select
              className="w-full rounded-md border p-2"
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
            >
              <option value="">Select tour</option>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Departure</span>
            <select
              className="w-full rounded-md border p-2"
              value={departureDateId}
              onChange={(e) => setDepartureDateId(e.target.value)}
            >
              <option value="">Select departure</option>
              {departures.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {new Date(dep.date).toLocaleDateString()} — {dep.price} EUR
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Recipient</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Recipient Name</span>
            <input
              className="w-full rounded-md border p-2"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Recipient Email</span>
            <input
              className="w-full rounded-md border p-2"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quote Items</h2>
          <button type="button" onClick={addItem} className="rounded-md border px-3 py-2 text-sm">
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-5">
              <input
                className="rounded-md border p-2"
                placeholder="Title"
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
              />
              <input
                className="rounded-md border p-2"
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              />
              <input
                className="rounded-md border p-2"
                type="number"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
              />
              <input
                className="rounded-md border p-2"
                type="number"
                value={item.discountAmount}
                onChange={(e) => updateItem(index, { discountAmount: Number(e.target.value) })}
              />
              <input
                className="rounded-md border p-2"
                type="number"
                value={item.taxAmount}
                onChange={(e) => updateItem(index, { taxAmount: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Notes</h2>

        <div className="grid gap-4">
          <textarea
            className="min-h-28 rounded-md border p-3"
            placeholder="Internal notes"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
          <textarea
            className="min-h-28 rounded-md border p-3"
            placeholder="Terms and notes"
            value={termsAndNotes}
            onChange={(e) => setTermsAndNotes(e.target.value)}
          />
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Totals</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{totals.subtotal.toFixed(2)} {currency}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{totals.discountTotal.toFixed(2)} {currency}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{totals.taxTotal.toFixed(2)} {currency}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{totals.totalAmount.toFixed(2)} {currency}</span></div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Save Draft"}
        </button>
      </div>
    </div>
  );
}