"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type TemplateItemType =
  | "SERVICE"
  | "ACCOMMODATION"
  | "TRANSPORT"
  | "GUIDE"
  | "ACTIVITY"
  | "FLIGHT"
  | "FEE"
  | "DISCOUNT"
  | "CUSTOM";

type TemplateItem = {
  id: string;
  itemType: TemplateItemType;
  title: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxRate: string;
  optional: boolean;
  sortOrder: number;
};

type NormalizedTemplateItem = {
  id: string;
  itemType: TemplateItemType;
  title: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number | null;
  taxAmount: number;
  total: number;
  currency: string;
  optional: boolean;
  sortOrder: number;
};

function createEmptyItem(index: number): TemplateItem {
  return {
    id: `new-${Date.now()}-${index}`,
    itemType: "SERVICE",
    title: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
    discountAmount: "0",
    taxRate: "",
    optional: false,
    sortOrder: index,
  };
}

function safeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTaxRate(value: string): number | null {
  if (value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function CreateQuoteTemplatePage() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [isActive, setIsActive] = useState(true);

  const [items, setItems] = useState<TemplateItem[]>([createEmptyItem(0)]);

  const totals = useMemo(() => {
    const normalized: NormalizedTemplateItem[] = items.map(
      (item: TemplateItem, index: number) => {
        const quantity = safeNumber(item.quantity);
        const unitPrice = safeNumber(item.unitPrice);
        const discountAmount = safeNumber(item.discountAmount);
        const taxRate = parseTaxRate(item.taxRate);

        const base = quantity * unitPrice;
        const taxable = Math.max(base - discountAmount, 0);
        const taxAmount = taxRate != null ? (taxable * taxRate) / 100 : 0;
        const total = taxable + taxAmount;

        return {
          id: item.id,
          itemType: item.itemType,
          title: item.title.trim(),
          description: item.description.trim() || null,
          quantity,
          unitPrice,
          discountAmount,
          taxRate,
          taxAmount,
          total,
          currency,
          optional: item.optional,
          sortOrder: index,
        };
      }
    );

    const summary = normalized.reduce(
      (
        acc: { subtotal: number; discount: number; tax: number },
        item: NormalizedTemplateItem
      ) => {
        const base = item.quantity * item.unitPrice;

        return {
          subtotal: acc.subtotal + base,
          discount: acc.discount + item.discountAmount,
          tax: acc.tax + item.taxAmount,
        };
      },
      {
        subtotal: 0,
        discount: 0,
        tax: 0,
      }
    );

    return {
      normalized,
      subtotal: summary.subtotal,
      discount: summary.discount,
      tax: summary.tax,
      total: summary.subtotal - summary.discount + summary.tax,
    };
  }, [items, currency]);

  const updateItem = <K extends keyof TemplateItem>(
    id: string,
    field: K,
    value: TemplateItem[K]
  ) => {
    setItems((prev: TemplateItem[]) =>
      prev.map((item: TemplateItem) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems((prev: TemplateItem[]) => [...prev, createEmptyItem(prev.length)]);
  };

  const removeItem = (id: string) => {
    setItems((prev: TemplateItem[]) =>
      prev.filter((item: TemplateItem) => item.id !== id)
    );
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Template title is required.");
      return;
    }

    if (items.length === 0) {
      toast.error("Add at least one template item.");
      return;
    }

    const invalidItem = totals.normalized.find(
      (item: NormalizedTemplateItem) => !item.title
    );

    if (invalidItem) {
      toast.error("Every template item must have a title.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        currency: currency.trim().toUpperCase() || "EUR",
        isActive,
        subtotal: totals.subtotal,
        discountTotal: totals.discount,
        taxTotal: totals.tax,
        totalAmount: totals.total,
        items: totals.normalized,
      };

      // Replace this block later with your real API call
      // const res = await fetch("/api/quote-templates", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      //
      // const json = await res.json();
      //
      // if (!res.ok) {
      //   throw new Error(json.message || "Failed to create template.");
      // }

      console.log("CREATE TEMPLATE PAYLOAD", payload);

      toast.success("Template page is ready. Backend save is next.");
      router.push("/admin/quotes/templates");
    } catch (error) {
      console.error("Create template failed", error);
      toast.error("Failed to create template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <Link
          href="/admin/quotes/templates"
          className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          ← Back to Templates
        </Link>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Create Quote Template</h1>
            <p className="text-sm text-muted-foreground">
              Build a reusable pricing structure for future quotes.
            </p>
          </div>

          <button
            type="submit"
            form="create-template-form"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>

      <form
        id="create-template-form"
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"
      >
        <section className="space-y-6">
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Template Details</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Template Title
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Greece Pilgrimage Template"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short explanation of what this template is used for"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="currency" className="text-sm font-medium">
                  Currency
                </label>
                <input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="EUR"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Active template
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Template Items</h2>
                <p className="text-sm text-muted-foreground">
                  Add reusable quote lines such as hotel, guide, transport,
                  meals, fees, or flights.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No template items yet.
                </div>
              ) : (
                items.map((item: TemplateItem) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                      <div className="space-y-2 xl:col-span-2">
                        <label className="text-sm font-medium">Title</label>
                        <input
                          value={item.title}
                          onChange={(e) =>
                            updateItem(item.id, "title", e.target.value)
                          }
                          placeholder="Hotel package"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                          value={item.itemType}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "itemType",
                              e.target.value as TemplateItemType
                            )
                          }
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <option value="SERVICE">SERVICE</option>
                          <option value="ACCOMMODATION">ACCOMMODATION</option>
                          <option value="TRANSPORT">TRANSPORT</option>
                          <option value="GUIDE">GUIDE</option>
                          <option value="ACTIVITY">ACTIVITY</option>
                          <option value="FLIGHT">FLIGHT</option>
                          <option value="FEE">FEE</option>
                          <option value="DISCOUNT">DISCOUNT</option>
                          <option value="CUSTOM">CUSTOM</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", e.target.value)
                          }
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, "unitPrice", e.target.value)
                          }
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Discount</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discountAmount}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "discountAmount",
                              e.target.value
                            )
                          }
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tax %</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.taxRate}
                          onChange={(e) =>
                            updateItem(item.id, "taxRate", e.target.value)
                          }
                          placeholder="0"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="space-y-2 xl:col-span-5">
                        <label className="text-sm font-medium">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, "description", e.target.value)
                          }
                          placeholder="Describe what this reusable line item includes"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="flex items-end justify-between gap-3 xl:flex-col xl:items-start xl:justify-end">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={item.optional}
                            onChange={(e) =>
                              updateItem(item.id, "optional", e.target.checked)
                            }
                            className="h-4 w-4"
                          />
                          Optional
                        </label>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-muted-foreground">
                      Line total:{" "}
                      <span className="font-medium text-foreground">
                        {formatMoney(
                          (() => {
                            const quantity = safeNumber(item.quantity);
                            const unitPrice = safeNumber(item.unitPrice);
                            const discountAmount = safeNumber(
                              item.discountAmount
                            );
                            const taxRate = parseTaxRate(item.taxRate);

                            const base = quantity * unitPrice;
                            const taxable = Math.max(base - discountAmount, 0);
                            const tax =
                              taxRate != null ? (taxable * taxRate) / 100 : 0;

                            return taxable + tax;
                          })(),
                          currency
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium">{currency || "EUR"}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{items.length}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Calculated Totals</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatMoney(totals.subtotal, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium">
                  {formatMoney(totals.discount, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">
                  {formatMoney(totals.tax, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-t pt-3 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">
                  {formatMoney(totals.total, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Next Step</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              This page is now ready. The next step is connecting it to Prisma
              and creating the POST API route to save templates to the database.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}