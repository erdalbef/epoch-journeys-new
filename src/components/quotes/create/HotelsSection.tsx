"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  Search,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { hotelExtraDisplay, hotelExtraOverlapWarnings, type HotelExtraService } from "@/lib/quotes/hotelExtraDisplay";

type HotelRow = {
  hotelName: string;
  destination: string;
  nights: number;
  singlePerPerson: number;
  doubleTwinPerPerson: number;
  triplePerPerson: number;
  stayType: "CORE" | "PRE" | "POST";

  supplierId?: string;
  supplierName?: string;
  supplierPreferred?: boolean;
  supplierServiceId?: string;
  supplierRateId?: string;
  supplierRateName?: string;
  supplierRateCurrency?: string;
  supplierRateValidFrom?: string;
  supplierRateValidTo?: string;
  supplierRateValidity?:
    | "VALID_FOR_REQUEST"
    | "EXPIRED_ESTIMATE";
  supplierRateRequiresReconfirmation?: boolean;
  supplierMealBasis?: string | null;
  // Frozen supplier cost components for BB/HB comparison.
  supplierSelectedMealBasis?: "BB" | "HB";
  supplierBaseSinglePerNight?: number;
  supplierBaseDoubleTwinPerNight?: number;
  supplierBaseTriplePerNight?: number;
  supplierDinnerIncluded?: boolean | null;
  supplierDinnerAmount?: number | null;
  supplierDinnerUnit?: string | null;
  supplierCityTaxCurrency?: string | null;
  supplierCityTaxUnit?: string | null;
  supplierCityTaxIncluded?: boolean | null;
  supplierCityTaxAmount?: number | null;
  supplierPorterageIncluded?: boolean | null;
  supplierPorterageAvailable?: boolean | null;
  supplierPorterageAmount?: number | null;
  supplierPorterageUnit?: string | null;
  supplierBeveragePackageIncluded?: boolean | null;
  supplierBeveragePackageAmount?: number | null;
  supplierBeveragePackageUnit?: string | null;
  supplierBeveragePackageDescription?: string | null;
  // Group-specific choices. Supplier contract prices remain unchanged.
  supplierDinnerSelected?: boolean;
  supplierDinnerMeals?: number;
  supplierPorterageSelected?: boolean;
  supplierBeverageSelected?: boolean;
  supplierBeverageMeals?: number;
};

type SupplierHotelResult = {
  supplier: {
    id: string;
    name: string;
    code: string | null;
    preferred: boolean;
    rating: number | null;
    country: string | null;
    city: string | null;
    defaultCurrency: string;
  };

  service: {
    id: string;
    name: string;
    description: string | null;
    country: string | null;
    city: string | null;
    notes: string | null;
  };

  rate: {
    id: string;
    name: string;
    description: string | null;
    validFrom: string;
    validTo: string;
    currency: string;
    amount: number;
    unit: string;
    roomType: string | null;
    mealBasis: string | null;
    minPax: number | null;
    maxPax: number | null;
    breakfastIncluded: boolean | null;
    dinnerIncluded: boolean | null;
    dinnerAmount: number | null;
    dinnerUnit: string | null;
    dinnerNotes: string | null;
    cityTaxIncluded: boolean;
    cityTaxAmount: number | null;
    cityTaxCurrency: string | null;
    cityTaxUnit: string | null;
    porterageAvailable: boolean | null;
    porterageIncluded: boolean | null;
    porterageAmount: number | null;
    porterageUnit: string | null;
    beveragePackageIncluded: boolean | null;
    beveragePackageDescription: string | null;
    beveragePackageAmount: number | null;
    beveragePackageUnit: string | null;
    beverageNotes: string | null;
    freePlaces: string | null;
    freePlaceRatio: number | null;
    freePlaceMax: number | null;
    freePlaceNotes: string | null;
    minimumRooms: number | null;
    minimumNights: number | null;
    rateRestrictions: string | null;
    singleSupplement: number | null;
    tripleReduction: number | null;
    cancellationTerms: string | null;
    paymentTerms: string | null;
    supplierReference: string | null;
    lastVerifiedAt: string | null;
    notes: string | null;
  };

  rateValidity:
    | "VALID_FOR_REQUEST"
    | "EXPIRED_ESTIMATE";
  requiresReconfirmation: boolean;

  effectiveCost: {
    singlePerPersonPerNight: number | null;
    doubleTwinPerPersonPerNight: number | null;
    triplePerPersonPerNight: number | null;
    singleStatus: string;
    doubleTwinStatus: string;
    tripleStatus: string;
    currency: string;
  };
};

