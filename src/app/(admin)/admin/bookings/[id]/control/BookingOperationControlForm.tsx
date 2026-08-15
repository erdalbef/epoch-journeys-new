"use client";

import { useMemo, useState } from "react";

type OperationItem = {
  id: string;
  name: string;
  location: string;
  date: string;
  contactName: string;
  contactInfo: string;
  notes: string;
  confirmed: boolean;
};

type RawItem = Partial<OperationItem> | null;

type InitialData = {
  hotelItems: unknown;
  transportItems: unknown;
  guideItems: unknown;
  restaurantItems: unknown;
  massItems: unknown;
  ticketItems: unknown;
  paymentItems: unknown;
  documentItems: unknown;
  emergencyItems: unknown;
  finalNotes: string | null;
} | null;

type Props = {
  bookingId: string;
  initialData: InitialData;
};

type SectionKey =
  | "hotelItems"
  | "transportItems"
  | "guideItems"
  | "restaurantItems"
  | "massItems"
  | "ticketItems"
  | "paymentItems"
  | "documentItems"
  | "emergencyItems";

type FormState = Record<SectionKey, OperationItem[]> & {
  finalNotes: string;
};

const sectionLabels: { key: SectionKey; title: string }[] = [
  { key: "hotelItems", title: "Hotels" },
  { key: "transportItems", title: "Transportation" },
  { key: "guideItems", title: "Guides / Tour Managers" },
  { key: "restaurantItems", title: "Restaurants / Meals" },
  { key: "massItems", title: "Churches / Mass Arrangements" },
  { key: "ticketItems", title: "Tickets / Visits" },
  { key: "paymentItems", title: "Supplier Payments" },
  { key: "documentItems", title: "Documents" },
  { key: "emergencyItems", title: "Emergency Contacts" },
];

function createEmptyItem(): OperationItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    location: "",
    date: "",
    contactName: "",
    contactInfo: "",
    notes: "",
    confirmed: false,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseItems(value: unknown): OperationItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isObject)
    .map((item) => {
      const raw = item as RawItem;

      return {
        id:
          typeof raw?.id === "string"
            ? raw.id
            : crypto.randomUUID(),
        name: typeof raw?.name === "string" ? raw.name : "",
        location:
          typeof raw?.location === "string" ? raw.location : "",
        date: typeof raw?.date === "string" ? raw.date : "",
        contactName:
          typeof raw?.contactName === "string"
            ? raw.contactName
            : "",
        contactInfo:
          typeof raw?.contactInfo === "string"
            ? raw.contactInfo
            : "",
        notes: typeof raw?.notes === "string" ? raw.notes : "",
        confirmed: Boolean(raw?.confirmed),
      };
    });
}

function getStatusBadge(completed: number, total: number) {
  if (total === 0 || completed === 0) {
    return {
      label: "PENDING",
      className: "bg-red-100 text-red-800",
    };
  }

  if (completed === total) {
    return {
      label: "READY",
      className: "bg-green-100 text-green-800",
    };
  }

  return {
    label: "IN_PROGRESS",
    className: "bg-yellow-100 text-yellow-800",
  };
}

export default function BookingOperationControlForm({
  bookingId,
  initialData,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    hotelItems: parseItems(initialData?.hotelItems),
    transportItems: parseItems(initialData?.transportItems),
    guideItems: parseItems(initialData?.guideItems),
    restaurantItems: parseItems(initialData?.restaurantItems),
    massItems: parseItems(initialData?.massItems),
    ticketItems: parseItems(initialData?.ticketItems),
    paymentItems: parseItems(initialData?.paymentItems),
    documentItems: parseItems(initialData?.documentItems),
    emergencyItems: parseItems(initialData?.emergencyItems),
    finalNotes: initialData?.finalNotes ?? "",
  });

  const summary = useMemo(() => {
    const allItems = sectionLabels.flatMap((s) => form[s.key]);
    const total = allItems.length;
    const completed = allItems.filter((i) => i.confirmed).length;

    const percentage =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    const missingItems = allItems
      .filter((i) => !i.confirmed && i.name.trim())
      .map((i) => i.name.trim());

    return { total, completed, percentage, missingItems, badge: getStatusBadge(completed, total) };
  }, [form]);

  function addRow(section: SectionKey) {
    setForm((prev) => ({
      ...prev,
      [section]: [...prev[section], createEmptyItem()],
    }));
  }

  function updateItem(
    section: SectionKey,
    id: string,
    field: keyof OperationItem,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [section]: prev[section].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function removeRow(section: SectionKey, id: string) {
    setForm((prev) => ({
      ...prev,
      [section]: prev[section].filter((i) => i.id !== id),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch(`/api/admin/bookings/${bookingId}/control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);
    alert("Saved");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <p>
          {summary.completed} / {summary.total} ({summary.percentage}%)
        </p>

        {summary.missingItems.length > 0 && (
          <ul className="mt-2 text-sm text-red-600">
            {summary.missingItems.map((m, i) => (
              <li key={i}>• {m}</li>
            ))}
          </ul>
        )}
      </div>

      {sectionLabels.map((section) => (
        <div key={section.key} className="rounded-xl border p-5">
          <div className="flex justify-between">
            <h3>{section.title}</h3>

            <button
              type="button"
              onClick={() => addRow(section.key)}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Add
            </button>
          </div>

          <div className="space-y-3 mt-4">
            {form[section.key].map((item) => (
              <div key={item.id} className="border p-3 rounded">
                <input
                  placeholder="Name"
                  value={item.name}
                  onChange={(e) =>
                    updateItem(section.key, item.id, "name", e.target.value)
                  }
                />

                <input
                  type="checkbox"
                  checked={item.confirmed}
                  disabled={!item.name.trim()}
                  onChange={(e) =>
                    updateItem(section.key, item.id, "confirmed", e.target.checked)
                  }
                />

                <button
                  type="button"
                  onClick={() => removeRow(section.key, item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 text-white px-5 py-2 rounded"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}