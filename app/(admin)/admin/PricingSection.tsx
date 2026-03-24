"use client";

import { useMemo, useState } from "react";
import type { PricingType, RoomType } from "@prisma/client";

type TierRow = {
  minPax: string;
  maxPax: string;
  roomType: RoomType;
  price: string;
};

type TourFormValues = {
  title?: string;
  category?: string;
  duration?: number;
  shortDescription?: string | null;
  destinations?: string[];
  subcategories?: string[];
  tags?: string[];
  tourIntroduction?: string | null;
  tourSignificance?: string | null;
  destinationBriefs?: string | null;
  overview?: string | null;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  accommodations?: string[];
  overviewItinerary?: string | null;
  itinerary?: string | null;
  isPublished?: boolean;
  featured?: boolean;
  requiresQuote?: boolean;
  pricingType?: PricingType;
  basePrice?: number | null;
  pricingTiers?: Array<{
    minPax: number;
    maxPax: number;
    roomType: RoomType;
    price: number;
  }>;
};

type SeasonalPrices = {
  LOW?: number | null;
  SHOULDER?: number | null;
  HIGH?: number | null;
  PEAK?: number | null;
};

type TourFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode?: "create" | "edit";
  initialValues?: TourFormValues;
  seasonalPrices?: SeasonalPrices;
};

const pricingTypeOptions: Array<{
  value: PricingType;
  label: string;
  help: string;
}> = [
  {
    value: "FIXED_GROUP",
    label: "Fixed Group",
    help: "Guaranteed departure / seat-in-coach with fixed selling price.",
  },
  {
    value: "GROUP_BASED",
    label: "Group Based",
    help: "Price depends on group size.",
  },
  {
    value: "FIT_DYNAMIC",
    label: "FIT Dynamic",
    help: "Tailor-made private tour. Price is built manually or on request.",
  },
  {
    value: "FIT_FIXED",
    label: "FIT Fixed",
    help: "Standardized private tour with fixed instant-book price.",
  },
  {
    value: "FIT_TIERED",
    label: "FIT Tiered",
    help: "Private tour with pricing based on traveler count tiers.",
  },
];

const roomTypeOptions: Array<{ value: RoomType; label: string }> = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE_TWIN", label: "Double / Twin" },
  { value: "TRIPLE", label: "Triple" },
];

function joinArray(arr?: string[] | null): string {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
}

