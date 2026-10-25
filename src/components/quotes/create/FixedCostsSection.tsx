"use client";

import { useRef, useState } from "react";
import { findDuplicatePerPersonRow, normalizeServiceLabel } from "@/lib/quotes/perPersonDuplicate";
import type { MealQuantityResult } from "@/lib/quotes/mealQuantityValidation";

import type { EntranceRateSnapshot } from "@/lib/quotes/entranceRateSelection";
import AttractionEntranceLookup from "./AttractionEntranceLookup";
import OtherPerPersonServiceLookup from "./OtherPerPersonServiceLookup";
import type { StandardServiceSnapshot, SupplierServiceSnapshot } from "@/lib/per-person-services/catalogue";

export type FixedCostCategory =
  | "ENTRANCE"
  | "LUNCH"
  | "DINNER"
  | "DRINKS"
  | "BOTTLED_WATER"
  | "FLIGHT"
  | "CRUISE"
  | "TIPS"
  | "PORTERAGE"
  | "HEADSETS"
  | "MASS_CHURCH"
  | "LOCAL_TRANSPORT"
  | "OTHER";

export type FixedCostRow = {
  label: string;
  category: FixedCostCategory;
  quantity: number;
  unitCost: number;
  entranceRateSource?: EntranceRateSnapshot;
  standardRateSource?: StandardServiceSnapshot;
  supplierServiceRateSource?: SupplierServiceSnapshot;
  attractionRateSource?: {
    attractionId: string;
    attractionName: string;
    country: string;
    city: string;
    currency: string;
    admissionFee: number;
    catalogueUpdatedAt: string;
  };
};

type Props = {
  rows: FixedCostRow[];

  currency: string;

  onAddRow: (row?: FixedCostRow) => void;

  onRemoveRow: (index: number) => void;

  onUpdateRow: (
    index: number,
    patch: Partial<FixedCostRow>
  ) => void;

  rowTotal: (row: FixedCostRow) => number;

  sectionTotal: number;

  formatMoney: (
    amount: number,
    currency?: string
  ) => string;

  toNumber: (value: unknown) => number;
  mealQuantityCheck: MealQuantityResult;
  /** From the already calculated quotation group setup; reporting only. */
  totalTravelers?: number;
  startDate?: string;
  endDate?: string;
};

const CATEGORY_OPTIONS: Array<{
  value: FixedCostCategory;
  label: string;
}> = [
  {
    value: "ENTRANCE",
    label: "Entrance / Admission",
  },
  {
    value: "LUNCH",
    label: "Lunch",
  },
  {
    value: "DINNER",
    label: "Dinner",
  },
  {
    value: "DRINKS",
    label: "Drinks / Beverages",
  },
  {
    value: "BOTTLED_WATER",
    label: "Bottled Water",
  },
  {
    value: "FLIGHT",
    label: "Flight / Passenger Ticket",
  },
  {
    value: "CRUISE",
    label: "Boat / Ferry Passenger Ticket",
  },
  {
    value: "TIPS",
    label: "Tips / Gratuities",
  },
  {
    value: "PORTERAGE",
    label: "Porterage",
  },
  {
    value: "HEADSETS",
    label: "Headsets / Audio System",
  },
  {
    value: "MASS_CHURCH",
    label: "Mass / Church Donation",
  },
  {
    value: "LOCAL_TRANSPORT",
    label: "Local Passenger Ticket",
  },
  {
    value: "OTHER",
    label: "Other Per-Person Cost",
  },
];

const ROW_BACKGROUNDS = [
  "bg-amber-50/70",
  "bg-emerald-50/60",
  "bg-white",
  "bg-blue-50/60",
];

const ROW_NUMBER_BACKGROUNDS = [
  "bg-amber-100 text-amber-900",
  "bg-emerald-100 text-emerald-900",
  "bg-slate-100 text-slate-700",
  "bg-blue-100 text-blue-900",
];

