"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

type SeasonValue = "LOW" | "SHOULDER" | "HIGH" | "PEAK";

type PriceBandForm = {
  id?: string;
  minPayingPax: string;
  maxPayingPax: string;
  doubleTwinPrice: string;
  notes: string;
};

type SeasonForm = {
  id?: string;
  season: SeasonValue;
  months: number[];
  seasonNote: string;
  singleSupplement: string;
  tripleReduction: string;
  isOnRequest: boolean;
  notes: string;
  priceBands: PriceBandForm[];
};

type PlanForm = {
  id?: string;
  year: string;
  currency: string;
  title: string;
  description: string;
  isActive: boolean;
  minPayingPax: string;
  maxPayingPax: string;
  focEnabled: boolean;
  focPayingPaxRatio: string;
  focNotes: string;
  packageIncludes: string;
  packageExcludes: string;
  pricingNotes: string;
  seasons: SeasonForm[];
};

type InitialPlan = {
  id: string;
  year: number;
  currency: string;
  title: string | null;
  description: string | null;
  isActive: boolean;
  minPayingPax: number | null;
  maxPayingPax: number | null;
  focEnabled: boolean;
  focPayingPaxRatio: number;
  focNotes: string | null;
  packageIncludes: string[];
  packageExcludes: string[];
  pricingNotes: string | null;
  seasons: {
    id: string;
    season: SeasonValue;
    months: number[];
    seasonNote: string | null;
    singleSupplement: number | null;
    tripleReduction: number | null;
    isOnRequest: boolean;
    notes: string | null;
    sortOrder: number;
    priceBands: {
      id: string;
      minPayingPax: number;
      maxPayingPax: number | null;
      doubleTwinPrice: number;
      isActive: boolean;
      sortOrder: number;
      notes: string | null;
    }[];
  }[];
};

type Props = {
  tourId: string;
  defaultCurrency: string;
  defaultIncludes: string[];
  defaultExcludes: string[];
  initialPlans: InitialPlan[];
};

const MONTHS = [
  ["Jan", 1],
  ["Feb", 2],
  ["Mar", 3],
  ["Apr", 4],
  ["May", 5],
  ["Jun", 6],
  ["Jul", 7],
  ["Aug", 8],
  ["Sep", 9],
  ["Oct", 10],
  ["Nov", 11],
  ["Dec", 12],
] as const;

function emptyBand(): PriceBandForm {
  return {
    minPayingPax: "",
    maxPayingPax: "",
    doubleTwinPrice: "",
    notes: "",
  };
}

function emptySeason(): SeasonForm {
  return {
    season: "LOW",
    months: [],
    seasonNote: "",
    singleSupplement: "",
    tripleReduction: "",
    isOnRequest: false,
    notes: "",
    priceBands: [emptyBand()],
  };
}

function newPlan(
  currency: string,
  includes: string[],
  excludes: string[],
): PlanForm {
  return {
    year: String(new Date().getFullYear() + 1),
    currency,
    title: "",
    description: "",
    isActive: true,
    minPayingPax: "",
    maxPayingPax: "",
    focEnabled: true,
    focPayingPaxRatio: "10",
    focNotes: "1 FOC for EVERY 10 paying passengers.",
    packageIncludes: includes.join("\n"),
    packageExcludes: excludes.join("\n"),
    pricingNotes: "",
    seasons: [emptySeason()],
  };
}

