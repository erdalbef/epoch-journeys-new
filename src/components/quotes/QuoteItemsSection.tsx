"use client";

import { Plus, Trash2 } from "lucide-react";

export type QuoteItemType =
  | "HOTEL"
  | "TRANSPORT"
  | "GUIDE"
  | "ENTRANCE"
  | "MEAL"
  | "FLIGHT"
  | "SERVICE"
  | "CUSTOM";

export type QuoteItemFormValue = {
  id: string;
  title: string;
  description: string;
  itemType: QuoteItemType;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  optional: boolean;
};

type Props = {
  items: QuoteItemFormValue[];
  onChange: (items: QuoteItemFormValue[]) => void;
};

function createEmptyItem(): QuoteItemFormValue {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    itemType: "CUSTOM",
    quantity: 1,
    unitPrice: 0,
    discountAmount: 0,
    taxRate: 0,
    optional: false,
  };
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateLineTotal(item: QuoteItemFormValue) {
  const subtotal = item.quantity * item.unitPrice;
  const afterDiscount = subtotal - item.discountAmount;
  const safeBase = afterDiscount < 0 ? 0 : afterDiscount;
  const taxAmount = safeBase * (item.taxRate / 100);

  return safeBase + taxAmount;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function QuoteItemsSection({ items, onChange }: Props) {
  const updateItem = <K extends keyof QuoteItemFormValue>(
    id: string,
    key: K,
    value: QuoteItemFormValue[K]
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    );
  };

  const addItem = () => {
    onChange([...items, createEmptyItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    onChange(items.filter((item) => item.id !== id));
  };

  const grandTotal = items.reduce(
    (sum, item) => sum + calculateLineTotal(item),
    0
  );

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quote Items</h2>
          <p className="text-sm text-slate-500">
            Add each pricing component clearly, such as hotel, transport, guide,
            entrances, meals, flights, or custom services.
          </p>
        </div>

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const lineTotal = calculateLineTotal(item);

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Item {index + 1}
                  </p>
                  <p className="text-xs text-slate-500">
                    This line will appear in the quote and PDF.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item Name</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      updateItem(item.id, "title", e.target.value)
                    }
                    placeholder="Example: Hotel Accommodation"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Item Type</label>
                  <select
                    value={item.itemType}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "itemType",
                        e.target.value as QuoteItemType
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="HOTEL">Hotel</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="GUIDE">Guide</option>
                    <option value="ENTRANCE">Entrance</option>
                    <option value="MEAL">Meal</option>
                    <option value="FLIGHT">Flight</option>
                    <option value="SERVICE">Service</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    placeholder="Example: 4 nights in 4-star hotels, double occupancy"
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", toNumber(e.target.value))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, "unitPrice", toNumber(e.target.value))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discountAmount}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "discountAmount",
                        toNumber(e.target.value)
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Rate %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.taxRate}
                    onChange={(e) =>
                      updateItem(item.id, "taxRate", toNumber(e.target.value))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.optional}
                      onChange={(e) =>
                        updateItem(item.id, "optional", e.target.checked)
                      }
                    />
                    Optional Item
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Line Total</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(lineTotal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm rounded-2xl border bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Quote Items Total</span>
            <span className="text-lg font-semibold text-slate-900">
              {formatMoney(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export { createEmptyItem };