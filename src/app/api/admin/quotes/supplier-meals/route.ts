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

type EffectiveMealStatus =
  | "COMPLETE"
  | "INCOMPLETE"
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

function roundMoney(
  value: number,
) {
  return Math.round(
    (value +
      Number.EPSILON) *
      100,
  ) / 100;
}

function rateUnitToPerPerson(
  amount: number,
  unit: SupplierRateUnit,
) {
  switch (unit) {
    case SupplierRateUnit.PER_PERSON:
    case SupplierRateUnit.PER_PERSON_PER_DAY:
    case SupplierRateUnit.PER_PERSON_PER_NIGHT:
    case SupplierRateUnit.PER_MEAL:
      return {
        value:
          amount,
        supported:
          true,
      };

    default:
      return {
        value: 0,
        supported: false,
      };
  }
}

function paxMatches(
  minPax: number | null,
  maxPax: number | null,
  pax: number | null,
) {
  if (!pax) {
    return true;
  }

  if (
    minPax !== null &&
    pax < minPax
  ) {
    return false;
  }

  if (
    maxPax !== null &&
    pax > maxPax
  ) {
    return false;
  }

  return true;
}

function effectiveMealCost({
  baseAmount,
  baseUnit,

  beveragePackageIncluded,
  beveragePackageAmount,
  beveragePackageUnit,

  taxIncluded,
  taxRate,
}: {
  baseAmount: number;
  baseUnit: SupplierRateUnit;

  beveragePackageIncluded: boolean | null;
  beveragePackageAmount: number | null;
  beveragePackageUnit: SupplierRateUnit | null;

  taxIncluded: boolean;
  taxRate: number | null;
}) {
  const base =
    rateUnitToPerPerson(
      baseAmount,
      baseUnit,
    );

  if (!base.supported) {
    return {
      basePerPerson:
        null,
      beveragePerPerson:
        null,
      taxPerPerson:
        null,
      effectivePerPerson:
        null,
      status:
        "UNSUPPORTED_UNIT" as EffectiveMealStatus,
    };
  }

  let beveragePerPerson =
    0;

  let beverageComplete =
    true;

  if (
    beveragePackageIncluded !==
    true
  ) {
    if (
      beveragePackageAmount ===
        null ||
      beveragePackageUnit ===
        null
    ) {
      beverageComplete =
        false;
    } else {
      const beverage =
        rateUnitToPerPerson(
          beveragePackageAmount,
          beveragePackageUnit,
        );

      if (
        !beverage.supported
      ) {
        return {
          basePerPerson:
            roundMoney(
              base.value,
            ),
          beveragePerPerson:
            null,
          taxPerPerson:
            null,
          effectivePerPerson:
            null,
          status:
            "UNSUPPORTED_UNIT" as EffectiveMealStatus,
        };
      }

      beveragePerPerson =
        beverage.value;
    }
  }

  const subtotal =
    base.value +
    beveragePerPerson;

  let taxPerPerson =
    0;

  let taxComplete =
    true;

  if (!taxIncluded) {
    if (
      taxRate === null
    ) {
      taxComplete =
        false;
    } else {
      const normalizedTaxRate =
        taxRate > 1
          ? taxRate / 100
          : taxRate;

      taxPerPerson =
        subtotal *
        normalizedTaxRate;
    }
  }

  const complete =
    beverageComplete &&
    taxComplete;

  return {
    basePerPerson:
      roundMoney(
        base.value,
      ),

    beveragePerPerson:
      beverageComplete
        ? roundMoney(
            beveragePerPerson,
          )
        : null,

    taxPerPerson:
      taxComplete
        ? roundMoney(
            taxPerPerson,
          )
        : null,

    effectivePerPerson:
      complete
        ? roundMoney(
            subtotal +
              taxPerPerson,
          )
        : null,

    status:
      complete
        ? ("COMPLETE" as EffectiveMealStatus)
        : ("INCOMPLETE" as EffectiveMealStatus),
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

    const referenceStart =
      startDate ??
      endDate ??
      new Date();

    const referenceEnd =
      endDate ??
      startDate ??
      referenceStart;

    /*
     * Important:
     * Do NOT apply quote-date or pax filters inside the Prisma rate query.
     *
     * We need the complete active rate history for each restaurant service so
     * we can:
     * 1. choose rates valid for the requested dates and pax; or
     * 2. if none are valid, return the latest historical rate as an estimate.
     */
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
                  SupplierServiceType.MEAL,

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
                  SupplierServiceType.MEAL,

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
                name:
                  "asc",
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
                      validTo:
                        "desc",
                    },
                    {
                      amount:
                        "asc",
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

                    mealBasis:
                      true,

                    minPax: true,
                    maxPax: true,

                    taxIncluded:
                      true,
                    taxRate:
                      true,
                    taxNotes:
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

                    rateRestrictions:
                      true,

                    cancellationTerms:
                      true,
                    paymentTerms:
                      true,

                    supplierReference:
                      true,
                    lastVerifiedAt:
                      true,
                    notes:
                      true,
                  },
                },
              },
            },
          },
        },
      );

    const meals =
      suppliers
        .flatMap(
          (supplier) =>
            supplier.services.flatMap(
              (service) => {
                const validRates =
                  service.rates.filter(
                    (rate) =>
                      rate.validFrom <=
                        referenceStart &&
                      rate.validTo >=
                        referenceEnd &&
                      paxMatches(
                        rate.minPax,
                        rate.maxPax,
                        pax,
                      ),
                  );

                const selectedRates =
                  validRates.length >
                  0
                    ? validRates
                    : service.rates
                        .filter(
                          (rate) =>
                            rate.validTo <
                            referenceStart,
                        )
                        .sort(
                          (
                            a,
                            b,
                          ) =>
                            b.validTo.getTime() -
                            a.validTo.getTime(),
                        )
                        .slice(
                          0,
                          1,
                        );

                return selectedRates.map(
                  (rate) => {
                    const rateValidity =
                      rate.validFrom <=
                        referenceStart &&
                      rate.validTo >=
                        referenceEnd &&
                      paxMatches(
                        rate.minPax,
                        rate.maxPax,
                        pax,
                      )
                        ? "VALID_FOR_REQUEST"
                        : "EXPIRED_ESTIMATE";

                    const baseAmount =
                      decimalNumber(
                        rate.amount,
                      ) ?? 0;

                    const beveragePackageAmount =
                      decimalNumber(
                        rate.beveragePackageAmount,
                      );

                    const taxRate =
                      decimalNumber(
                        rate.taxRate,
                      );

                    const effectiveCost =
                      effectiveMealCost(
                        {
                          baseAmount,
                          baseUnit:
                            rate.unit,

                          beveragePackageIncluded:
                            rate.beveragePackageIncluded,
                          beveragePackageAmount,
                          beveragePackageUnit:
                            rate.beveragePackageUnit,

                          taxIncluded:
                            rate.taxIncluded,
                          taxRate,
                        },
                      );

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

                        mealBasis:
                          rate.mealBasis,

                        minPax:
                          rate.minPax,
                        maxPax:
                          rate.maxPax,

                        taxIncluded:
                          rate.taxIncluded,
                        taxRate,
                        taxNotes:
                          rate.taxNotes,

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

                        rateRestrictions:
                          rate.rateRestrictions,

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

                      effectiveCost,
                    };
                  },
                );
              },
            ),
        )
        .sort(
          (
            a,
            b,
          ) => {
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
                .effectivePerPerson ??
              Number.POSITIVE_INFINITY;

            const bCost =
              b.effectiveCost
                .effectivePerPerson ??
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

        meals,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "QUOTE_SUPPLIER_MEALS_GET_ERROR",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Could not load supplier meal rates.",
      },
      {
        status: 500,
      },
    );
  }
}