type Props = {
  hotels: HotelRow[];
  /** Other services already selected in this quotation; review-only overlap detection. */
  perPersonServices?: HotelExtraService[];
  currency: string;

  startDate: string;
  endDate: string;
  payingPassengers: number;

  onAddHotel: () => void;
  onRemoveHotel: (index: number) => void;

  onUpdateHotel: (
    index: number,
    patch: Partial<HotelRow>,
  ) => void;

  hotelCostPerPerson: (
    row: HotelRow,
    occupancy:
      | "single"
      | "doubleTwin"
      | "triple",
  ) => number;

  formatMoney: (
    amount: number,
    currency?: string,
  ) => string;

  toNumber: (
    value: unknown,
  ) => number;
};

type SearchState = {
  loading: boolean;
  error: string;
  results: SupplierHotelResult[];
  searchedCity: string;
};

const rowBackgrounds = [
  "bg-amber-50/70 border-amber-200",
  "bg-emerald-50/60 border-emerald-200",
  "bg-white border-slate-200",
  "bg-blue-50/60 border-blue-200",
];

const rowHeaderBackgrounds = [
  "bg-amber-100/60 border-amber-200",
  "bg-emerald-100/50 border-emerald-200",
  "bg-slate-50 border-slate-200",
  "bg-blue-100/50 border-blue-200",
];

