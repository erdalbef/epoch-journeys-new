import {
  Role,
  SupplierRateUnit,
  SupplierServiceType,
  SupplierStatus,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type EffectiveCostStatus =
  | "COMPLETE"
  | "INCOMPLETE"
  | "CURRENCY_MISMATCH"
  | "UNSUPPORTED_UNIT";

function clean(
  value: string | null,
) {
  return value?.trim() ?? "";
}

function optionalDate(
  value: string | null,
) {
  const cleaned =
    clean(value);

  if (!cleaned) {
    return null;
  }

  const parsed =
    new Date(
      `${cleaned}T00:00:00.000Z`,
    );

  return Number.isNaN(
    parsed.getTime(),
  )
    ? null
    : parsed;
}

function optionalPositiveInteger(
  value: string | null,
) {
  const cleaned =
    clean(value);

  if (!cleaned) {
    return null;
  }

  const parsed =
    Number(cleaned);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function decimalNumber(
  value:
    | {
        toString(): string;
      }
    | number
    | string
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    Number(
      typeof value === "object"
        ? value.toString()
        : value,
    );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/**
 * This endpoint returns per-person, per-night costs. Do not interpret
 * per-stay, per-day or per-meal rates as nightly rates without duration.
 */
function unitToPerPersonPerNight(
  amount: number,
  unit: SupplierRateUnit,
  occupancy: 1 | 2 | 3,
) {
  switch (unit) {
    case SupplierRateUnit.PER_PERSON_PER_NIGHT:
      return { value: amount, supported: true };
    case SupplierRateUnit.PER_ROOM_PER_NIGHT:
      return { value: amount / occupancy, supported: true };
    default:
      return { value: 0, supported: false };
  }
}

/** Optional extras are zero unless a charge is explicitly supplied.
 * Required extras are incomplete when their amount or unit is missing.
 */
function componentCost({
  amount,
  unit,
  occupancy,
  included,
  required = false,
}: {
  amount: number | null;
  unit: SupplierRateUnit | null;
  occupancy: 1 | 2 | 3;
  included: boolean | null;
  required?: boolean;
}) {
  if (included === true) {
    return { cost: 0, complete: true, supported: true };
  }
  if (amount === null && !required) {
    return { cost: 0, complete: true, supported: true };
  }
  if (amount === null || unit === null) {
    return { cost: 0, complete: false, supported: true };
  }
  const converted = unitToPerPersonPerNight(amount, unit, occupancy);
  return {
    cost: converted.value,
    complete: converted.supported,
    supported: converted.supported,
  };
}

function isHalfBoard(mealBasis: string | null): boolean {
  const basis = (mealBasis ?? "").trim().toUpperCase();
  return basis === "HB" || basis === "HALF BOARD" || basis === "HALF_BOARD" || basis === "HALF-BOARD";
}

function roundMoney(
  value: number,
) {
  return Math.round(
    (value +
      Number.EPSILON) *
      100,
  ) / 100;
}

function effectiveHotelCost({
  occupancy,
  currency,
  baseAmount,
  baseUnit,
  dinnerIncluded,
  mealBasis,
  dinnerAmount,
  dinnerUnit,
  cityTaxIncluded,
  cityTaxAmount,
  cityTaxCurrency,
  cityTaxUnit,
}: {
  occupancy: 1 | 2 | 3;
  currency: string;
  baseAmount: number;
  baseUnit: SupplierRateUnit;

  dinnerIncluded: boolean | null;
  mealBasis: string | null;
  dinnerAmount: number | null;
  dinnerUnit: SupplierRateUnit | null;

  cityTaxIncluded: boolean;
  cityTaxAmount: number | null;
  cityTaxCurrency: string | null;
  cityTaxUnit: SupplierRateUnit | null;

  porterageAvailable: boolean | null;
  porterageIncluded: boolean | null;
  porterageAmount: number | null;
  porterageUnit: SupplierRateUnit | null;

  beveragePackageIncluded: boolean | null;
  beveragePackageAmount: number | null;
  beveragePackageUnit: SupplierRateUnit | null;
}) {
  // Do not treat a missing/zero supplier room price as a quoted 0 EUR rate.
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return { amount: null, status: "INCOMPLETE" as EffectiveCostStatus };
  }

  const base =
    unitToPerPersonPerNight(
      baseAmount,
      baseUnit,
      occupancy,
    );

  if (!base.supported) {
    return {
      amount: null,
      status:
        "UNSUPPORTED_UNIT" as EffectiveCostStatus,
    };
  }

  // A BB rate with an available HB supplement remains BB until HB is
  // explicitly indicated. Never add dinner twice when it is included.
  const hbRequested = isHalfBoard(mealBasis);
  const dinner = componentCost({
    amount: hbRequested ? dinnerAmount : null,
    unit: hbRequested ? dinnerUnit : null,
    occupancy,
    included: dinnerIncluded === true || !hbRequested,
    required: hbRequested && dinnerIncluded !== true,
  });

  const hasAdditionalCityTax =
    cityTaxIncluded !== true &&
    cityTaxAmount !== null &&
    cityTaxAmount > 0;

  const cityTaxCurrencyMismatch =
    hasAdditionalCityTax &&
    Boolean(
      cityTaxCurrency &&
        cityTaxCurrency.toUpperCase() !==
          currency.toUpperCase(),
    );

  // City tax is independently reviewable: a missing tax unit or a tax
  // in a different currency must NOT hide a valid contracted ROOM price.
  // A compatible per-night tax is added exactly once; an unresolved tax
  // is excluded from this estimate and visibly flagged by the API/UI.
  const cityTaxCanBeCosted =
    hasAdditionalCityTax &&
    !cityTaxCurrencyMismatch &&
    (cityTaxUnit === SupplierRateUnit.PER_PERSON_PER_NIGHT ||
      cityTaxUnit === SupplierRateUnit.PER_ROOM_PER_NIGHT);

  const cityTax =
    componentCost({
      amount: cityTaxCanBeCosted ? cityTaxAmount : null,
      unit: cityTaxCanBeCosted ? cityTaxUnit : null,
      occupancy,
      included: !cityTaxCanBeCosted,
    });

  // Porterage and beverage packages are optional ancillary services.
  // Their PER_PERSON / PER_MEAL units cannot safely be treated as nightly
  // amounts without knowing the number of nights or meals selected.
  // Keep their original amounts in the API response, but exclude them from
  // the automatically calculated accommodation cost.
  const parts = [dinner, cityTax];

  if (
    parts.some(
      (part) =>
        !part.supported,
    )
  ) {
    return {
      amount: null,
      status:
        "UNSUPPORTED_UNIT" as EffectiveCostStatus,
    };
  }

  if (
    parts.some(
      (part) =>
        !part.complete,
    )
  ) {
    return {
      amount: null,
      status:
        "INCOMPLETE" as EffectiveCostStatus,
    };
  }

  return {
    amount:
      roundMoney(
        base.value +
          dinner.cost +
          cityTax.cost,
      ),
    status:
      "COMPLETE" as EffectiveCostStatus,
  };
}

export async function GET(
  request: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
      session.user.role !==
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const city =
      clean(
        searchParams.get(
          "city",
        ),
      );

    const country =
      clean(
        searchParams.get(
          "country",
        ),
      );

    const startDate =
      optionalDate(
        searchParams.get(
          "startDate",
        ),
      );

    const endDate =
      optionalDate(
        searchParams.get(
          "endDate",
        ),
      );

    const pax =
      optionalPositiveInteger(
        searchParams.get(
          "pax",
        ),
      );

    if (!city) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "City is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      searchParams.get(
        "startDate",
      ) &&
      !startDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid startDate. Use YYYY-MM-DD.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      searchParams.get(
        "endDate",
      ) &&
      !endDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid endDate. Use YYYY-MM-DD.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      startDate &&
      endDate &&
      endDate <
        startDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "endDate cannot be earlier than startDate.",
        },
        {
          status: 400,
        },
      );
    }

    const coverageStart =
      startDate ??
      endDate;

    const coverageEnd =
      endDate ??
      startDate;

    const suppliers =
      await db.supplier.findMany(
        {
          where: {
            status:
              SupplierStatus.ACTIVE,

            services: {
              some: {
                isActive:
                  true,

                type:
                  SupplierServiceType.ACCOMMODATION,

                city: {
                  equals:
                    city,
                  mode:
                    "insensitive",
                },

                ...(country
                  ? {
                      country:
                        {
                          equals:
                            country,
                          mode:
                            "insensitive",
                        },
                    }
                  : {}),
              },
            },
          },

          select: {
            id: true,
            name: true,
            code: true,
            preferred: true,
            rating: true,
            country: true,
            city: true,
            defaultCurrency:
              true,

            services: {
              where: {
                isActive:
                  true,

                type:
                  SupplierServiceType.ACCOMMODATION,

                city: {
                  equals:
                    city,
                  mode:
                    "insensitive",
                },

                ...(country
                  ? {
                      country:
                        {
                          equals:
                            country,
                          mode:
                            "insensitive",
                        },
                    }
                  : {}),
              },

              orderBy: {
                name: "asc",
              },

              select: {
                id: true,
                name: true,
                description:
                  true,
                country: true,
                city: true,
                notes: true,

                rates: {
                  where: {
                    isActive:
                      true,

                  },

                  orderBy: [
                    {
                      amount:
                        "asc",
                    },
                    {
                      validTo:
                        "desc",
                    },
                    {
                      name:
                        "asc",
                    },
                  ],

                  select: {
                    id: true,
                    supplierId:
                      true,
                    serviceId:
                      true,
                    name: true,
                    description:
                      true,

                    validFrom:
                      true,
                    validTo:
                      true,

                    currency:
                      true,
                    amount: true,
                    unit: true,

                    roomType:
                      true,
                    mealBasis:
                      true,

                    minPax: true,
                    maxPax: true,

                    breakfastIncluded:
                      true,

                    dinnerIncluded:
                      true,
                    dinnerAmount:
                      true,
                    dinnerUnit:
                      true,
                    dinnerNotes:
                      true,

                    cityTaxIncluded:
                      true,
                    cityTaxAmount:
                      true,
                    cityTaxCurrency:
                      true,
                    cityTaxUnit:
                      true,

                    porterageAvailable:
                      true,
                    porterageIncluded:
                      true,
                    porterageAmount:
                      true,
                    porterageUnit:
                      true,

                    beveragePackageIncluded:
                      true,
                    beveragePackageDescription:
                      true,
                    beveragePackageAmount:
                      true,
                    beveragePackageUnit:
                      true,
                    beverageNotes:
                      true,

                    freePlaces:
                      true,
                    freePlaceRatio:
                      true,
                    freePlaceMax:
                      true,
                    freePlaceNotes:
                      true,

                    minimumRooms:
                      true,
                    minimumNights:
                      true,
                    rateRestrictions:
                      true,

                    singleSupplement:
                      true,
                    tripleReduction:
                      true,

                    cancellationTerms:
                      true,
                    paymentTerms:
                      true,

                    supplierReference:
                      true,
                    lastVerifiedAt:
                      true,
                    notes: true,
                  },
                },
              },
            },
          },
        },
      );

    // Show all ACTIVE supplier rates, even when they do not cover the
    // requested itinerary dates. Non-covering dates require reconfirmation.
    // Combine Single/Double/Twin records only when their contract date ranges
    // overlap AND their commercial terms match. Never silently mix unrelated
    // contract seasons or differing tax and meal conditions.
    type HotelRate = (typeof suppliers)[number]["services"][number]["rates"][number];

    const referenceStart = coverageStart ?? new Date();
    const referenceEnd = coverageEnd ?? referenceStart;

    const withinTravelAndPax = (item: HotelRate) =>
      item.validFrom <= referenceStart &&
      item.validTo >= referenceEnd &&
      (!pax ||
        ((item.minPax === null || item.minPax <= pax) &&
          (item.maxPax === null || item.maxPax >= pax)));

    const sameCommercialTerms = (a: HotelRate, b: HotelRate) =>
      a.currency === b.currency &&
      a.unit === b.unit &&
      a.mealBasis === b.mealBasis &&
      a.minPax === b.minPax &&
      a.maxPax === b.maxPax &&
      a.breakfastIncluded === b.breakfastIncluded &&
      a.cityTaxIncluded === b.cityTaxIncluded &&
      String(a.cityTaxAmount) === String(b.cityTaxAmount) &&
      a.cityTaxCurrency === b.cityTaxCurrency &&
      a.cityTaxUnit === b.cityTaxUnit &&
      a.dinnerIncluded === b.dinnerIncluded &&
      String(a.dinnerAmount) === String(b.dinnerAmount) &&
      a.dinnerUnit === b.dinnerUnit &&
      a.porterageIncluded === b.porterageIncluded &&
      String(a.porterageAmount) === String(b.porterageAmount) &&
      a.porterageUnit === b.porterageUnit &&
      a.beveragePackageIncluded === b.beveragePackageIncluded &&
      String(a.beveragePackageAmount) === String(b.beveragePackageAmount) &&
      a.beveragePackageUnit === b.beveragePackageUnit;

    const sameRatePeriodForQuote = (a: HotelRate, b: HotelRate) =>
      a.validFrom <= b.validTo && b.validFrom <= a.validTo;

    const matchingHotelOffer = (a: HotelRate, b: HotelRate) =>
      sameCommercialTerms(a, b) && sameRatePeriodForQuote(a, b);

    const hotels =
      suppliers
        .flatMap(
          (supplier) =>
            supplier.services.flatMap(
              (service) =>
                service.rates
                  // Room-specific supplier rates are separate records. Return one
                  // comparison card per compatible rate set, not one per room.
                  .filter((rate, _index, candidates) => {
                    if (rate.roomType === null || rate.roomType === "DOUBLE_TWIN") return true;
                    // Keep each Double/Twin rate card (including different
                    // seasons). Hide only room-specific rows represented by
                    // a compatible Double/Twin or Single rate card.
                    if (candidates.some((other) =>
                      other.roomType === "DOUBLE_TWIN" && matchingHotelOffer(rate, other)
                    )) return false;
                    if (rate.roomType === "SINGLE") return true;
                    return !candidates.some((other) =>
                      other.roomType === "SINGLE" && matchingHotelOffer(rate, other)
                    );
                  })
                  .map(
                  (rate) => {
                    const referenceStart =
                      coverageStart ??
                      new Date();

                    const referenceEnd =
                      coverageEnd ??
                      referenceStart;

                    const baseAmount =
                      decimalNumber(
                        rate.amount,
                      ) ?? 0;

                    const dinnerAmount =
                      decimalNumber(
                        rate.dinnerAmount,
                      );

                    const cityTaxAmount =
                      decimalNumber(
                        rate.cityTaxAmount,
                      );

                    const porterageAmount =
                      decimalNumber(
                        rate.porterageAmount,
                      );

                    const beveragePackageAmount =
                      decimalNumber(
                        rate.beveragePackageAmount,
                      );

                    const singleSupplement =
                      decimalNumber(
                        rate.singleSupplement,
                      );

                    const tripleReduction =
                      decimalNumber(
                        rate.tripleReduction,
                      );

                    // Only use the price recorded for the matching room type.
                    // Legacy records without roomType retain their prior behavior.
                    const matchingRoomRate = (roomType: "SINGLE" | "DOUBLE_TWIN" | "TRIPLE") => {
                      if (rate.roomType === null || rate.roomType === roomType) return rate;
                      const candidates = service.rates.filter((other) =>
                        other.roomType === roomType && matchingHotelOffer(rate, other)
                      );
                      // Prefer covering contracts; otherwise prefer the most
                      // recent historical rate without inventing a price.
                      return candidates.sort((a, b) =>
                        Number(withinTravelAndPax(b)) - Number(withinTravelAndPax(a)) ||
                        b.validTo.getTime() - a.validTo.getTime()
                      )[0] ?? null;
                    };
                    const referencedRoomRates = rate.roomType === null
                      ? [rate]
                      : ([matchingRoomRate("SINGLE"), matchingRoomRate("DOUBLE_TWIN"), matchingRoomRate("TRIPLE")]
                          .filter((item): item is HotelRate => item !== null));
                    // Preserve the existing two-state field for saved quotes,
                    // but use it for ANY out-of-date/pax-mismatched estimate.
                    const rateValidity = referencedRoomRates.every(withinTravelAndPax)
                      ? "VALID_FOR_REQUEST"
                      : "EXPIRED_ESTIMATE";
                    const unresolvedCityTax = referencedRoomRates.some((roomRate) => {
                      if (roomRate.cityTaxIncluded ||
                          (decimalNumber(roomRate.cityTaxAmount) ?? 0) <= 0) return false;
                      return !(
                        (roomRate.cityTaxUnit === SupplierRateUnit.PER_PERSON_PER_NIGHT ||
                         roomRate.cityTaxUnit === SupplierRateUnit.PER_ROOM_PER_NIGHT) &&
                        (!roomRate.cityTaxCurrency ||
                         roomRate.cityTaxCurrency.toUpperCase() === roomRate.currency.toUpperCase())
                      );
                    });

                    const calculateRoom = (roomType: "SINGLE" | "DOUBLE_TWIN" | "TRIPLE", occupancy: 1 | 2 | 3) => {
                      const roomRate = matchingRoomRate(roomType);
                      if (!roomRate) {
                        return { amount: null, status: "INCOMPLETE" as EffectiveCostStatus };
                      }
                      return effectiveHotelCost({
                        occupancy,
                        currency: roomRate.currency,
                        baseAmount: decimalNumber(roomRate.amount) ?? 0,
                        baseUnit: roomRate.unit,
                        dinnerIncluded: roomRate.dinnerIncluded,
                        mealBasis: roomRate.mealBasis,
                        dinnerAmount: decimalNumber(roomRate.dinnerAmount),
                        dinnerUnit: roomRate.dinnerUnit,
                        cityTaxIncluded: roomRate.cityTaxIncluded,
                        cityTaxAmount: decimalNumber(roomRate.cityTaxAmount),
                        cityTaxCurrency: roomRate.cityTaxCurrency,
                        cityTaxUnit: roomRate.cityTaxUnit,
                        porterageAvailable: roomRate.porterageAvailable,
                        porterageIncluded: roomRate.porterageIncluded,
                        porterageAmount: decimalNumber(roomRate.porterageAmount),
                        porterageUnit: roomRate.porterageUnit,
                        beveragePackageIncluded: roomRate.beveragePackageIncluded,
                        beveragePackageAmount: decimalNumber(roomRate.beveragePackageAmount),
                        beveragePackageUnit: roomRate.beveragePackageUnit,
                      });
                    };
                    const singleEffective = calculateRoom("SINGLE", 1);
                    const doubleEffective = calculateRoom("DOUBLE_TWIN", 2);
                    const tripleEffective = calculateRoom("TRIPLE", 3);

                    const adjustedSingleEffective =
                      singleEffective.amount === null
                        ? singleEffective
                        : {
                            ...singleEffective,
                            amount: roundMoney(
                              singleEffective.amount +
                                (rate.roomType === null ? (singleSupplement ?? 0) : 0),
                            ),
                          };

                    const adjustedTripleEffective =
                      tripleEffective.amount === null
                        ? tripleEffective
                        : {
                            ...tripleEffective,
                            amount: roundMoney(
                              Math.max(
                                0,
                                tripleEffective.amount -
                                  (rate.roomType === null ? (tripleReduction ?? 0) : 0),
                              ),
                            ),
                          };

                    return {
                      supplier: {
                        id:
                          supplier.id,
                        name:
                          supplier.name,
                        code:
                          supplier.code,
                        preferred:
                          supplier.preferred,
                        rating:
                          supplier.rating,
                        country:
                          supplier.country,
                        city:
                          supplier.city,
                        defaultCurrency:
                          supplier.defaultCurrency,
                      },

                      service: {
                        id:
                          service.id,
                        name:
                          service.name,
                        description:
                          service.description,
                        country:
                          service.country,
                        city:
                          service.city,
                        notes:
                          service.notes,
                      },

                      rate: {
                        id:
                          rate.id,
                        name:
                          rate.name,
                        description:
                          rate.description,

                        validFrom:
                          rate.validFrom.toISOString(),
                        validTo:
                          rate.validTo.toISOString(),

                        currency:
                          rate.currency,
                        amount:
                          baseAmount,
                        unit:
                          rate.unit,

                        roomType:
                          rate.roomType,
                        mealBasis:
                          rate.mealBasis,

                        minPax:
                          rate.minPax,
                        maxPax:
                          rate.maxPax,

                        breakfastIncluded:
                          rate.breakfastIncluded,

                        dinnerIncluded:
                          rate.dinnerIncluded,
                        dinnerAmount,
                        dinnerUnit:
                          rate.dinnerUnit,
                        dinnerNotes:
                          rate.dinnerNotes,

                        cityTaxIncluded:
                          rate.cityTaxIncluded,
                        cityTaxAmount,
                        cityTaxCurrency:
                          rate.cityTaxCurrency,
                        cityTaxUnit:
                          rate.cityTaxUnit,

                        porterageAvailable:
                          rate.porterageAvailable,
                        porterageIncluded:
                          rate.porterageIncluded,
                        porterageAmount,
                        porterageUnit:
                          rate.porterageUnit,

                        beveragePackageIncluded:
                          rate.beveragePackageIncluded,
                        beveragePackageDescription:
                          rate.beveragePackageDescription,
                        beveragePackageAmount,
                        beveragePackageUnit:
                          rate.beveragePackageUnit,
                        beverageNotes:
                          rate.beverageNotes,

                        freePlaces:
                          rate.freePlaces,
                        freePlaceRatio:
                          rate.freePlaceRatio,
                        freePlaceMax:
                          rate.freePlaceMax,
                        freePlaceNotes:
                          rate.freePlaceNotes,

                        minimumRooms:
                          rate.minimumRooms,
                        minimumNights:
                          rate.minimumNights,
                        rateRestrictions:
                          rate.rateRestrictions,

                        singleSupplement,
                        tripleReduction,

                        cancellationTerms:
                          rate.cancellationTerms,
                        paymentTerms:
                          rate.paymentTerms,

                        supplierReference:
                          rate.supplierReference,

                        lastVerifiedAt:
                          rate.lastVerifiedAt
                            ? rate.lastVerifiedAt.toISOString()
                            : null,

                        notes:
                          rate.notes,
                      },

                      rateValidity,

                      requiresReconfirmation:
                        rateValidity ===
                        "EXPIRED_ESTIMATE",
                      cityTaxNeedsReview: unresolvedCityTax,

                      effectiveCost: {
                        singlePerPersonPerNight:
                          adjustedSingleEffective.amount,

                        doubleTwinPerPersonPerNight:
                          doubleEffective.amount,

                        triplePerPersonPerNight:
                          adjustedTripleEffective.amount,

                        singleStatus:
                          adjustedSingleEffective.status,

                        doubleTwinStatus:
                          doubleEffective.status,

                        tripleStatus:
                          adjustedTripleEffective.status,

                        currency:
                          rate.currency,
                      },
                    };
                  },
                ),
            ),
        )
        .sort(
          (a, b) => {
            if (
              a.rateValidity !==
              b.rateValidity
            ) {
              return a.rateValidity ===
                "VALID_FOR_REQUEST"
                ? -1
                : 1;
            }

            if (
              a.supplier.preferred !==
              b.supplier.preferred
            ) {
              return a.supplier.preferred
                ? -1
                : 1;
            }

            const aCost =
              a.effectiveCost
                .doubleTwinPerPersonPerNight ??
              Number.POSITIVE_INFINITY;

            const bCost =
              b.effectiveCost
                .doubleTwinPerPersonPerNight ??
              Number.POSITIVE_INFINITY;

            if (
              aCost !==
              bCost
            ) {
              return (
                aCost -
                bCost
              );
            }

            const supplierCompare =
              a.supplier.name.localeCompare(
                b.supplier.name,
              );

            if (
              supplierCompare !==
              0
            ) {
              return supplierCompare;
            }

            return a.rate.name.localeCompare(
              b.rate.name,
            );
          },
        );

    return NextResponse.json(
      {
        ok: true,

        query: {
          city,
          country:
            country || null,

          startDate:
            startDate
              ? startDate.toISOString()
              : null,

          endDate:
            endDate
              ? endDate.toISOString()
              : null,

          pax,
        },

        hotels,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "QUOTE_SUPPLIER_HOTELS_GET_ERROR",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Could not load supplier hotels.",
      },
      {
        status: 500,
      },
    );
  }
}