export default function TourForm({
  action,
  mode = "create",
  initialValues,
  seasonalPrices,
}: TourFormProps) {
  const [pricingType, setPricingType] = useState<PricingType>(
    initialValues?.pricingType ?? "FIXED_GROUP"
  );

  const [tiers, setTiers] = useState<TierRow[]>(
    initialValues?.pricingTiers && initialValues.pricingTiers.length > 0
      ? initialValues.pricingTiers.map((tier) => ({
          minPax: String(tier.minPax),
          maxPax: String(tier.maxPax),
          roomType: tier.roomType,
          price: String(tier.price),
        }))
      : [
          {
            minPax: "2",
            maxPax: "2",
            roomType: "DOUBLE_TWIN",
            price: "",
          },
        ]
  );

  const tierJson = useMemo(() => JSON.stringify(tiers), [tiers]);

  function updateTier<K extends keyof TierRow>(
    index: number,
    field: K,
    value: TierRow[K]
  ) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier))
    );
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      {
        minPax: "",
        maxPax: "",
        roomType: "DOUBLE_TWIN",
        price: "",
      },
    ]);
  }

  function addTierPreset(minPax: number, maxPax: number) {
    setTiers((prev) => [
      ...prev,
      {
        minPax: String(minPax),
        maxPax: String(maxPax),
        roomType: "SINGLE",
        price: "",
      },
      {
        minPax: String(minPax),
        maxPax: String(maxPax),
        roomType: "DOUBLE_TWIN",
        price: "",
      },
      {
        minPax: String(minPax),
        maxPax: String(maxPax),
        roomType: "TRIPLE",
        price: "",
      },
    ]);
  }

  function getSuggestedNextRange() {
    if (tiers.length === 0) {
      return { minPax: 1, maxPax: 2 };
    }

    const maxValues = tiers
      .map((tier) => Number(tier.maxPax))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (maxValues.length === 0) {
      return { minPax: 1, maxPax: 2 };
    }

    const currentMax = Math.max(...maxValues);

    return {
      minPax: currentMax + 1,
      maxPax: currentMax + 2,
    };
  }

  function addSuggestedTierPreset() {
    const nextRange = getSuggestedNextRange();
    addTierPreset(nextRange.minPax, nextRange.maxPax);
  }

  function removeTier(index: number) {
    if (tiers.length === 1) return;
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  const showBasePrice =
    pricingType === "FIXED_GROUP" || pricingType === "FIT_FIXED";

  const showTierTable =
    pricingType === "FIT_TIERED" || pricingType === "GROUP_BASED";

  const forceQuote =
    pricingType === "GROUP_BASED" || pricingType === "FIT_DYNAMIC";

  return (
    <form action={action} className="space-y-8 rounded-lg border bg-white p-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <p className="text-sm text-gray-500">
            Core identity and quick summary of the tour.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="title" className="text-sm font-medium">
              Tour Title
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={initialValues?.title ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="St Paul Greece Pilgrimage"
            />
          </div>

          <div>
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue={initialValues?.category ?? ""}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="" disabled>
                Select category
              </option>
              <option value="Pilgrimage">Pilgrimage</option>
              <option value="Cultural">Cultural</option>
              <option value="Historical">Historical</option>
              <option value="Thematic">Thematic</option>
              <option value="Special Interest">Special Interest</option>
            </select>
          </div>

          <div>
            <label htmlFor="duration" className="text-sm font-medium">
              Duration (days)
            </label>
            <input
              id="duration"
              name="duration"
              type="number"
              min="1"
              required
              defaultValue={initialValues?.duration ?? 1}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="shortDescription" className="text-sm font-medium">
              Short Description
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              defaultValue={initialValues?.shortDescription ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Short summary for listing cards and quick overview."
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="destinations" className="text-sm font-medium">
              Destinations
            </label>
            <input
              id="destinations"
              name="destinations"
              defaultValue={joinArray(initialValues?.destinations)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Greece, Turkey, Italy"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated.</p>
          </div>

          <div>
            <label htmlFor="subcategories" className="text-sm font-medium">
              Subcategories
            </label>
            <input
              id="subcategories"
              name="subcategories"
              defaultValue={joinArray(initialValues?.subcategories)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Faith-Based, Heritage, UNESCO"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated.</p>
          </div>

          <div>
            <label htmlFor="tags" className="text-sm font-medium">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={joinArray(initialValues?.tags)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Catholic, Biblical, Small Group"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated.</p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="overview" className="text-sm font-medium">
              Overview
            </label>
            <textarea
              id="overview"
              name="overview"
              defaultValue={initialValues?.overview ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={4}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="tourIntroduction" className="text-sm font-medium">
              Tour Introduction
            </label>
            <textarea
              id="tourIntroduction"
              name="tourIntroduction"
              defaultValue={initialValues?.tourIntroduction ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={4}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="tourSignificance" className="text-sm font-medium">
              Tour Significance
            </label>
            <textarea
              id="tourSignificance"
              name="tourSignificance"
              defaultValue={initialValues?.tourSignificance ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={4}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="destinationBriefs" className="text-sm font-medium">
              Destination Briefs
            </label>
            <textarea
              id="destinationBriefs"
              name="destinationBriefs"
              defaultValue={initialValues?.destinationBriefs ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={4}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pricing</h2>
          <p className="text-sm text-gray-500">
            Set the commercial model for this tour.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="pricingType" className="text-sm font-medium">
              Pricing Type
            </label>
            <select
              id="pricingType"
              name="pricingType"
              value={pricingType}
              onChange={(e) => setPricingType(e.target.value as PricingType)}
              className="mt-1 w-full rounded border p-2"
            >
              {pricingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-gray-500">
              {
                pricingTypeOptions.find((option) => option.value === pricingType)
                  ?.help
              }
            </p>
          </div>

          {showBasePrice && (
            <div>
              <label htmlFor="basePrice" className="text-sm font-medium">
                Base Price
              </label>
              <input
                id="basePrice"
                name="basePrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={initialValues?.basePrice ?? ""}
                className="mt-1 w-full rounded border p-2"
                placeholder="2450"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use this for fixed-price tours that can be booked instantly.
              </p>
            </div>
          )}

          {pricingType === "GROUP_BASED" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 md:col-span-2">
              This tour will be treated as quote-based or tier-based by group
              size, depending on the pricing rows you define.
            </div>
          )}

          {pricingType === "FIT_DYNAMIC" && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 md:col-span-2">
              This tour will be treated as tailor-made / quote-based. No instant
              booking price will be shown.
            </div>
          )}

          {showTierTable && (
            <div className="space-y-4 rounded-md border p-4 md:col-span-2">
              <div>
                <h3 className="font-medium">Pricing Tiers</h3>
                <p className="text-xs text-gray-500">
                  Add one row per traveler range and room type.
                </p>
              </div>

              <input type="hidden" name="pricingTiers" value={tierJson} />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addTier}
                  className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  + Add One Row
                </button>

                <button
                  type="button"
                  onClick={() => addTierPreset(1, 2)}
                  className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  + Add 1–2 Tier Set
                </button>

                <button
                  type="button"
                  onClick={addSuggestedTierPreset}
                  className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  + Add Next Tier Set
                </button>
              </div>

              <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
                Pricing should use <strong>Double / Twin</strong> as one room
                type. Operational separation between double and twin remains in
                booking and rooming list workflows.
              </div>

              <div className="space-y-3">
                {tiers.map((tier, index) => (
                  <div
                    key={index}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_1fr_auto]"
                  >
                    <input
                      type="number"
                      min="1"
                      value={tier.minPax}
                      onChange={(e) =>
                        updateTier(index, "minPax", e.target.value)
                      }
                      className="rounded border p-2"
                      placeholder="Min Pax"
                    />

                    <input
                      type="number"
                      min="1"
                      value={tier.maxPax}
                      onChange={(e) =>
                        updateTier(index, "maxPax", e.target.value)
                      }
                      className="rounded border p-2"
                      placeholder="Max Pax"
                    />

                    <select
                      value={tier.roomType}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "roomType",
                          e.target.value as RoomType
                        )
                      }
                      className="rounded border p-2"
                    >
                      {roomTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.price}
                      onChange={(e) =>
                        updateTier(index, "price", e.target.value)
                      }
                      className="rounded border p-2"
                      placeholder="Price"
                    />

                    <button
                      type="button"
                      onClick={() => removeTier(index)}
                      className="rounded border px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                      disabled={tiers.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <input
          type="hidden"
          name="requiresQuote"
          value={
            forceQuote ? "true" : String(initialValues?.requiresQuote ?? false)
          }
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Seasonal Pricing</h2>
          <p className="text-sm text-gray-500">
            These prices are used to auto-fill departure prices by season.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="seasonPrice_LOW" className="text-sm font-medium">
              Low Season
            </label>
            <input
              id="seasonPrice_LOW"
              name="seasonPrice_LOW"
              type="number"
              min="0"
              step="0.01"
              defaultValue={seasonalPrices?.LOW ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="1990"
            />
          </div>

          <div>
            <label
              htmlFor="seasonPrice_SHOULDER"
              className="text-sm font-medium"
            >
              Shoulder Season
            </label>
            <input
              id="seasonPrice_SHOULDER"
              name="seasonPrice_SHOULDER"
              type="number"
              min="0"
              step="0.01"
              defaultValue={seasonalPrices?.SHOULDER ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="2190"
            />
          </div>

          <div>
            <label htmlFor="seasonPrice_HIGH" className="text-sm font-medium">
              High Season
            </label>
            <input
              id="seasonPrice_HIGH"
              name="seasonPrice_HIGH"
              type="number"
              min="0"
              step="0.01"
              defaultValue={seasonalPrices?.HIGH ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="2390"
            />
          </div>

          <div>
            <label htmlFor="seasonPrice_PEAK" className="text-sm font-medium">
              Peak Season
            </label>
            <input
              id="seasonPrice_PEAK"
              name="seasonPrice_PEAK"
              type="number"
              min="0"
              step="0.01"
              defaultValue={seasonalPrices?.PEAK ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="2590"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Tour Content</h2>
          <p className="text-sm text-gray-500">
            Rich descriptive sections shown in the tour detail page.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="highlights" className="text-sm font-medium">
              Highlights
            </label>
            <textarea
              id="highlights"
              name="highlights"
              defaultValue={joinArray(initialValues?.highlights)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
          </div>

          <div>
            <label htmlFor="inclusions" className="text-sm font-medium">
              Inclusions
            </label>
            <textarea
              id="inclusions"
              name="inclusions"
              defaultValue={joinArray(initialValues?.inclusions)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
          </div>

          <div>
            <label htmlFor="exclusions" className="text-sm font-medium">
              Exclusions
            </label>
            <textarea
              id="exclusions"
              name="exclusions"
              defaultValue={joinArray(initialValues?.exclusions)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
          </div>

          <div>
            <label htmlFor="accommodations" className="text-sm font-medium">
              Accommodations
            </label>
            <textarea
              id="accommodations"
              name="accommodations"
              defaultValue={joinArray(initialValues?.accommodations)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
          </div>

          <div>
            <label htmlFor="overviewItinerary" className="text-sm font-medium">
              Overview Itinerary
            </label>
            <textarea
              id="overviewItinerary"
              name="overviewItinerary"
              defaultValue={initialValues?.overviewItinerary ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="itinerary" className="text-sm font-medium">
              Detailed Itinerary
            </label>
            <textarea
              id="itinerary"
              name="itinerary"
              defaultValue={initialValues?.itinerary ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={8}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Publishing</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded border p-3">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={initialValues?.isPublished ?? false}
            />
            <span className="text-sm font-medium">Published</span>
          </label>

          <label className="flex items-center gap-2 rounded border p-3">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initialValues?.featured ?? false}
            />
            <span className="text-sm font-medium">Featured</span>
          </label>

          {!forceQuote && (
            <label className="flex items-center gap-2 rounded border p-3">
              <input
                type="checkbox"
                name="requiresQuote"
                defaultChecked={initialValues?.requiresQuote ?? false}
              />
              <span className="text-sm font-medium">Requires Quote</span>
            </label>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded bg-red-700 px-6 py-2 text-white hover:bg-red-800"
        >
          {mode === "edit" ? "Update Tour" : "Create Tour"}
        </button>
      </div>
    </form>
  );
}