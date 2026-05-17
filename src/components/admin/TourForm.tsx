"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PricingType, RoomType } from "@prisma/client";
import PricingTierPresetHelper from "@/components/admin/PricingTierPresetHelper";

type PrivatePricingMap = {
  "1": string;
  "2": string;
  "3": string;
  "4": string;
  "5": string;
  "6": string;
  "7": string;
  "8": string;
};

type PricingTierFormValue = {
  label?: string;
  minPax: number | "";
  maxPax: number | "";
  roomType: RoomType;
  pricePerPerson: number | "";
  currency: string;
  isActive: boolean;
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
  whyWeOfferThisTour?: string | null;
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
  privatePricing?: Partial<Record<keyof PrivatePricingMap, number | string | null>>;
  pricingTiers?: Array<{
    label?: string | null;
    minPax?: number | null;
    maxPax?: number | null;
    roomType?: RoomType | null;
    pricePerPerson: number;
    currency?: string | null;
    isActive?: boolean | null;
  }>;
};

type InitialImages = {
  mainImageUrl?: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  imageUrl4?: string | null;
  mapImageUrl?: string | null;
  brochureUrl?: string | null;
};

type TourFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode?: "create" | "edit";
  initialValues?: TourFormValues;
  initialImages?: InitialImages;
};

type PreviewState = {
  main: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  map: string | null;
};

type DeleteFlagsState = {
  mainImage: boolean;
  image2: boolean;
  image3: boolean;
  image4: boolean;
  mapImage: boolean;
  brochure: boolean;
};

const pricingTypeOptions: Array<{
  value: PricingType;
  label: string;
  help: string;
}> = [
  {
    value: "FIXED_GROUP",
    label: "Scheduled Departure",
    help: "Use departure dates for actual selling prices. Each departure price is per person in double room.",
  },
  {
    value: "FIT_FIXED",
    label: "Private Tour Fixed",
    help: "Use one fixed private tour structure with optional 1–8 pax pricing below.",
  },
  {
    value: "FIT_TIERED",
    label: "Private Tour by Pax",
    help: "Set private tour prices for 1 to 8 passengers below. Prices are per person in double room.",
  },
  {
    value: "GROUP_BASED",
    label: "Group Based / Quote",
    help: "Use for custom group packages. You may still define private prices below if needed.",
  },
  {
    value: "FIT_DYNAMIC",
    label: "Private Tour On Request",
    help: "Quote-based private tour. No instant selling price is required.",
  },
];

const highlightPresets = [
  "Biblical sites",
  "UNESCO heritage",
  "Daily Mass",
  "Wine tasting",
  "Archaeological visits",
  "Scenic drive",
  "Cultural immersion",
  "Local guide",
];

const inclusionPresets = [
  "Hotel accommodation",
  "Breakfast daily",
  "Dinner daily",
  "Private coach",
  "Airport transfers",
  "Entrance fees",
  "Local guide",
  "Tour escort",
  "Boat / ferry ticket",
  "Porterage",
];

const exclusionPresets = [
  "International airfare",
  "Lunches",
  "Drinks with meals",
  "Travel insurance",
  "Visa fees",
  "Personal expenses",
  "Single supplement",
  "Tips",
];

const accommodationPresets = [
  "4-star hotels",
  "Boutique hotels",
  "Pilgrimage guesthouse",
  "City-center hotel",
  "Bed and breakfast",
  "Half board",
  "Full board",
  "Double / twin room basis",
];

function joinArray(arr?: string[] | null): string {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
}

function normalizeCommaList(value: string): string {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function appendPreset(current: string, preset: string) {
  const existing = current
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (existing.includes(preset)) {
    return current;
  }

  return normalizeCommaList([...existing, preset].join(", "));
}

function renderPreviewImage(src: string | null, alt: string, className: string) {
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={400}
      className={className}
      unoptimized={src.startsWith("blob:")}
    />
  );
}