function initialToForm(plan: InitialPlan): PlanForm {
  return {
    id: plan.id,
    year: String(plan.year),
    currency: plan.currency,
    title: plan.title ?? "",
    description: plan.description ?? "",
    isActive: plan.isActive,
    minPayingPax:
      plan.minPayingPax === null ? "" : String(plan.minPayingPax),
    maxPayingPax:
      plan.maxPayingPax === null ? "" : String(plan.maxPayingPax),
    focEnabled: plan.focEnabled,
    focPayingPaxRatio: String(plan.focPayingPaxRatio),
    focNotes: plan.focNotes ?? "",
    packageIncludes: plan.packageIncludes.join("\n"),
    packageExcludes: plan.packageExcludes.join("\n"),
    pricingNotes: plan.pricingNotes ?? "",
    seasons: plan.seasons.map((season) => ({
      id: season.id,
      season: season.season,
      months: season.months,
      seasonNote: season.seasonNote ?? "",
      singleSupplement:
        season.singleSupplement === null
          ? ""
          : String(season.singleSupplement),
      tripleReduction:
        season.tripleReduction === null
          ? ""
          : String(season.tripleReduction),
      isOnRequest: season.isOnRequest,
      notes: season.notes ?? "",
      priceBands: season.priceBands.map((band) => ({
        id: band.id,
        minPayingPax: String(band.minPayingPax),
        maxPayingPax:
          band.maxPayingPax === null ? "" : String(band.maxPayingPax),
        doubleTwinPrice: String(band.doubleTwinPrice),
        notes: band.notes ?? "",
      })),
    })),
  };
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function startingFrom(plan: InitialPlan) {
  const values = plan.seasons.flatMap((season) =>
    season.priceBands.map((band) => band.doubleTwinPrice),
  );

  if (values.length === 0) {
    return null;
  }

  return Math.min(...values);
}

export default function PrivateGroupPricingManager({
  tourId,
  defaultCurrency,
  defaultIncludes,
  defaultExcludes,
  initialPlans,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<PlanForm>(
    newPlan(defaultCurrency, defaultIncludes, defaultExcludes),
  );

  const [openPlanId, setOpenPlanId] = useState<string | null>(
    initialPlans[0]?.id ?? null,
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const existingYears = useMemo(
    () => new Set(initialPlans.map((plan) => plan.year)),
    [initialPlans],
  );

  function updatePlan<K extends keyof PlanForm>(
    key: K,
    value: PlanForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setMessage("");
    setError("");
  }

  function updateSeason<K extends keyof SeasonForm>(
    index: number,
    key: K,
    value: SeasonForm[K],
  ) {
    setForm((current) => ({
      ...current,
      seasons: current.seasons.map((season, seasonIndex) =>
        seasonIndex === index
          ? {
              ...season,
              [key]: value,
            }
          : season,
      ),
    }));
  }

  function updateBand<K extends keyof PriceBandForm>(
    seasonIndex: number,
    bandIndex: number,
    key: K,
    value: PriceBandForm[K],
  ) {
    setForm((current) => ({
      ...current,
      seasons: current.seasons.map((season, currentSeasonIndex) =>
        currentSeasonIndex === seasonIndex
          ? {
              ...season,
              priceBands: season.priceBands.map((band, currentBandIndex) =>
                currentBandIndex === bandIndex
                  ? {
                      ...band,
                      [key]: value,
                    }
                  : band,
              ),
            }
          : season,
      ),
    }));
  }

  function toggleMonth(seasonIndex: number, month: number) {
    const season = form.seasons[seasonIndex];
    const nextMonths = season.months.includes(month)
      ? season.months.filter((value) => value !== month)
      : [...season.months, month].sort((a, b) => a - b);

    updateSeason(seasonIndex, "months", nextMonths);
  }

  function addSeason() {
    setForm((current) => ({
      ...current,
      seasons: [...current.seasons, emptySeason()],
    }));
  }

  function removeSeason(index: number) {
    setForm((current) => ({
      ...current,
      seasons: current.seasons.filter((_, seasonIndex) => seasonIndex !== index),
    }));
  }

  function addBand(seasonIndex: number) {
    setForm((current) => ({
      ...current,
      seasons: current.seasons.map((season, index) =>
        index === seasonIndex
          ? {
              ...season,
              priceBands: [...season.priceBands, emptyBand()],
            }
          : season,
      ),
    }));
  }

  function removeBand(seasonIndex: number, bandIndex: number) {
    setForm((current) => ({
      ...current,
      seasons: current.seasons.map((season, index) =>
        index === seasonIndex
          ? {
              ...season,
              priceBands: season.priceBands.filter(
                (_, indexToRemove) => indexToRemove !== bandIndex,
              ),
            }
          : season,
      ),
    }));
  }

  function editPlan(plan: InitialPlan) {
    setForm(initialToForm(plan));
    setMessage("");
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setForm(newPlan(defaultCurrency, defaultIncludes, defaultExcludes));
    setMessage("");
    setError("");
  }

  async function savePlan() {
    setMessage("");
    setError("");

    const year = Number(form.year);

    if (!Number.isInteger(year) || year < 2020 || year > 2200) {
      setError("Enter a valid pricing year.");
      return;
    }

    if (!form.id && existingYears.has(year)) {
      setError(`A pricing plan for ${year} already exists for this tour.`);
      return;
    }

    if (form.seasons.length === 0) {
      setError("Add at least one pricing season.");
      return;
    }

    for (const [seasonIndex, season] of form.seasons.entries()) {
      if (season.months.length === 0) {
        setError(`Season ${seasonIndex + 1}: select at least one month.`);
        return;
      }

      if (!season.isOnRequest && season.priceBands.length === 0) {
        setError(
          `Season ${seasonIndex + 1}: add at least one passenger price band.`,
        );
        return;
      }

      for (const [bandIndex, band] of season.priceBands.entries()) {
        const minPayingPax = Number(band.minPayingPax);
        const maxPayingPax =
          band.maxPayingPax.trim() === ""
            ? null
            : Number(band.maxPayingPax);
        const price = Number(band.doubleTwinPrice);

        if (!Number.isInteger(minPayingPax) || minPayingPax < 1) {
          setError(
            `Season ${seasonIndex + 1}, band ${bandIndex + 1}: minimum paying passengers is invalid.`,
          );
          return;
        }

        if (
          maxPayingPax !== null &&
          (!Number.isInteger(maxPayingPax) || maxPayingPax < minPayingPax)
        ) {
          setError(
            `Season ${seasonIndex + 1}, band ${bandIndex + 1}: maximum paying passengers is invalid.`,
          );
          return;
        }

        if (!season.isOnRequest && (!Number.isFinite(price) || price <= 0)) {
          setError(
            `Season ${seasonIndex + 1}, band ${bandIndex + 1}: Double/Twin price is invalid.`,
          );
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          form.id
            ? `/api/admin/tours/${tourId}/private-group-pricing/${form.id}`
            : `/api/admin/tours/${tourId}/private-group-pricing`,
          {
            method: form.id ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(form),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
            }
          | null;

        if (!response.ok) {
          setError(data?.error || "Failed to save private-group pricing.");
          return;
        }

        setMessage(
          form.id
            ? "Pricing plan updated successfully."
            : "Pricing plan created successfully.",
        );

        setForm(newPlan(defaultCurrency, defaultIncludes, defaultExcludes));
        router.refresh();
      } catch (saveError) {
        console.error(saveError);
        setError("Something went wrong while saving the pricing plan.");
      }
    });
  }

  async function deletePlan(planId: string, year: number) {
    const confirmed = window.confirm(
      `Delete the ${year} private-group pricing plan? This permanently deletes all seasons and price bands inside it.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/tours/${tourId}/private-group-pricing/${planId}`,
          {
            method: "DELETE",
          },
        );

        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
            }
          | null;

        if (!response.ok) {
          setError(data?.error || "Failed to delete pricing plan.");
          return;
        }

        if (form.id === planId) {
          resetForm();
        }

        setMessage(`${year} pricing plan deleted.`);
        router.refresh();
      } catch (deleteError) {
        console.error(deleteError);
        setError("Something went wrong while deleting the pricing plan.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              {form.id ? "Edit Pricing Plan" : "New Pricing Plan"}
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
              {form.id ? `${form.year} Private Group Pricing` : "Create Annual Pricing"}
            </h2>
          </div>

          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#001F3F]"
            >
              Create New Instead
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Pricing Year *">
            <input
              type="number"
              min={2020}
              max={2200}
              value={form.year}
              onChange={(event) => updatePlan("year", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Currency *">
            <input
              value={form.currency}
              onChange={(event) =>
                updatePlan("currency", event.target.value.toUpperCase())
              }
              className={inputClass}
              maxLength={3}
            />
          </Field>

          <Field label="Minimum Paying Pax">
            <input
              type="number"
              min={1}
              value={form.minPayingPax}
              onChange={(event) =>
                updatePlan("minPayingPax", event.target.value)
              }
              className={inputClass}
            />
          </Field>

          <Field label="Maximum Paying Pax">
            <input
              type="number"
              min={1}
              value={form.maxPayingPax}
              onChange={(event) =>
                updatePlan("maxPayingPax", event.target.value)
              }
              className={inputClass}
              placeholder="Leave blank for no limit"
            />
          </Field>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(event) => updatePlan("title", event.target.value)}
              className={inputClass}
              placeholder="Example: 2027 Standard Private Group Rates"
            />
          </Field>

          <Field label="Description">
            <input
              value={form.description}
              onChange={(event) =>
                updatePlan("description", event.target.value)
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-bold text-amber-900">
                Complimentary Place Policy
              </p>

              <p className="mt-1 text-sm text-amber-800">
                The standard Epoch policy is{" "}
                <strong>1 FOC for EVERY 10 paying passengers.</strong>
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <input
                type="checkbox"
                checked={form.focEnabled}
                onChange={(event) =>
                  updatePlan("focEnabled", event.target.checked)
                }
              />
              FOC enabled
            </label>
          </div>

          {form.focEnabled ? (
            <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
              <Field label="Paying Pax Ratio">
                <input
                  type="number"
                  min={1}
                  value={form.focPayingPaxRatio}
                  onChange={(event) =>
                    updatePlan("focPayingPaxRatio", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="FOC Note">
                <input
                  value={form.focNotes}
                  onChange={(event) =>
                    updatePlan("focNotes", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Standard Package Includes">
            <textarea
              value={form.packageIncludes}
              onChange={(event) =>
                updatePlan("packageIncludes", event.target.value)
              }
              className={textareaClass}
              placeholder="One inclusion per line"
            />
          </Field>

          <Field label="Standard Package Excludes">
            <textarea
              value={form.packageExcludes}
              onChange={(event) =>
                updatePlan("packageExcludes", event.target.value)
              }
              className={textareaClass}
              placeholder="One exclusion per line"
            />
          </Field>
        </div>

        <Field label="Pricing Notes">
          <textarea
            value={form.pricingNotes}
            onChange={(event) =>
              updatePlan("pricingNotes", event.target.value)
            }
            className={textareaClass}
            placeholder="General commercial notes for this pricing year"
          />
        </Field>

        <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              updatePlan("isActive", event.target.checked)
            }
          />
          Pricing plan is active
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Seasonal Pricing
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
              Seasons, Months & Passenger Bands
            </h2>
          </div>

          <button
            type="button"
            onClick={addSeason}
            className="inline-flex items-center gap-2 rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002b57]"
          >
            <Plus className="h-4 w-4" />
            Add Season
          </button>
        </div>

        {form.seasons.map((season, seasonIndex) => (
          <div
            key={`${season.id ?? "new"}-${seasonIndex}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5 text-[#001F3F]">
                  <CalendarRange className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-[#001F3F]">
                    Season {seasonIndex + 1}
                  </p>
                  <p className="text-xs text-slate-500">
                    Configure months, room adjustments and price bands.
                  </p>
                </div>
              </div>

              {form.seasons.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeSeason(seasonIndex)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Season
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Season *">
                <select
                  value={season.season}
                  onChange={(event) =>
                    updateSeason(
                      seasonIndex,
                      "season",
                      event.target.value as SeasonValue,
                    )
                  }
                  className={inputClass}
                >
                  <option value="LOW">Low Season</option>
                  <option value="SHOULDER">Mid Season</option>
                  <option value="HIGH">High Season</option>
                  <option value="PEAK">Peak Season</option>
                </select>
              </Field>

              <Field label="Single Supplement">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={season.singleSupplement}
                  onChange={(event) =>
                    updateSeason(
                      seasonIndex,
                      "singleSupplement",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Triple Reduction">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={season.tripleReduction}
                  onChange={(event) =>
                    updateSeason(
                      seasonIndex,
                      "tripleReduction",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <label className="flex items-end pb-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={season.isOnRequest}
                    onChange={(event) =>
                      updateSeason(
                        seasonIndex,
                        "isOnRequest",
                        event.target.checked,
                      )
                    }
                  />
                  Price on request
                </span>
              </label>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-700">
                Applicable Months *
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {MONTHS.map(([label, month]) => {
                  const selected = season.months.includes(month);

                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => toggleMonth(seasonIndex, month)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        selected
                          ? "border-[#8B0000] bg-red-50 text-[#8B0000]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="Season Note">
                <input
                  value={season.seasonNote}
                  onChange={(event) =>
                    updateSeason(
                      seasonIndex,
                      "seasonNote",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Example: February and early March"
                />
              </Field>

              <Field label="Internal / Additional Notes">
                <input
                  value={season.notes}
                  onChange={(event) =>
                    updateSeason(seasonIndex, "notes", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between gap-4 border-b bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-[#001F3F]">
                    Paying-Passenger Price Bands
                  </p>
                  <p className="text-xs text-slate-500">
                    Double/Twin NET B2B price per paying passenger.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => addBand(seasonIndex)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B0000]"
                >
                  <Plus className="h-4 w-4" />
                  Add Band
                </button>
              </div>

              <div className="space-y-3 p-4">
                {season.priceBands.map((band, bandIndex) => (
                  <div
                    key={`${band.id ?? "new-band"}-${bandIndex}`}
                    className="grid gap-3 rounded-xl border border-slate-100 p-4 lg:grid-cols-[140px_140px_180px_1fr_auto]"
                  >
                    <Field label="Min Paying Pax *">
                      <input
                        type="number"
                        min={1}
                        value={band.minPayingPax}
                        onChange={(event) =>
                          updateBand(
                            seasonIndex,
                            bandIndex,
                            "minPayingPax",
                            event.target.value,
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Max Paying Pax">
                      <input
                        type="number"
                        min={1}
                        value={band.maxPayingPax}
                        onChange={(event) =>
                          updateBand(
                            seasonIndex,
                            bandIndex,
                            "maxPayingPax",
                            event.target.value,
                          )
                        }
                        className={inputClass}
                        placeholder="40+ = blank"
                      />
                    </Field>

                    <Field label={`Double/Twin (${form.currency})`}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={band.doubleTwinPrice}
                        onChange={(event) =>
                          updateBand(
                            seasonIndex,
                            bandIndex,
                            "doubleTwinPrice",
                            event.target.value,
                          )
                        }
                        className={inputClass}
                        disabled={season.isOnRequest}
                      />
                    </Field>

                    <Field label="Band Note">
                      <input
                        value={band.notes}
                        onChange={(event) =>
                          updateBand(
                            seasonIndex,
                            bandIndex,
                            "notes",
                            event.target.value,
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <div className="flex items-end">
                      {season.priceBands.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            removeBand(seasonIndex, bandIndex)
                          }
                          className="mb-1 rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                          title="Remove price band"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={savePlan}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isPending
              ? "Saving..."
              : form.id
                ? "Update Pricing Plan"
                : "Save Pricing Plan"}
          </button>
        </div>
      </section>

      <section>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Existing Pricing
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Annual Pricing Plans
          </h2>
        </div>

        {initialPlans.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No private-group pricing plans have been created yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {initialPlans.map((plan) => {
              const startPrice = startingFrom(plan);
              const open = openPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[#001F3F]">
                          {plan.year} Private Group Pricing
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            plan.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {plan.seasons.length} season
                        {plan.seasons.length === 1 ? "" : "s"}
                        {startPrice === null
                          ? ""
                          : ` · Starting from ${money(startPrice, plan.currency)} pp`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editPlan(plan)}
                        className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenPlanId(open ? null : plan.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        {open ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        Details
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePlan(plan.id, plan.year)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="border-t bg-slate-50 p-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {plan.seasons.map((season) => (
                          <div
                            key={season.id}
                            className="rounded-xl border bg-white p-4"
                          >
                            <p className="font-bold text-[#001F3F]">
                              {season.season === "SHOULDER"
                                ? "Mid Season"
                                : `${season.season.charAt(0)}${season.season
                                    .slice(1)
                                    .toLowerCase()} Season`}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {season.seasonNote ||
                                season.months
                                  .map(
                                    (month) =>
                                      MONTHS.find(
                                        ([, value]) => value === month,
                                      )?.[0],
                                  )
                                  .filter(Boolean)
                                  .join(", ")}
                            </p>

                            <div className="mt-3 space-y-1 text-xs text-slate-600">
                              {season.priceBands.map((band) => (
                                <div
                                  key={band.id}
                                  className="flex justify-between gap-3"
                                >
                                  <span>
                                    {band.minPayingPax}
                                    {band.maxPayingPax
                                      ? `–${band.maxPayingPax}`
                                      : "+"}
                                    {" pax"}
                                  </span>

                                  <strong>
                                    {money(
                                      band.doubleTwinPrice,
                                      plan.currency,
                                    )}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:bg-slate-100 disabled:text-slate-400";

const textareaClass =
  "min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