function getStayBadge(
  stayType: HotelRow["stayType"],
) {
  switch (stayType) {
    case "PRE":
      return {
        label: "PRE-STAY",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "POST":
      return {
        label: "POST-STAY",
        className:
          "bg-purple-100 text-purple-800",
      };

    case "CORE":
    default:
      return {
        label: "CORE",
        className:
          "bg-blue-100 text-blue-800",
      };
  }
}

function displayDate(
  value: string,
) {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (!match) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function rateUnitLabel(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function roomCostAvailable(value: number | null, status: string) {
  return value !== null && Number.isFinite(value) && status === "COMPLETE";
}

function hasUsableRoomCost(result: SupplierHotelResult) {
  const cost = result.effectiveCost;
  return (
    roomCostAvailable(cost.singlePerPersonPerNight, cost.singleStatus) ||
    roomCostAvailable(cost.doubleTwinPerPersonPerNight, cost.doubleTwinStatus) ||
    roomCostAvailable(cost.triplePerPersonPerNight, cost.tripleStatus)
  );
}

export default function HotelsSection({
  hotels,
  perPersonServices = [],
  currency,
  startDate,
  endDate,
  payingPassengers,
  onAddHotel,
  onRemoveHotel,
  onUpdateHotel,
  hotelCostPerPerson,
  formatMoney,
  toNumber,
}: Props) {
  const [
    searchStates,
    setSearchStates,
  ] = useState<
    Record<
      number,
      SearchState
    >
  >({});

  const safePax =
    useMemo(
      () =>
        Math.max(
          Math.floor(
            toNumber(
              payingPassengers,
            ),
          ),
          1,
        ),
      [
        payingPassengers,
        toNumber,
      ],
    );

  async function searchSupplierHotels(
    index: number,
    destination: string,
  ) {
    const city =
      destination.trim();

    if (!city) {
      toast.error(
        "Enter a destination/city first.",
      );
      return;
    }

    setSearchStates(
      (prev) => ({
        ...prev,
        [index]: {
          loading: true,
          error: "",
          results:
            prev[index]
              ?.results ??
            [],
          searchedCity:
            city,
        },
      }),
    );

    try {
      const params =
        new URLSearchParams(
          {
            city,
            pax:
              String(
                safePax,
              ),
          },
        );

      if (
        startDate
      ) {
        params.set(
          "startDate",
          startDate,
        );
      }

      if (
        endDate
      ) {
        params.set(
          "endDate",
          endDate,
        );
      }

      const response =
        await fetch(
          `/api/admin/quotes/supplier-hotels?${params.toString()}`,
          {
            method:
              "GET",
            cache:
              "no-store",
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () =>
              null,
          )) as {
          ok?: boolean;
          error?: string;
          hotels?: SupplierHotelResult[];
        } | null;

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            "Unable to load supplier hotels.",
        );
      }

      const results =
        data.hotels ??
        [];

      setSearchStates(
        (prev) => ({
          ...prev,
          [index]: {
            loading: false,
            error: "",
            results,
            searchedCity:
              city,
          },
        }),
      );

      if (
        results.length ===
        0
      ) {
        toast.info(
          `No valid or historical hotel rates found for ${city}.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Unable to load supplier hotels.";

      setSearchStates(
        (prev) => ({
          ...prev,
          [index]: {
            loading: false,
            error:
              message,
            results: [],
            searchedCity:
              city,
          },
        }),
      );

      toast.error(
        message,
      );
    }
  }

  function selectSupplierHotel(
    index: number,
    result: SupplierHotelResult,
  ) {
    if (
      result.rate.currency.toUpperCase() !==
      currency.toUpperCase()
    ) {
      toast.error(
        `This supplier rate is in ${result.rate.currency}, while the quote is in ${currency}. Currency conversion is not automatic.`,
      );

      return;
    }

    if (
      !hasUsableRoomCost(
        result,
      )
    ) {
      toast.error(
        "No usable room rate is available. Review the supplier rate before using it.",
      );

      return;
    }

    onUpdateHotel(
      index,
      {
        hotelName:
          result.supplier
            .name,

        destination:
          result.service
            .city ||
          result.supplier
            .city ||
          hotels[index]
            ?.destination ||
          "",

        singlePerPerson:
          result
            .effectiveCost
            .singlePerPersonPerNight ??
          0,

        doubleTwinPerPerson:
          result
            .effectiveCost
            .doubleTwinPerPersonPerNight ??
          0,

        triplePerPerson:
          result
            .effectiveCost
            .triplePerPersonPerNight ??
          0,

        supplierId:
          result.supplier
            .id,

        supplierName:
          result.supplier
            .name,

        supplierPreferred:
          result.supplier
            .preferred,

        supplierServiceId:
          result.service
            .id,

        supplierRateId:
          result.rate.id,

        supplierRateName:
          result.rate.name,

        supplierRateCurrency:
          result.rate
            .currency,

        supplierRateValidFrom:
          result.rate
            .validFrom,

        supplierRateValidTo:
          result.rate
            .validTo,

        supplierRateValidity:
          result.rateValidity,

        supplierRateRequiresReconfirmation:
          result.requiresReconfirmation,

        supplierMealBasis:
          result.rate
            .mealBasis,
        supplierSelectedMealBasis: /^(HB|HALF[ _-]?BOARD)$/i.test(result.rate.mealBasis || "") ? "HB" : "BB",
        supplierBaseSinglePerNight: result.effectiveCost.singlePerPersonPerNight ?? 0,
        supplierBaseDoubleTwinPerNight: result.effectiveCost.doubleTwinPerPersonPerNight ?? 0,
        supplierBaseTriplePerNight: result.effectiveCost.triplePerPersonPerNight ?? 0,
        supplierDinnerIncluded: result.rate.dinnerIncluded,
        supplierDinnerAmount: result.rate.dinnerAmount,
        supplierDinnerUnit: result.rate.dinnerUnit,
        supplierCityTaxCurrency: result.rate.cityTaxCurrency,
        supplierCityTaxUnit: result.rate.cityTaxUnit,

        supplierCityTaxIncluded:
          result.rate
            .cityTaxIncluded,

        supplierCityTaxAmount:
          result.rate
            .cityTaxAmount,

        supplierPorterageIncluded:
          result.rate
            .porterageIncluded,
        supplierPorterageAvailable: result.rate.porterageAvailable,
        supplierPorterageAmount: result.rate.porterageAmount,
        supplierPorterageUnit: result.rate.porterageUnit,

        supplierBeveragePackageIncluded:
          result.rate
            .beveragePackageIncluded,
        supplierBeveragePackageAmount: result.rate.beveragePackageAmount,
        supplierBeveragePackageUnit: result.rate.beveragePackageUnit,

        supplierBeveragePackageDescription:
          result.rate
            .beveragePackageDescription,
        supplierDinnerSelected: false,
        supplierDinnerMeals: 0,
        supplierPorterageSelected: false,
        supplierBeverageSelected: false,
        supplierBeverageMeals: 0,
      },
    );

    if (
      result.rateValidity ===
      "EXPIRED_ESTIMATE"
    ) {
      toast.warning(
        `${result.supplier.name} / ${result.rate.name} selected as an estimate. Reconfirm the rate before booking.`,
      );
    } else {
      toast.success(
        `${result.supplier.name} / ${result.rate.name} selected.`,
      );
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="flex flex-col gap-3 bg-[#001F3F] px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Hotels
          </h2>

          <p className="mt-1 max-w-4xl text-xs text-slate-200">
            Select accommodation and hotel-provided extras at Supplier CRM prices. Dinner, drinks and porterage from restaurants or other providers belong in Standard Per-Person Services. Mandatory city tax is shown separately without being charged twice.
          </p>
        </div>

        <button
          type="button"
          onClick={
            onAddHotel
          }
          className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          + Add Hotel
        </button>
      </div>

      <div className="space-y-5 p-5">
        {hotels.map(
          (
            row,
            index,
          ) => {
            const extraDisplay = hotelExtraDisplay(row);
            const hasPricedHotelExtras = extraDisplay.dinner || extraDisplay.porterage || extraDisplay.drinks;
            const overlapWarnings = hotelExtraOverlapWarnings(row, perPersonServices);
            const supplierIncludesHB = /^(HB|HALF[ _-]?BOARD)$/i.test(row.supplierMealBasis || "") || row.supplierDinnerIncluded === true;
            const hasLegacyHbUpgrade = Boolean(row.supplierRateId && row.supplierSelectedMealBasis === "HB" && !supplierIncludesHB);

            const singleTotal =
              hotelCostPerPerson(
                row,
                "single",
              );

            const doubleTwinTotal =
              hotelCostPerPerson(
                row,
                "doubleTwin",
              );

            const tripleTotal =
              hotelCostPerPerson(
                row,
                "triple",
              );

            const colorIndex =
              index %
              rowBackgrounds.length;

            const rowBackground =
              rowBackgrounds[
                colorIndex
              ];

            const rowHeaderBackground =
              rowHeaderBackgrounds[
                colorIndex
              ];

            const stayBadge =
              getStayBadge(
                row.stayType,
              );

            const searchState =
              searchStates[
                index
              ];

            return (
              <div
                key={
                  index
                }
                className={`overflow-hidden rounded-xl border-2 shadow-sm ${rowBackground}`}
              >
                <div
                  className={`flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between ${rowHeaderBackground}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                        Row{" "}
                        {index +
                          1}
                      </span>

                      <div className="font-semibold text-[#001F3F]">
                        {row.hotelName ||
                          row.destination ||
                          "Hotel"}
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${stayBadge.className}`}
                      >
                        {
                          stayBadge.label
                        }
                      </span>

                      {row.supplierPreferred && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                          <Star className="h-3 w-3 fill-current" />
                          Preferred
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {row.stayType ===
                      "CORE"
                        ? "Included in the main tour costing"
                        : row.stayType ===
                            "PRE"
                          ? "Optional pre-stay accommodation"
                          : "Optional post-stay accommodation"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">
                        Single:{" "}
                      </span>

                      <span className="font-semibold">
                        {row.supplierRateId && row.singlePerPerson <= 0 ? "Not available" : formatMoney(singleTotal, currency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500">
                        Double/Twin:{" "}
                      </span>

                      <span className="font-semibold">
                        {row.supplierRateId && row.doubleTwinPerPerson <= 0 ? "Not available" : formatMoney(doubleTwinTotal, currency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500">
                        Triple:{" "}
                      </span>

                      <span className="font-semibold">
                        {row.supplierRateId && row.triplePerPerson <= 0 ? "Not available" : formatMoney(tripleTotal, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                      <label className="block flex-1">
                        <span className="mb-1 block text-sm font-medium">
                          Destination / City
                        </span>

                        <input
                          className="w-full rounded-md border bg-white p-2"
                          value={
                            row.destination
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateHotel(
                              index,
                              {
                                destination:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          placeholder="e.g. Fatima"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          searchSupplierHotels(
                            index,
                            row.destination,
                          )
                        }
                        disabled={
                          searchState?.loading
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#001F3F] px-4 text-sm font-semibold text-white transition hover:bg-[#002d59] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Search className="h-4 w-4" />

                        {searchState?.loading
                          ? "Searching..."
                          : "Find Supplier Hotels"}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Search uses the quote dates
                      {startDate
                        ? ` (${startDate}${endDate ? ` to ${endDate}` : ""})`
                        : ""}
                      {" "}and {safePax} paying pilgrims when available.
                    </p>

                    {searchState?.error && (
                      <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                        {
                          searchState.error
                        }
                      </p>
                    )}

                    {searchState &&
                      !searchState.loading &&
                      searchState.results.length >
                        0 && (
                        <div className="mt-4 space-y-3">
                          <div className="text-sm font-semibold text-slate-800">
                            Available supplier rates for{" "}
                            {
                              searchState.searchedCity
                            }
                          </div>

                          {searchState.results.map(
                            (
                              result,
                            ) => {
                              const complete =
                                hasUsableRoomCost(
                                  result,
                                );

                              const sameCurrency =
                                result.rate.currency.toUpperCase() ===
                                currency.toUpperCase();

                              return (
                                <div
                                  key={`${result.supplier.id}-${result.service.id}-${result.rate.id}`}
                                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                >
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-[#001F3F]">
                                          {
                                            result.supplier.name
                                          }
                                        </span>

                                        {result.supplier.preferred && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                                            <Star className="h-3 w-3 fill-current" />
                                            Preferred
                                          </span>
                                        )}

                                        {result.rateValidity ===
                                          "EXPIRED_ESTIMATE" && (
                                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
                                            Expired · Estimate only
                                          </span>
                                        )}

                                        {result.supplier.rating !==
                                          null && (
                                          <span className="text-xs text-slate-500">
                                            Rating:{" "}
                                            {
                                              result.supplier.rating
                                            }
                                            /5
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-1 text-sm text-slate-600">
                                        {
                                          result.rate.name
                                        }
                                        {" · "}
                                        {
                                          result.rate.mealBasis ||
                                          "Meal basis not specified"
                                        }
                                        {" · "}
                                        {rateUnitLabel(
                                          result.rate.unit,
                                        )}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        Valid{" "}
                                        {displayDate(
                                          result.rate.validFrom,
                                        )}
                                        {" - "}
                                        {displayDate(
                                          result.rate.validTo,
                                        )}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={
                                        !complete ||
                                        !sameCurrency
                                      }
                                      onClick={() =>
                                        selectSupplierHotel(
                                          index,
                                          result,
                                        )
                                      }
                                      className="rounded-md bg-[#8B0000] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#760000] disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                      {result.rateValidity ===
                                      "EXPIRED_ESTIMATE"
                                        ? "Use as Estimate"
                                        : "Use This Rate"}
                                    </button>
                                  </div>

                                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <RateBox
                                      label="Single"
                                      value={
                                        result
                                          .effectiveCost
                                          .singlePerPersonPerNight
                                      }
                                      status={
                                        result
                                          .effectiveCost
                                          .singleStatus
                                      }
                                      currency={
                                        result.rate.currency
                                      }
                                      formatMoney={
                                        formatMoney
                                      }
                                    />

                                    <RateBox
                                      label="Double/Twin"
                                      value={
                                        result
                                          .effectiveCost
                                          .doubleTwinPerPersonPerNight
                                      }
                                      status={
                                        result
                                          .effectiveCost
                                          .doubleTwinStatus
                                      }
                                      currency={
                                        result.rate.currency
                                      }
                                      formatMoney={
                                        formatMoney
                                      }
                                    />

                                    <RateBox
                                      label="Triple"
                                      value={
                                        result
                                          .effectiveCost
                                          .triplePerPersonPerNight
                                      }
                                      status={
                                        result
                                          .effectiveCost
                                          .tripleStatus
                                      }
                                      currency={
                                        result.rate.currency
                                      }
                                      formatMoney={
                                        formatMoney
                                      }
                                    />
                                  </div>

                                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                                    {((result.rate.dinnerIncluded === true) || /^(HB|HALF[ _-]?BOARD)$/i.test(result.rate.mealBasis || "")) && (
                                      <Info label="Meal basis" value="Half Board — dinner included" />
                                    )}
                                    {(result.rate.cityTaxIncluded || result.rate.cityTaxAmount != null) && (
                                      <Info label="City tax" value={result.rate.cityTaxIncluded ? "Included" : `${formatMoney(Number(result.rate.cityTaxAmount), result.rate.cityTaxCurrency || result.rate.currency)} / ${result.rate.cityTaxUnit ? rateUnitLabel(result.rate.cityTaxUnit) : "unit not specified"}`} />
                                    )}
                                    {result.rate.porterageIncluded === true && (
                                      <Info label="Porterage" value="Included in hotel rate" />
                                    )}
                                    {result.rate.beveragePackageIncluded === true && (
                                      <Info label="Drinks" value="Included in hotel rate" />
                                    )}
                                  </div>

                                  {result.rateValidity ===
                                    "EXPIRED_ESTIMATE" && (
                                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                                      This rate does not cover the requested travel dates. It is the latest historical rate available and may be used only as an estimate. Reconfirm with the supplier before booking.
                                    </p>
                                  )}

                                  {!sameCurrency && (
                                    <p className="mt-3 text-xs font-medium text-amber-700">
                                      Rate currency is{" "}
                                      {
                                        result.rate.currency
                                      }
                                      , while this quote is{" "}
                                      {
                                        currency
                                      }
                                      . Automatic currency conversion is disabled.
                                    </p>
                                  )}

                                  {!complete && (
                                    <p className="mt-3 text-xs font-medium text-amber-700">
                                      No usable room rate is available. Review the supplier rate before using it.
                                    </p>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Stay Type
                      </span>

                      <select
                        className="w-full rounded-md border bg-white p-2"
                        value={
                          row.stayType
                        }
                        onChange={(
                          event,
                        ) =>
                          onUpdateHotel(
                            index,
                            {
                              stayType:
                                event
                                  .target
                                  .value as HotelRow["stayType"],
                            },
                          )
                        }
                      >
                        <option value="CORE">
                          Core Tour Hotel
                        </option>

                        <option value="PRE">
                          Pre-Stay Add-On
                        </option>

                        <option value="POST">
                          Post-Stay Add-On
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Hotel Name
                      </span>

                      <input
                        className="w-full rounded-md border bg-white p-2"
                        value={
                          row.hotelName
                        }
                        onChange={(
                          event,
                        ) =>
                          onUpdateHotel(
                            index,
                            {
                              hotelName:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        placeholder="e.g. Hotel Regina"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Destination / City
                      </span>

                      <input
                        className="w-full rounded-md border bg-white p-2"
                        value={
                          row.destination
                        }
                        onChange={(
                          event,
                        ) =>
                          onUpdateHotel(
                            index,
                            {
                              destination:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        placeholder="e.g. Fatima"
                      />
                    </label>
                  </div>

                  {row.supplierRateId && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-900">
                          Supplier rate selected:
                        </span>

                        <span className="text-sm text-emerald-800">
                          {row.supplierName ||
                            row.hotelName}
                          {" · "}
                          {row.supplierRateName ||
                            "Rate"}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-emerald-800">
                        {row.supplierRateCurrency && (
                          <span>
                            Currency:{" "}
                            {
                              row.supplierRateCurrency
                            }
                          </span>
                        )}

                        {row.supplierMealBasis && (
                          <span>
                            Meal basis:{" "}
                            {
                              row.supplierMealBasis
                            }
                          </span>
                        )}

                        {row.supplierRateId && (
                          <span>
                            Selected: {row.supplierSelectedMealBasis || (/^(HB|HALF[ _-]?BOARD)$/i.test(row.supplierMealBasis || "") ? "HB" : "BB")}
                          </span>
                        )}
                        {row.supplierRateValidFrom &&
                          row.supplierRateValidTo && (
                            <span>
                              Valid:{" "}
                              {displayDate(
                                row.supplierRateValidFrom,
                              )}
                              {" - "}
                              {displayDate(
                                row.supplierRateValidTo,
                              )}
                            </span>
                          )}
                      </div>

                      {(row.singlePerPerson <= 0 || row.doubleTwinPerPerson <= 0 || row.triplePerPerson <= 0) && (
                        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                          Unavailable room types: {[
                            row.singlePerPerson <= 0 ? "Single" : null,
                            row.doubleTwinPerPerson <= 0 ? "Double/Twin" : null,
                            row.triplePerPerson <= 0 ? "Triple" : null,
                          ].filter(Boolean).join(", ")}. Their prices are not supplied by this hotel. Do not quote these occupancies until a valid rate is entered.
                        </p>
                      )}

                      {hasLegacyHbUpgrade && (
                        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950" role="alert">
                          <p className="font-semibold">Earlier BB-to-HB upgrade needs review</p>
                          <p className="mt-1">The saved quote contains an older HB supplement. Review it before choosing hotel dinner separately; an HB supplement and selected hotel dinners could overlap. No saved cost has been removed automatically.</p>
                        </div>
                      )}

                      {row.supplierRateId && hasPricedHotelExtras && (
                        <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
                          <p className="font-semibold text-slate-900">Hotel-contracted optional services</p>
                          <p className="text-xs text-slate-600">These are supplier CRM hotel prices for services provided by this hotel. Select only what this group requires. Dinner and drinks at restaurants or elsewhere remain in Standard Per-Person Services.</p>
                          {extraDisplay.dinner ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={Boolean(row.supplierDinnerSelected)} onChange={e => onUpdateHotel(index, { supplierDinnerSelected: e.target.checked, supplierDinnerMeals: e.target.checked ? Math.max(1, row.supplierDinnerMeals || 0) : 0 })} />
                                <span>Hotel dinners · {formatMoney(Number(row.supplierDinnerAmount), row.supplierRateCurrency || currency)} / {rateUnitLabel(row.supplierDinnerUnit || "")}</span>
                              </label>
                              <label className="flex items-center gap-2">Meals
                                <input aria-label="Number of hotel dinners" type="number" min="0" step="1" disabled={!row.supplierDinnerSelected} value={row.supplierDinnerMeals ?? 0} onChange={e => onUpdateHotel(index, { supplierDinnerMeals: Math.max(0, Math.floor(toNumber(e.target.value))) })} className="w-20 rounded border p-2" />
                              </label>
                            </div>
                          ) : null}
                          {extraDisplay.porterage ? (
                            <label className="flex items-center gap-2 rounded-md border p-3">
                              <input type="checkbox" checked={Boolean(row.supplierPorterageSelected)} onChange={e => onUpdateHotel(index, { supplierPorterageSelected: e.target.checked })} />
                              <span>Porterage · {formatMoney(Number(row.supplierPorterageAmount), row.supplierRateCurrency || currency)} / {rateUnitLabel(row.supplierPorterageUnit || "")}</span>
                            </label>
                          ) : null}
                          {extraDisplay.drinks ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={Boolean(row.supplierBeverageSelected)} onChange={e => onUpdateHotel(index, { supplierBeverageSelected: e.target.checked, supplierBeverageMeals: e.target.checked ? Math.max(1, row.supplierBeverageMeals || 0) : 0 })} />
                                <span>Drinks · {formatMoney(Number(row.supplierBeveragePackageAmount), row.supplierRateCurrency || currency)} / {rateUnitLabel(row.supplierBeveragePackageUnit || "")}</span>
                              </label>
                              <label className="flex items-center gap-2">Meals
                                <input aria-label="Number of beverage packages" type="number" min="0" step="1" disabled={!row.supplierBeverageSelected} value={row.supplierBeverageMeals ?? 0} onChange={e => onUpdateHotel(index, { supplierBeverageMeals: Math.max(0, Math.floor(toNumber(e.target.value))) })} className="w-20 rounded border p-2" />
                              </label>
                            </div>
                          ) : null}
                          <p className="rounded-md bg-sky-50 p-2 text-xs text-sky-900">Selected hotel services are added once to this hotel's quotation cost. Hotel meals are charged by the number selected, not automatically by nights. Separately arranged restaurant services stay in Per-Person Services. Check possible overlaps below.</p>
                        </div>
                      )}

                      {row.supplierRateId && (supplierIncludesHB || extraDisplay.porterageIncluded || extraDisplay.drinksIncluded) && (
                        <p className="mt-3 rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">
                          Included in supplier hotel rate: {[supplierIncludesHB ? "Dinner (HB)" : null, extraDisplay.porterageIncluded ? "Porterage" : null, extraDisplay.drinksIncluded ? "Drinks" : null].filter(Boolean).join(" · ")}. Do not enter the same service again for this hotel.
                        </p>
                      )}

                      {overlapWarnings.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3" role="status">
                          <p className="text-sm font-semibold text-amber-900">Review possible overlapping costs</p>
                          {overlapWarnings.map((warning, warningIndex) => (
                            <p key={warningIndex} className="text-xs leading-5 text-amber-900">{warning}</p>
                          ))}
                        </div>
                      )}

                      {row.supplierRateId && (
                        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
                          <p className="font-semibold text-slate-900">Hotel meal basis and taxes</p>
                          <p className="mt-2 text-xs text-slate-700">
                            Supplier meal plan: <strong>{supplierIncludesHB ? "Half Board (HB — dinner included)" : (row.supplierMealBasis || "Bed & Breakfast / confirm with supplier")}</strong>.
                            {hasLegacyHbUpgrade ? " A previous HB upgrade is retained in this saved quote until reviewed." : " Hotel-provided dinners may be selected above; restaurant dinners belong in Standard Per-Person Services."}
                          </p>
                          <p className="mt-2 text-xs text-slate-600">
                            City tax: {row.supplierCityTaxIncluded ? "included by supplier - no extra charge" : row.supplierCityTaxAmount != null ? `${formatMoney(Number(row.supplierCityTaxAmount), row.supplierCityTaxCurrency || row.supplierRateCurrency || currency)} / ${rateUnitLabel(row.supplierCityTaxUnit || "")}` : "not specified - verify with supplier"}.
                          </p>
                          {row.supplierCityTaxIncluded === false && row.supplierCityTaxAmount != null && Number(row.supplierCityTaxAmount) > 0 && (() => {
                            const amount = Number(row.supplierCityTaxAmount);
                            const unit = (row.supplierCityTaxUnit || "").toUpperCase();
                            const ppNight = unit === "PER_PERSON_PER_NIGHT" ? amount : unit === "PER_ROOM_PER_NIGHT" ? amount / 2 : null;
                            if (ppNight === null) return <p className="mt-1 text-xs text-amber-800">Verify the city-tax billing unit before relying on this rate.</p>;
                            const nights = Math.max(0, toNumber(row.nights));
                            const base = toNumber(row.doubleTwinPerPerson) - ppNight;
                            return <div className="mt-2 rounded-md bg-sky-50 p-2 text-xs text-sky-950">
                              <p className="font-semibold">City tax breakdown - Double/Twin, read-only</p>
                              <p>Room excluding city tax: {base >= 0 ? formatMoney(base, currency) : "Review manual room rate"} / traveler/night. City tax: {formatMoney(ppNight, currency)} / traveler/night x {nights} nights = {formatMoney(ppNight * nights, currency)} / traveler.</p>
                              <p className="mt-1">The city tax is already included in the displayed supplier room rate and hotel total. It is identified separately for auditing, not added again.</p>
                            </div>;
                          })()}
                        </div>
                      )}

                      {row.supplierRateRequiresReconfirmation ? (
                        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                          Estimated from expired supplier rate — reconfirm before booking.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-700">
                          The supplier/rate reference is saved with the quote snapshot. The rate fields below remain editable.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border bg-white/80 p-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Nights
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full rounded-md border bg-white p-2"
                          value={
                            row.nights
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateHotel(
                              index,
                              {
                                nights:
                                  toNumber(
                                    event
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Single / Person / Night
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={
                            row.singlePerPerson
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateHotel(
                              index,
                              {
                                singlePerPerson:
                                  toNumber(
                                    event
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Double/Twin / Person / Night
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={
                            row.doubleTwinPerPerson
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateHotel(
                              index,
                              {
                                doubleTwinPerPerson:
                                  toNumber(
                                    event
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Triple / Person / Night
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={
                            row.triplePerPerson
                          }
                          onChange={(
                            event,
                          ) =>
                            onUpdateHotel(
                              index,
                              {
                                triplePerPerson:
                                  toNumber(
                                    event
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <TotalBox
                      label="Single Hotel Cost / Person"
                      value={
                        row.supplierRateId && row.singlePerPerson <= 0 ? null : singleTotal
                      }
                      currency={
                        currency
                      }
                      formatMoney={
                        formatMoney
                      }
                    />

                    <TotalBox
                      label="Double/Twin Hotel Cost / Person"
                      value={
                        row.supplierRateId && row.doubleTwinPerPerson <= 0 ? null : doubleTwinTotal
                      }
                      currency={
                        currency
                      }
                      formatMoney={
                        formatMoney
                      }
                    />

                    <TotalBox
                      label="Triple Hotel Cost / Person"
                      value={
                        row.supplierRateId && row.triplePerPerson <= 0 ? null : tripleTotal
                      }
                      currency={
                        currency
                      }
                      formatMoney={
                        formatMoney
                      }
                    />
                  </div>

                  {row.stayType !==
                    "CORE" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="text-sm font-semibold text-amber-900">
                        Optional{" "}
                        {row.stayType ===
                        "PRE"
                          ? "Pre-Stay"
                          : "Post-Stay"}{" "}
                        Accommodation
                      </div>

                      <p className="mt-1 text-sm text-amber-800">
                        These hotel rates will be shown separately in the proposal and will not increase the main tour NET rate.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-t border-slate-300/70 pt-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-slate-600">
                      {row.stayType ===
                      "CORE"
                        ? "Included in the main tour accommodation costing."
                        : `Separate optional ${row.stayType === "PRE" ? "pre-stay" : "post-stay"} rate.`}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveHotel(
                          index,
                        )
                      }
                      disabled={
                        hotels.length ===
                        1
                      }
                      className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove Hotel
                    </button>
                  </div>
                </div>
              </div>
            );
          },
        )}

        <div className="flex justify-center border-t pt-5">
          <button
            type="button"
            onClick={
              onAddHotel
            }
            className="rounded-lg border-2 border-dashed border-[#001F3F]/30 bg-slate-50 px-8 py-3 text-sm font-semibold text-[#001F3F] transition hover:border-[#001F3F]/60 hover:bg-blue-50"
          >
            + Add Another Hotel
          </button>
        </div>
      </div>
    </section>
  );
}

function RateBox({
  label,
  value,
  status,
  currency,
  formatMoney,
}: {
  label: string;
  value: number | null;
  status: string;
  currency: string;
  formatMoney: (
    amount: number,
    currency?: string,
  ) => string;
}) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-base font-semibold text-[#001F3F]">
        {value ===
        null
          ? "Not available"
          : `${formatMoney(
              value,
              currency,
            )} pp/night`}
      </div>

      {status !== "COMPLETE" && value !== null && (
        <div className="mt-1 text-xs text-amber-700">
          {status.replaceAll("_", " ")}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <span className="font-semibold">
        {label}:
      </span>{" "}
      {value}
    </div>
  );
}

function TotalBox({
  label,
  value,
  currency,
  formatMoney,
}: {
  label: string;
  value: number | null;
  currency: string;
  formatMoney: (
    amount: number,
    currency?: string,
  ) => string;
}) {
  return (
    <div className="rounded-md border bg-white p-3 text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-semibold text-[#001F3F]">
        {value === null ? "Not available" : formatMoney(value, currency)}
      </div>
    </div>
  );
}

