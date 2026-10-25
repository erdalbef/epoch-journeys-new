import {
  Role,
  SupplierServiceType,
  SupplierStatus,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function param(value: string | null): string {
  return value?.trim() ?? "";
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function parsePax(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function asNumber(value: { toString(): string } | number | null): number | null {
  if (value === null) return null;
  const result = Number(value.toString());
  return Number.isFinite(result) ? result : null;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const search = new URL(request.url).searchParams;
    const city = param(search.get("city"));
    const country = param(search.get("country"));
    const query = param(search.get("q"));
    const typeInput = param(search.get("type")).toUpperCase();
    const startInput = param(search.get("startDate"));
    const endInput = param(search.get("endDate"));
    const paxInput = param(search.get("pax"));

    if (
      typeInput &&
      !Object.values(SupplierServiceType).includes(typeInput as SupplierServiceType)
    ) {
      return NextResponse.json({ ok: false, error: "Invalid service type." }, { status: 400 });
    }

    const startDate = startInput ? parseDate(startInput) : null;
    const endDate = endInput ? parseDate(endInput) : null;
    const pax = paxInput ? parsePax(paxInput) : null;

    if ((startInput && !startDate) || (endInput && !endDate)) {
      return NextResponse.json(
        { ok: false, error: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 },
      );
    }
    if (paxInput && pax === null) {
      return NextResponse.json(
        { ok: false, error: "pax must be a positive integer." },
        { status: 400 },
      );
    }
    if (startDate && endDate && endDate < startDate) {
      return NextResponse.json(
        { ok: false, error: "endDate cannot be earlier than startDate." },
        { status: 400 },
      );
    }

    const from = startDate ?? endDate;
    const to = endDate ?? startDate;

    const suppliers = await db.supplier.findMany({
      where: {
        status: SupplierStatus.ACTIVE,
        services: {
          some: {
            isActive: true,
            ...(typeInput ? { type: typeInput as SupplierServiceType } : {}),
            ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
            ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
            ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
          },
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        preferred: true,
        defaultCurrency: true,
        services: {
          where: {
            isActive: true,
            ...(typeInput ? { type: typeInput as SupplierServiceType } : {}),
            ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
            ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
            ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
          },
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            city: true,
            country: true,
            notes: true,
            rates: {
              where: { isActive: true },
              orderBy: [{ validTo: "desc" }, { validFrom: "desc" }],
              select: {
                id: true,
                name: true,
                description: true,
                validFrom: true,
                validTo: true,
                currency: true,
                amount: true,
                unit: true,
                minPax: true,
                maxPax: true,
                taxIncluded: true,
                taxRate: true,
                mealBasis: true,
                roomType: true,
                beveragePackageIncluded: true,
                beveragePackageAmount: true,
                beveragePackageUnit: true,
                freePlaces: true,
                freePlaceRatio: true,
                freePlaceMax: true,
                rateRestrictions: true,
                cancellationTerms: true,
                paymentTerms: true,
                supplierReference: true,
                lastVerifiedAt: true,
                notes: true,
              },
            },
          },
        },
      },
      orderBy: [{ preferred: "desc" }, { name: "asc" }],
    });

    const services = suppliers.flatMap((supplier) =>
      supplier.services.map((service) => {
        const rates = service.rates.map((rate) => {
          const dateMatches =
            !from || !to || (rate.validFrom <= from && rate.validTo >= to);
          const paxMatches =
            pax === null ||
            ((rate.minPax === null || pax >= rate.minPax) &&
              (rate.maxPax === null || pax <= rate.maxPax));
          const validity = !dateMatches
            ? rate.validTo < (from as Date)
              ? "EXPIRED"
              : "DATE_NOT_APPLICABLE"
            : !paxMatches
              ? "PAX_NOT_APPLICABLE"
              : from
                ? "VALID_FOR_REQUEST"
                : "DATES_NOT_CHECKED";

          return {
            ...rate,
            amount: asNumber(rate.amount),
            taxRate: asNumber(rate.taxRate),
            beveragePackageAmount: asNumber(rate.beveragePackageAmount),
            validFrom: rate.validFrom.toISOString(),
            validTo: rate.validTo.toISOString(),
            lastVerifiedAt: rate.lastVerifiedAt?.toISOString() ?? null,
            dateMatches,
            paxMatches,
            validity,
            requiresReconfirmation: validity !== "VALID_FOR_REQUEST",
          };
        });

        return {
          supplier: {
            id: supplier.id,
            name: supplier.name,
            code: supplier.code,
            preferred: supplier.preferred,
            defaultCurrency: supplier.defaultCurrency,
          },
          service: {
            id: service.id,
            name: service.name,
            type: service.type,
            description: service.description,
            city: service.city,
            country: service.country,
            notes: service.notes,
          },
          rates,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      query: {
        type: typeInput || null,
        city: city || null,
        country: country || null,
        q: query || null,
        startDate: startInput || null,
        endDate: endInput || null,
        pax,
      },
      services,
    });
  } catch (error) {
    console.error("QUOTE_SUPPLIER_SERVICES_GET_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Could not load supplier services." },
      { status: 500 },
    );
  }
}
