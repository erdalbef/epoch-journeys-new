"use client";

import { useMemo, useState } from "react";
import type { PricingType } from "@prisma/client";

type TierRow = {
  minPax: string;
  maxPax: string;
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
    price: number;
  }>;
};

type TourFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode?: "create" | "edit";
  initialValues?: TourFormValues;
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
    help: "Price depends on group size. Usually quote-based.",
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
    help: "Private tour with instant pricing based on traveler count tiers.",
  },
];

function joinArray(arr?: string[] | null): string {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
}

export default function TourForm({
  action,
  mode = "create",
  initialValues,
}: TourFormProps) {
  const [pricingType, setPricingType] = useState<PricingType>(
    initialValues?.pricingType ?? "FIXED_GROUP"
  );

  const [tiers, setTiers] = useState<TierRow[]>(
    initialValues?.pricingTiers && initialValues.pricingTiers.length > 0
      ? initialValues.pricingTiers.map((tier) => ({
          minPax: String(tier.minPax),
          maxPax: String(tier.maxPax),
          price: String(tier.price),
        }))
      : [{ minPax: "2", maxPax: "2", price: "" }]
  );

  const tierJson = useMemo(() => JSON.stringify(tiers), [tiers]);

  function updateTier(index: number, field: keyof TierRow, value: string) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier))
    );
  }

  function addTier() {
    setTiers((prev) => [...prev, { minPax: "", maxPax: "", price: "" }]);
  }

  function removeTier(index: number) {
    if (tiers.length === 1) return;
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  const showBasePrice =
    pricingType === "FIXED_GROUP" || pricingType === "FIT_FIXED";

  const showTierTable = pricingType === "FIT_TIERED";

  const forceQuote =
    pricingType === "GROUP_BASED" || pricingType === "FIT_DYNAMIC";

  return (
    <form action={action} className="space-y-8 rounded-lg border bg-white p-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <p className="text-sm text-muted-foreground">
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
              Duration (Days)
            </label>
            <input
              id="duration"
              name="duration"
              type="number"
              min="1"
              required
              defaultValue={initialValues?.duration ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="10"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="shortDescription" className="text-sm font-medium">
              Short Description
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={3}
              defaultValue={initialValues?.shortDescription ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="A short summary that agents can understand quickly."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pricing</h2>
          <p className="text-sm text-muted-foreground">
            Define how this tour should be priced and booked in the platform.
          </p>
        </div>

        <div className="grid gap-4">
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

            <p className="mt-2 text-xs text-muted-foreground">
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
              <p className="mt-1 text-xs text-muted-foreground">
                Use this for fixed-price tours that can be booked instantly.
              </p>
            </div>
          )}

          {pricingType === "GROUP_BASED" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This tour will be treated as quote-based. Agents can see the tour,
              but pricing should be finalized based on group size.
            </div>
          )}

          {pricingType === "FIT_DYNAMIC" && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              This tour will be treated as tailor-made / quote-based. No instant
              booking price will be shown.
            </div>
          )}

          {showTierTable && (
            <div className="space-y-3 rounded-md border p-4">
              <div>
                <h3 className="font-medium">Pricing Tiers</h3>
                <p className="text-xs text-muted-foreground">
                  Add one row per traveler range. Example: 2-2 pax, 3-4 pax,
                  5-6 pax.
                </p>
              </div>

              <input type="hidden" name="pricingTiers" value={tierJson} />

              <div className="space-y-3">
                {tiers.map((tier, index) => (
                  <div
                    key={index}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
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

              <button
                type="button"
                onClick={addTier}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
              >
                + Add Tier
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Classification</h2>
          <p className="text-sm text-muted-foreground">
            Destinations, subcategories, and tags for better organization.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
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
            <p className="mt-1 text-xs text-muted-foreground">
              Separate multiple destinations with commas.
            </p>
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
              placeholder="Biblical Heritage, Early Christianity, UNESCO"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Separate multiple subcategories with commas.
            </p>
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
              placeholder="St Paul, Church History, Faith & Culture"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Separate multiple tags with commas.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Tour Meaning and Content</h2>
          <p className="text-sm text-muted-foreground">
            Explain what makes this tour important and meaningful.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="tourIntroduction" className="text-sm font-medium">
              Tour Introduction
            </label>
            <textarea
              id="tourIntroduction"
              name="tourIntroduction"
              rows={4}
              defaultValue={initialValues?.tourIntroduction ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="Briefly introduce the purpose and focus of this tour."
            />
          </div>

          <div>
            <label htmlFor="tourSignificance" className="text-sm font-medium">
              Why This Tour Matters
            </label>
            <textarea
              id="tourSignificance"
              name="tourSignificance"
              rows={5}
              defaultValue={initialValues?.tourSignificance ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="Explain the spiritual, cultural, historical, or thematic importance of this tour."
            />
          </div>

          <div>
            <label htmlFor="destinationBriefs" className="text-sm font-medium">
              Destination Briefs
            </label>
            <textarea
              id="destinationBriefs"
              name="destinationBriefs"
              rows={6}
              defaultValue={initialValues?.destinationBriefs ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="Give brief information about the destinations included in the itinerary."
            />
          </div>

          <div>
            <label htmlFor="overview" className="text-sm font-medium">
              General Overview
            </label>
            <textarea
              id="overview"
              name="overview"
              rows={5}
              defaultValue={initialValues?.overview ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="General overview of the tour program."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Sales Content</h2>
          <p className="text-sm text-muted-foreground">
            Main selling points and operational inclusions.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="highlights" className="text-sm font-medium">
              Highlights
            </label>
            <input
              id="highlights"
              name="highlights"
              defaultValue={joinArray(initialValues?.highlights)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Mars Hill, Philippi, Thessaloniki, Corinth"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Separate multiple highlights with commas.
            </p>
          </div>

          <div>
            <label htmlFor="inclusions" className="text-sm font-medium">
              Inclusions
            </label>
            <input
              id="inclusions"
              name="inclusions"
              defaultValue={joinArray(initialValues?.inclusions)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Hotels, Meals, Guide, Transportation, Entrance Fees"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Separate multiple inclusions with commas.
            </p>
          </div>

          <div>
            <label htmlFor="exclusions" className="text-sm font-medium">
              Exclusions
            </label>
            <input
              id="exclusions"
              name="exclusions"
              defaultValue={joinArray(initialValues?.exclusions)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Flights, Insurance, Tips, Personal Expenses"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Separate multiple exclusions with commas.
            </p>
          </div>

          <div>
            <label htmlFor="accommodations" className="text-sm font-medium">
              Accommodations
            </label>
            <input
              id="accommodations"
              name="accommodations"
              defaultValue={joinArray(initialValues?.accommodations)}
              className="mt-1 w-full rounded border p-2"
              placeholder="4-star hotels, boutique hotels, monastery guesthouse"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Separate multiple accommodation notes with commas.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Itinerary</h2>
          <p className="text-sm text-muted-foreground">
            Add overview itinerary notes now. We will build a more advanced
            day-by-day builder next.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="overviewItinerary" className="text-sm font-medium">
              Overview Itinerary
            </label>
            <textarea
              id="overviewItinerary"
              name="overviewItinerary"
              rows={4}
              defaultValue={initialValues?.overviewItinerary ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="Day 1 Athens, Day 2 Philippi, Day 3 Thessaloniki..."
            />
          </div>

          <div>
            <label htmlFor="itinerary" className="text-sm font-medium">
              Detailed Itinerary
            </label>
            <textarea
              id="itinerary"
              name="itinerary"
              rows={8}
              defaultValue={initialValues?.itinerary ?? ""}
              className="mt-1 w-full rounded border p-2"
              placeholder="Add the detailed day-by-day itinerary here for now."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Control how the tour behaves in the platform.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={initialValues?.isPublished ?? false}
            />
            Published
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initialValues?.featured ?? false}
            />
            Featured
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiresQuote"
              defaultChecked={initialValues?.requiresQuote ?? false}
              disabled={forceQuote}
            />
            Requires Quote
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
        >
          {mode === "edit" ? "Update Tour" : "Create Tour"}
        </button>
      </div>
    </form>
  );
}