const galleryFieldConfig: Array<{
  inputName: "image2" | "image3" | "image4";
  previewKey: "image2" | "image3" | "image4";
  initialImageKey: "imageUrl2" | "imageUrl3" | "imageUrl4";
  deleteKey: "image2" | "image3" | "image4";
  label: string;
  alt: string;
}> = [
  {
    inputName: "image2",
    previewKey: "image2",
    initialImageKey: "imageUrl2",
    deleteKey: "image2",
    label: "Gallery Image 1",
    alt: "Gallery image 1 preview",
  },
  {
    inputName: "image3",
    previewKey: "image3",
    initialImageKey: "imageUrl3",
    deleteKey: "image3",
    label: "Gallery Image 2",
    alt: "Gallery image 2 preview",
  },
  {
    inputName: "image4",
    previewKey: "image4",
    initialImageKey: "imageUrl4",
    deleteKey: "image4",
    label: "Gallery Image 3",
    alt: "Gallery image 3 preview",
  },
];

export default function TourForm({
  action,
  mode = "create",
  initialValues,
  initialImages,
}: TourFormProps) {
  const [pricingType, setPricingType] = useState<PricingType>(
    initialValues?.pricingType ?? "FIXED_GROUP"
  );

  const [highlights, setHighlights] = useState(
    joinArray(initialValues?.highlights)
  );
  const [inclusions, setInclusions] = useState(
    joinArray(initialValues?.inclusions)
  );
  const [exclusions, setExclusions] = useState(
    joinArray(initialValues?.exclusions)
  );
  const [accommodations, setAccommodations] = useState(
    joinArray(initialValues?.accommodations)
  );

  const [privatePricing, setPrivatePricing] = useState<PrivatePricingMap>({
    "1": String(initialValues?.privatePricing?.["1"] ?? ""),
    "2": String(initialValues?.privatePricing?.["2"] ?? ""),
    "3": String(initialValues?.privatePricing?.["3"] ?? ""),
    "4": String(initialValues?.privatePricing?.["4"] ?? ""),
    "5": String(initialValues?.privatePricing?.["5"] ?? ""),
    "6": String(initialValues?.privatePricing?.["6"] ?? ""),
    "7": String(initialValues?.privatePricing?.["7"] ?? ""),
    "8": String(initialValues?.privatePricing?.["8"] ?? ""),
  });

  const [pricingTiers, setPricingTiers] = useState<PricingTierFormValue[]>(
    initialValues?.pricingTiers?.length
      ? initialValues.pricingTiers.map((tier) => ({
          label: tier.label ?? "",
          minPax: tier.minPax ?? "",
          maxPax: tier.maxPax ?? "",
          roomType: tier.roomType ?? "DOUBLE_TWIN",
          pricePerPerson: tier.pricePerPerson ?? "",
          currency: tier.currency ?? "EUR",
          isActive: tier.isActive ?? true,
        }))
      : []
  );

  const [preview, setPreview] = useState<PreviewState>({
    main: initialImages?.mainImageUrl || null,
    image2: initialImages?.imageUrl2 || null,
    image3: initialImages?.imageUrl3 || null,
    image4: initialImages?.imageUrl4 || null,
    map: initialImages?.mapImageUrl || null,
  });

  const [deleteFlags, setDeleteFlags] = useState<DeleteFlagsState>({
    mainImage: false,
    image2: false,
    image3: false,
    image4: false,
    mapImage: false,
    brochure: false,
  });

  const privatePricingJson = useMemo(
    () => JSON.stringify(privatePricing),
    [privatePricing]
  );

  const pricingTiersJson = useMemo(
    () => JSON.stringify(pricingTiers),
    [pricingTiers]
  );

  const showPrivatePricing =
    pricingType === "FIT_TIERED" ||
    pricingType === "FIT_FIXED" ||
    pricingType === "GROUP_BASED";

  const showPricingTiers =
    pricingType === "FIT_TIERED" || pricingType === "GROUP_BASED";

  const isQuoteDriven =
    pricingType === "GROUP_BASED" || pricingType === "FIT_DYNAMIC";

  function handlePreview(
    file: File | null,
    key: keyof PreviewState,
    deleteKey?: keyof DeleteFlagsState
  ) {
    if (!file) return;

    const url = URL.createObjectURL(file);

    setPreview((prev) => ({
      ...prev,
      [key]: url,
    }));

    if (deleteKey) {
      setDeleteFlags((prev) => ({
        ...prev,
        [deleteKey]: false,
      }));
    }
  }

  function toggleDelete(
    key: keyof DeleteFlagsState,
    previewKey?: keyof PreviewState,
    restoreValue?: string | null
  ) {
    setDeleteFlags((prev) => {
      const nextValue = !prev[key];

      if (previewKey && nextValue) {
        setPreview((prevPreview) => ({
          ...prevPreview,
          [previewKey]: null,
        }));
      }

      if (previewKey && !nextValue) {
        setPreview((prevPreview) => ({
          ...prevPreview,
          [previewKey]: restoreValue ?? null,
        }));
      }

      return {
        ...prev,
        [key]: nextValue,
      };
    });
  }

  const addTier = () => {
    setPricingTiers((prev) => [
      ...prev,
      {
        label: "",
        minPax: "",
        maxPax: "",
        roomType: "DOUBLE_TWIN",
        pricePerPerson: "",
        currency: "EUR",
        isActive: true,
      },
    ]);
  };

  const addTierPreset = (minPax: number, maxPax: number) => {
    setPricingTiers((prev) => [
      ...prev,
      {
        label: `${minPax}-${maxPax} Single`,
        minPax,
        maxPax,
        roomType: "SINGLE",
        pricePerPerson: "",
        currency: "EUR",
        isActive: true,
      },
      {
        label: `${minPax}-${maxPax} Double / Twin`,
        minPax,
        maxPax,
        roomType: "DOUBLE_TWIN",
        pricePerPerson: "",
        currency: "EUR",
        isActive: true,
      },
      {
        label: `${minPax}-${maxPax} Triple`,
        minPax,
        maxPax,
        roomType: "TRIPLE",
        pricePerPerson: "",
        currency: "EUR",
        isActive: true,
      },
    ]);
  };

  const updateTier = <K extends keyof PricingTierFormValue>(
    index: number,
    field: K,
    value: PricingTierFormValue[K]
  ) => {
    setPricingTiers((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const removeTier = (index: number) => {
    setPricingTiers((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="space-y-8 rounded-lg border bg-white p-6"
    >
      <input
        type="hidden"
        name="deleteMainImage"
        value={String(deleteFlags.mainImage)}
      />
      <input
        type="hidden"
        name="deleteImage2"
        value={String(deleteFlags.image2)}
      />
      <input
        type="hidden"
        name="deleteImage3"
        value={String(deleteFlags.image3)}
      />
      <input
        type="hidden"
        name="deleteImage4"
        value={String(deleteFlags.image4)}
      />
      <input
        type="hidden"
        name="deleteMapImage"
        value={String(deleteFlags.mapImage)}
      />
      <input
        type="hidden"
        name="deleteBrochure"
        value={String(deleteFlags.brochure)}
      />

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
              <option value="Private Tour">Private Tour</option>
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
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated.
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
              placeholder="Faith-Based, Heritage, UNESCO"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated.
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
              placeholder="Catholic, Biblical, Small Group"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated.
            </p>
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
            <label
              htmlFor="whyWeOfferThisTour"
              className="text-sm font-medium"
            >
              Why We Offer This Tour
            </label>
            <textarea
              id="whyWeOfferThisTour"
              name="whyWeOfferThisTour"
              defaultValue={initialValues?.whyWeOfferThisTour ?? ""}
              className="mt-1 w-full rounded border p-2"
              rows={4}
              placeholder="Explain why this package was designed, what makes it valuable, and how it reflects the company’s tour philosophy."
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
          <h2 className="text-lg font-semibold">Pricing Setup</h2>
          <p className="text-sm text-muted-foreground">
            Keep all pricing decisions in one place. Scheduled departures use
            departure date prices. Private pricing is defined below.
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

            <p className="mt-2 text-xs text-muted-foreground">
              {
                pricingTypeOptions.find((option) => option.value === pricingType)
                  ?.help
              }
            </p>
          </div>

          <div className="rounded-md border bg-slate-50 p-4 text-sm">
            <div className="font-medium text-[#001F3F]">Pricing Note</div>
            <p className="mt-1 text-muted-foreground">
              All scheduled departure prices should be entered as{" "}
              <strong>price per person in double room</strong>.
            </p>
          </div>

          {(pricingType === "FIXED_GROUP" || pricingType === "FIT_FIXED") && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 md:col-span-2">
              Scheduled / fixed departure tours should use the{" "}
              <strong>Departure Dates</strong> section as the main selling price
              source. Enter each departure price as{" "}
              <strong>per person in double room</strong>.
            </div>
          )}

          {isQuoteDriven && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 md:col-span-2">
              This pricing type is quote-oriented. You can still define private
              rate guidance below if useful, but final selling can remain on
              request.
            </div>
          )}

          {showPrivatePricing && (
            <div className="space-y-4 rounded-md border p-4 md:col-span-2">
              <div>
                <h3 className="font-medium">Private Tour Pricing (1–8 Pax)</h3>
                <p className="text-xs text-muted-foreground">
                  Enter private tour prices as{" "}
                  <strong>price per person in double room</strong>.
                </p>
              </div>

              <input
                type="hidden"
                name="privatePricing"
                value={privatePricingJson}
              />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {(["1", "2", "3", "4", "5", "6", "7", "8"] as const).map(
                  (pax) => (
                    <div key={pax} className="rounded border p-3">
                      <label className="text-sm font-medium">{pax} pax</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={privatePricing[pax]}
                        onChange={(e) =>
                          setPrivatePricing((prev) => ({
                            ...prev,
                            [pax]: e.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded border p-2"
                        placeholder="Price per person"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {showPricingTiers && (
            <div className="space-y-4 rounded-md border p-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Advanced Pricing Tiers</h3>
                  <p className="text-xs text-muted-foreground">
                    Use brackets like 1–2 pax, 3–5 pax, or room-type-based
                    pricing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addTier}
                  className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-800"
                >
                  + Add Tier
                </button>
              </div>

              <PricingTierPresetHelper onApply={addTierPreset} />

              <input
                type="hidden"
                name="pricingTiers"
                value={pricingTiersJson}
              />

              {pricingTiers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No pricing tiers added.
                </p>
              )}

              {pricingTiers.map((tier, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded border p-3 md:grid-cols-6"
                >
                  <input
                    type="text"
                    placeholder="Label"
                    value={tier.label ?? ""}
                    onChange={(e) =>
                      updateTier(index, "label", e.target.value)
                    }
                    className="rounded border p-2"
                  />

                  <input
                    type="number"
                    placeholder="Min Pax"
                    value={tier.minPax}
                    onChange={(e) =>
                      updateTier(
                        index,
                        "minPax",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="rounded border p-2"
                  />

                  <input
                    type="number"
                    placeholder="Max Pax"
                    value={tier.maxPax}
                    onChange={(e) =>
                      updateTier(
                        index,
                        "maxPax",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="rounded border p-2"
                  />

                  <select
                    value={tier.roomType}
                    onChange={(e) =>
                      updateTier(index, "roomType", e.target.value as RoomType)
                    }
                    className="rounded border p-2"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="DOUBLE_TWIN">Double / Twin</option>
                    <option value="TRIPLE">Triple</option>
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={tier.pricePerPerson}
                    onChange={(e) =>
                      updateTier(
                        index,
                        "pricePerPerson",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="rounded border p-2"
                  />

                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="rounded border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>

                  <div className="md:col-span-6 grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Currency"
                      value={tier.currency}
                      onChange={(e) =>
                        updateTier(index, "currency", e.target.value)
                      }
                      className="rounded border p-2"
                    />

                    <label className="flex items-center gap-2 rounded border p-2">
                      <input
                        type="checkbox"
                        checked={tier.isActive}
                        onChange={(e) =>
                          updateTier(index, "isActive", e.target.checked)
                        }
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="hidden"
          name="requiresQuote"
          value={
            isQuoteDriven
              ? "true"
              : String(initialValues?.requiresQuote ?? false)
          }
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Tour Content</h2>
          <p className="text-sm text-muted-foreground">
            Use quick presets wherever possible to save time and keep tours
            consistent.
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
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {highlightPresets.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setHighlights((prev) => appendPreset(prev, item))
                  }
                  className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="inclusions" className="text-sm font-medium">
              Inclusions
            </label>
            <textarea
              id="inclusions"
              name="inclusions"
              value={inclusions}
              onChange={(e) => setInclusions(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {inclusionPresets.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setInclusions((prev) => appendPreset(prev, item))
                  }
                  className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="exclusions" className="text-sm font-medium">
              Exclusions
            </label>
            <textarea
              id="exclusions"
              name="exclusions"
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {exclusionPresets.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setExclusions((prev) => appendPreset(prev, item))
                  }
                  className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="accommodations" className="text-sm font-medium">
              Accommodations
            </label>
            <textarea
              id="accommodations"
              name="accommodations"
              value={accommodations}
              onChange={(e) => setAccommodations(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              rows={3}
              placeholder="Comma-separated"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {accommodationPresets.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setAccommodations((prev) => appendPreset(prev, item))
                  }
                  className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                >
                  + {item}
                </button>
              ))}
            </div>
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
          <h2 className="text-lg font-semibold">Media & Files</h2>
          <p className="text-sm text-muted-foreground">
            Upload images and documents. You can preview before saving and remove
            current media when editing.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Main Image</label>

            {preview.main && !deleteFlags.mainImage &&
              renderPreviewImage(
                preview.main,
                "Main image preview",
                "mt-2 h-48 w-full rounded border object-cover"
              )}

            {mode === "edit" && initialImages?.mainImageUrl && (
              <label className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <input
                  type="checkbox"
                  checked={deleteFlags.mainImage}
                  onChange={() =>
                    toggleDelete(
                      "mainImage",
                      "main",
                      initialImages.mainImageUrl ?? null
                    )
                  }
                />
                Delete current main image
              </label>
            )}

            <input
              type="file"
              name="mainImage"
              accept="image/*"
              className="mt-2 w-full rounded border p-2"
              onChange={(e) =>
                handlePreview(e.target.files?.[0] || null, "main", "mainImage")
              }
            />
          </div>

          {galleryFieldConfig.map((field) => (
            <div key={field.inputName}>
              <label className="text-sm font-medium">{field.label}</label>

              {preview[field.previewKey] && !deleteFlags[field.deleteKey] &&
                renderPreviewImage(
                  preview[field.previewKey],
                  field.alt,
                  "mt-2 h-32 w-full rounded border object-cover"
                )}

              {mode === "edit" && initialImages?.[field.initialImageKey] && (
                <label className="mt-3 flex items-center gap-2 text-sm text-red-600">
                  <input
                    type="checkbox"
                    checked={deleteFlags[field.deleteKey]}
                    onChange={() =>
                      toggleDelete(
                        field.deleteKey,
                        field.previewKey,
                        initialImages[field.initialImageKey] ?? null
                      )
                    }
                  />
                  Delete current {field.label.toLowerCase()}
                </label>
              )}

              <input
                type="file"
                name={field.inputName}
                accept="image/*"
                className="mt-2 w-full rounded border p-2"
                onChange={(e) =>
                  handlePreview(
                    e.target.files?.[0] || null,
                    field.previewKey,
                    field.deleteKey
                  )
                }
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium">Map Image</label>

            {preview.map && !deleteFlags.mapImage &&
              renderPreviewImage(
                preview.map,
                "Map preview",
                "mt-2 h-32 w-full rounded border object-cover"
              )}

            {mode === "edit" && initialImages?.mapImageUrl && (
              <label className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <input
                  type="checkbox"
                  checked={deleteFlags.mapImage}
                  onChange={() =>
                    toggleDelete(
                      "mapImage",
                      "map",
                      initialImages.mapImageUrl ?? null
                    )
                  }
                />
                Delete current map image
              </label>
            )}

            <input
              type="file"
              name="mapImage"
              accept="image/*"
              className="mt-2 w-full rounded border p-2"
              onChange={(e) =>
                handlePreview(e.target.files?.[0] || null, "map", "mapImage")
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Brochure (PDF)</label>

            {mode === "edit" && initialImages?.brochureUrl && !deleteFlags.brochure && (
              <a
                href={initialImages.brochureUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-sm text-blue-600 underline"
              >
                View current brochure
              </a>
            )}

            {mode === "edit" && initialImages?.brochureUrl && (
              <label className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <input
                  type="checkbox"
                  checked={deleteFlags.brochure}
                  onChange={() =>
                    setDeleteFlags((prev) => ({
                      ...prev,
                      brochure: !prev.brochure,
                    }))
                  }
                />
                Delete current brochure
              </label>
            )}

            <input
              type="file"
              name="brochure"
              accept="application/pdf"
              className="mt-2 w-full rounded border p-2"
              onChange={() =>
                setDeleteFlags((prev) => ({
                  ...prev,
                  brochure: false,
                }))
              }
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

          {!isQuoteDriven && (
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