function getCategoryLabel(
  category: FixedCostCategory
) {
  return (
    CATEGORY_OPTIONS.find(
      (option) => option.value === category
    )?.label ?? category
  );
}

export default function FixedCostsSection({
  rows,
  currency,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  rowTotal,
  sectionTotal,
  formatMoney,
  toNumber,
  mealQuantityCheck,
  totalTravelers = 0,
}: Props) {
  type DuplicateRequest =
    | { kind: "add"; row: FixedCostRow; match: string }
    | { kind: "edit"; index: number; patch: Partial<FixedCostRow>; match: string; applied?: boolean; restoreLabel?: string };
  const [pendingDuplicate, setPendingDuplicate] = useState<DuplicateRequest | null>(null);
  type AddSource = "ATTRACTIONS" | "STANDARD" | "SUPPLIER" | "MANUAL";
  const [addSource, setAddSource] = useState<AddSource>("STANDARD");
  const [manualLabel, setManualLabel] = useState("");
  const [manualCategory, setManualCategory] = useState<FixedCostCategory>("OTHER");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQuantity, setManualQuantity] = useState("1");
  const [notice, setNotice] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const labelBeforeEdit = useRef<Record<number, string>>({});

  function commitSelectedRow(row: FixedCostRow) {
    const emptyRow = rows.findIndex(existing =>
      !existing.label.trim() && existing.unitCost === 0 && !existing.entranceRateSource &&
      !existing.attractionRateSource && !existing.standardRateSource && !existing.supplierServiceRateSource,
    );
    if (emptyRow >= 0) onUpdateRow(emptyRow, row);
    else onAddRow(row);
    setNotice({ type: "success", text: `${row.label} added to the quotation. Save the quotation to keep this change.` });
  }

  // Shared by Attractions, Standard Prices, Supplier CRM, and manual lookup.
  function addSelectedEntrance(row: FixedCostRow) {
    setNotice(null);
    const matchIndex = findDuplicatePerPersonRow(rows, row);
    if (matchIndex !== -1) {
      setPendingDuplicate({ kind: "add", row, match: rows[matchIndex].label });
      return;
    }
    commitSelectedRow(row);
  }

  function addManualPerPersonCost() {
    const label = manualLabel.trim();
    const raw = manualPrice.trim();
    const quantity = Number(manualQuantity);
    if (!label || !/^\d+(\.\d{1,2})?$/.test(raw) ||
      !Number.isInteger(quantity) || quantity < 1) return;
    const selected: FixedCostRow = {
      label,
      category: manualCategory,
      quantity: manualCategory === "ENTRANCE" ? 1 : quantity,
      unitCost: Number(raw),
    };
    const duplicate = findDuplicatePerPersonRow(rows, selected) !== -1;
    addSelectedEntrance(selected);
    if (!duplicate) {
      setManualLabel("");
      setManualPrice("");
      setManualQuantity("1");
    }
  }

  // Manual row editing should also warn when it creates a duplicate.
  function checkEditedLabel(index: number) {
    const row = rows[index];
    if (!row || !normalizeServiceLabel(row.label)) return;
    const original = labelBeforeEdit.current[index] ?? row.label;
    if (normalizeServiceLabel(original) === normalizeServiceLabel(row.label)) return;
    const matchIndex = findDuplicatePerPersonRow(rows, row, index);
    if (matchIndex !== -1) {
      setPendingDuplicate({ kind: "edit", index, patch: {}, match: rows[matchIndex].label,
        applied: true, restoreLabel: original });
    }
  }

  function updateCategoryWithDuplicateCheck(index: number, category: FixedCostCategory) {
    const previous = rows[index];
    if (!previous) return;
    const patch: Partial<FixedCostRow> = {
      category,
      ...(category !== "ENTRANCE" ? { entranceRateSource: undefined, attractionRateSource: undefined } : {}),
      ...(category !== previous.category ? { standardRateSource: undefined, supplierServiceRateSource: undefined } : {}),
    };
    const matchIndex = findDuplicatePerPersonRow(rows, { ...previous, ...patch }, index);
    if (matchIndex !== -1) {
      setPendingDuplicate({ kind: "edit", index, patch, match: rows[matchIndex].label });
    } else {
      onUpdateRow(index, patch);
    }
  }

  function resolveDuplicate(allow: boolean) {
    if (!pendingDuplicate) return;
    const pending = pendingDuplicate;
    setPendingDuplicate(null);
    if (pending.kind === "add") {
      if (allow) {
        commitSelectedRow(pending.row);
      } else {
        setNotice({ type: "info", text: `No duplicate of ${pending.row.label} was added.` });
      }
      return;
    }
    if (allow) {
      if (!pending.applied) onUpdateRow(pending.index, pending.patch);
      setNotice({ type: "info", text: `Repeated service confirmed. Check the quantity to avoid double charging.` });
    } else {
      if (pending.applied) onUpdateRow(pending.index, { label: pending.restoreLabel ?? "" });
      setNotice({ type: "info", text: "Duplicate entry cancelled." });
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Pilgrimage Costing
            </div>

            <h2 className="mt-1 text-lg font-semibold">
              Per-Person Service Costs
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-200">
              Select attractions or other services from a catalogue,
              use an actual Supplier CRM rate, or enter a cost manually.
            </p>
          </div>

          <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-blue-100">
              Cost Per Traveler
            </div>

            <div className="mt-1 text-xl font-semibold">
              {formatMoney(sectionTotal, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* One concise explanation; individual choices and meal limits remain visible below. */}
      <div className="border-b bg-blue-50 px-5 py-3">
        <p className="text-xs leading-5 text-slate-700">
          Enter one service at a time. Its cost is per traveler, per selected meal, day or ticket.
          Applicable complimentary-traveler costs are allocated by the existing quotation calculator.
        </p>
      </div>

      {/* Quantity rules are read-only; no automatic price or row mutation. */}
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4" aria-label="Lunch and dinner quantity validation">
        <h3 className="text-sm font-semibold text-[#001F3F]">Lunch & Dinner Quantity Check</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Meal limits use actual core hotel nights only: dinners up to the total nights, and lunches up to one fewer night.
          Dates cross-check the number of hotel nights but do not set meal quantities. Hotel and restaurant dinners share one limit; included HB dinners do not reduce it.
        </p>
        {mealQuantityCheck.lunchBasis === "UNAVAILABLE" ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
            Meal limits are not set yet. Add actual core hotel stays and nights to calculate the lunch and dinner allowances. Travel dates alone do not set meal limits.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="font-semibold text-slate-800">
                Lunches: {mealQuantityCheck.eligibleLunchDays === null
                  ? `${mealQuantityCheck.lunchCount} / set itinerary`
                  : mealQuantityCheck.eligibleLunchDays === 0
                    ? `${mealQuantityCheck.lunchCount} selected - no eligible lunch days`
                    : `${mealQuantityCheck.lunchCount} / ${mealQuantityCheck.eligibleLunchDays}`}
              </div>
              <p className="mt-1 text-xs text-slate-500">Maximum lunches = core hotel nights minus one (arrival and departure excluded). Travel dates only check the hotel-night count.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="font-semibold text-slate-800">
                Paid dinners: {mealQuantityCheck.purchasedDinnerCount} / {mealQuantityCheck.dinnerLimit ?? "set itinerary"}
              </div>
              <p className="mt-1 text-xs text-slate-500">{mealQuantityCheck.restaurantDinnerCount} restaurant / other + {mealQuantityCheck.hotelDinnerCount} contracted hotel. {mealQuantityCheck.includedHbDinners} HB dinner(s) already included in room rates.</p>
            </div>
          </div>
        )}
        {mealQuantityCheck.errors.length > 0 && (
          <div role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-semibold">Meal quantities or hotel-night dates need correction before approval</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {mealQuantityCheck.errors.map((message, i) => <li key={i}>{message}</li>)}
            </ul>
            <p className="mt-2 text-xs">You may save a draft while correcting these quantities. No costs have been changed automatically.</p>
          </div>
        )}
        {mealQuantityCheck.warnings.length > 0 && (
          <div role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Review meal dates and included services</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {mealQuantityCheck.warnings.map((message, i) => <li key={i}>{message}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* ONE source selector for all per-person additions. Each choice feeds the
          existing row table and duplicate-check path; it is not a new costing engine. */}
      <section className="border-b border-slate-200 bg-white px-5 py-5" aria-label="Add a per-person cost">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-[#001F3F]">Add a Per-Person Cost</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Choose one price source, select the service and add it below. All services appear in the same cost table.
            Use the quantity in that table for additional meals, days or tickets.
          </p>
        </div>
        <div role="tablist" aria-label="Per-person cost source" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["ATTRACTIONS", "Attractions"],
            ["STANDARD", "Epoch standards"],
            ["SUPPLIER", "Supplier CRM"],
            ["MANUAL", "Manual cost"],
          ] as Array<[AddSource, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={addSource === value}
              onClick={() => setAddSource(value)}
              className={`rounded-lg border px-3 py-3 text-xs font-semibold transition ${addSource === value
                ? "border-[#001F3F] bg-[#001F3F] text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {addSource === "ATTRACTIONS" && (
            <AttractionEntranceLookup
              currency={currency}
              onSelect={addSelectedEntrance}
              formatMoney={formatMoney}
              embedded
              hideManual
            />
          )}
          {(addSource === "STANDARD" || addSource === "SUPPLIER") && (
            <OtherPerPersonServiceLookup
              key={addSource}
              currency={currency}
              totalTravelers={totalTravelers}
              onSelect={addSelectedEntrance}
              formatMoney={formatMoney}
              fixedSource={addSource}
              embedded
              hideManual
            />
          )}
          {addSource === "MANUAL" && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-[#001F3F]">Enter a verified per-person cost</h4>
              <p className="mt-1 text-xs text-slate-600">Use this when an attraction, standard rate or genuine supplier rate is unavailable. The amount applies per traveler per selected unit.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <label className="block text-xs font-semibold text-slate-700">Service name
                  <input value={manualLabel} onChange={event => setManualLabel(event.target.value)} placeholder="e.g. Restaurant lunch" className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Category
                  <select value={manualCategory} onChange={event => setManualCategory(event.target.value as FixedCostCategory)} className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm">
                    {CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">{manualCategory === "LUNCH" || manualCategory === "DINNER" ? "Meals" : manualCategory === "ENTRANCE" ? "Admissions" : "Days / Units"}
                  <input type="number" min="1" step="1" disabled={manualCategory === "ENTRANCE"} value={manualCategory === "ENTRANCE" ? "1" : manualQuantity} onChange={event => setManualQuantity(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm disabled:bg-slate-100" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Unit cost ({currency})
                  <input type="number" min="0" step="0.01" value={manualPrice} onChange={event => setManualPrice(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" />
                </label>
              </div>
              <button type="button" onClick={addManualPerPersonCost}
                disabled={!manualLabel.trim() || !/^\d+(\.\d{1,2})?$/.test(manualPrice.trim()) || (manualCategory !== "ENTRANCE" && (!Number.isInteger(Number(manualQuantity)) || Number(manualQuantity) < 1))}
                className="mt-4 rounded-md bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                Add manual cost
              </button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">Fixed-price buses, private boat charters and group-only fees belong in Group Operations. Hotel-contracted extras belong in the Hotel Module.</p>
      </section>

      {/* Explicit duplicate confirmation; the original row stays untouched until confirmed. */}
      {pendingDuplicate && (
        <div role="alertdialog" aria-labelledby="duplicate-service-title" aria-describedby="duplicate-service-description"
          className="mx-5 my-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
          <h3 id="duplicate-service-title" className="font-bold">This service is already included</h3>
          <p id="duplicate-service-description" className="mt-1">
            You already added <strong>{pendingDuplicate.match}</strong>. Do you want to add it again?
            For repeated lunches, dinners or daily services, you can usually adjust Days / Units on the existing row instead.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => resolveDuplicate(false)}
              className="rounded-md border border-amber-400 bg-white px-4 py-2 font-semibold">No, keep one</button>
            <button type="button" onClick={() => resolveDuplicate(true)}
              className="rounded-md bg-[#001F3F] px-4 py-2 font-semibold text-white">Yes, add again</button>
          </div>
        </div>
      )}
      {notice && !pendingDuplicate && (
        <div role="status" aria-live="polite" className={`mx-5 my-3 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice" className="font-semibold underline">Dismiss</button>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-245 text-sm">
          <thead className="bg-slate-100">
            <tr className="border-b">
              <th className="w-20 px-4 py-3 text-left font-semibold text-slate-700">
                Row
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Service
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Category
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Days / Units
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Unit Cost
              </th>

              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Cost / Traveler
              </th>

              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center"
                >
                  <div className="text-sm font-medium text-slate-700">
                    No per-person costs added yet.
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Choose Attractions, Epoch standards, Supplier CRM or Manual cost in the single selector above.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const colorIndex =
                  index % ROW_BACKGROUNDS.length;

                const rowBackground =
                  ROW_BACKGROUNDS[colorIndex];

                const numberBackground =
                  ROW_NUMBER_BACKGROUNDS[colorIndex];

                return (
                  <tr
                    key={index}
                    className={`border-b transition last:border-b-0 ${rowBackground}`}
                  >
                    {/* ROW NUMBER */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex min-w-10 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${numberBackground}`}
                      >
                        {index + 1}
                      </span>
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-md border border-slate-300 bg-white p-2 outline-none transition focus:border-[#001F3F]"
                        value={row.label}
                        onFocus={() => { labelBeforeEdit.current[index] = row.label; }}
                        onBlur={() => checkEditedLabel(index)}
                        onChange={(e) =>
                          onUpdateRow(index, {
                            label: e.target.value,
                          })
                        }
                        placeholder="e.g. Ephesus entrance"
                      />
                      {row.standardRateSource && (
                        <p className="mt-1 max-w-64 text-[11px] text-slate-500">
                          Epoch standard: {row.standardRateSource.serviceName} ({row.standardRateSource.unit})
                          {row.unitCost !== row.standardRateSource.price && <span className="block font-semibold text-amber-800">This quote uses a manual price override.</span>}
                        </p>
                      )}
                      {row.supplierServiceRateSource && (
                        <p className="mt-1 max-w-64 text-[11px] text-slate-500">
                          Supplier CRM: {row.supplierServiceRateSource.supplierName} / {row.supplierServiceRateSource.supplierRateName} ({row.supplierServiceRateSource.supplierRateUnit})
                          {row.unitCost !== row.supplierServiceRateSource.price && <span className="block font-semibold text-amber-800">This quote uses a manual price override.</span>}
                        </p>
                      )}
                      {row.category === "ENTRANCE" && row.attractionRateSource && (
                        <p className="mt-1 max-w-64 text-[11px] leading-4 text-slate-600">
                          Catalogue: {row.attractionRateSource.attractionName} · {row.attractionRateSource.currency} {row.attractionRateSource.admissionFee.toFixed(2)}
                          {row.unitCost !== row.attractionRateSource.admissionFee && (
                            <span className="block font-semibold text-amber-800">Manually adjusted from catalogue rate.</span>
                          )}
                        </p>
                      )}
                      {row.category === "ENTRANCE" && row.entranceRateSource && (
                        <p className="mt-1 max-w-64 text-[11px] leading-4 text-slate-600">
                          Supplier: {row.entranceRateSource.supplierName} · {row.entranceRateSource.supplierRateName}
                          {row.entranceRateSource.visitDate && (
                            <span className="block">Visit {row.entranceRateSource.visitDate}</span>
                          )}
                          {row.unitCost !== row.entranceRateSource.supplierRateAmount && (
                            <span className="block font-semibold text-amber-800">Manually adjusted from supplier price {formatMoney(row.entranceRateSource.supplierRateAmount, row.entranceRateSource.supplierRateCurrency)}</span>
                          )}
                        </p>
                      )}
                    </td>

                    {/* CATEGORY */}
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-md border border-slate-300 bg-white p-2 outline-none transition focus:border-[#001F3F]"
                        value={row.category}
                        onChange={(e) => updateCategoryWithDuplicateCheck(index, e.target.value as FixedCostCategory)}
                      >
                        {CATEGORY_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    {/* QTY */}
                    {/* Entrance fees are one admission per attraction, not one per passenger. */}
                    <td className="w-28 px-4 py-3">
                      {row.quantity === 1 && (row.category === "ENTRANCE" || row.standardRateSource?.unit === "PER_PERSON" || row.supplierServiceRateSource?.supplierRateUnit === "PER_PERSON") ? (
                        <span className="text-xs text-slate-500">{row.category === "ENTRANCE" ? "1 admission" : "1 per traveler"}</span>
                      ) : (
                        <label className="block text-xs text-slate-500">
                          {row.standardRateSource?.unit === "PER_DAY" || row.supplierServiceRateSource?.supplierRateUnit === "PER_DAY" ? "Days"
                            : row.standardRateSource?.unit === "PER_MEAL" || row.supplierServiceRateSource?.supplierRateUnit === "PER_MEAL" ? "Meals"
                            : "Units"}
                          <input
                            aria-label={`Units for ${row.label || "service"}`}
                            type="number" min="0" step="1"
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-right"
                            value={row.quantity}
                            onChange={e => onUpdateRow(index, { quantity: row.category === "LUNCH" || row.category === "DINNER" ? Math.max(0, Math.floor(toNumber(e.target.value))) : toNumber(e.target.value) })}
                          />
                        </label>
                      )}
                    </td>

                    {/* UNIT COST */}
                    <td className="w-40 px-4 py-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {currency}
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border border-slate-300 bg-white py-2 pl-12 pr-2 text-right outline-none transition focus:border-[#001F3F]"
                          value={row.unitCost}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              unitCost: toNumber(
                                e.target.value
                              ),
                            })
                          }
                        />
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-[#001F3F]">
                        {formatMoney(
                          rowTotal(row),
                          currency
                        )}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-500">
                        {getCategoryLabel(
                          row.category
                        )}
                      </div>
                    </td>

                    {/* REMOVE */}
                    <td className="w-24 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveRow(index)
                        }
                        className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Manual costs now use the Manual cost tab above. No second add pathway. */}

      {/* READ-ONLY SECTION TOTALS; do not change the quotation pricing engine. */}
      <div className="border-t bg-slate-50 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">Total per person</div>
            <div className="mt-1 text-xl font-bold text-[#001F3F]">{formatMoney(sectionTotal, currency)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">Group service cost {totalTravelers > 0 ? `(${totalTravelers} travelers)` : ""}</div>
            <div className="mt-1 text-xl font-bold text-[#001F3F]">{totalTravelers > 0 ? formatMoney(sectionTotal * totalTravelers, currency) : "Enter group size"}</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-600">Lunch limit = core hotel nights minus one; dinner limit = core hotel nights. Tour dates cross-check the number of hotel nights only. Hotel dinners are counted together with separately purchased dinners. Group-priced boat charters, buses and transfers belong in Group Operations.</p>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">Informational estimate assuming every traveler uses every listed service. Actual complimentary-person exemptions and group pricing are handled separately by the existing quote calculator. No costs are added a second time.</p>
      </div>
    </section>
  );
}
