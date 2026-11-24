import "server-only";

import { db } from "@/lib/db";

export type EpochAiContextType = "supplier" | "quote" | "none";

export type ContextOption = {
  id: string;
  label: string;
  detail: string;
};

export function isContextType(value: unknown): value is EpochAiContextType {
  return value === "none" || value === "supplier" || value === "quote";
}

export async function findEpochAiRecords(
  type: "supplier" | "quote",
  rawQuery: string,
): Promise<ContextOption[]> {
  const q = rawQuery.trim().slice(0, 80);
  if (q.length < 2) return [];
  if (type === "supplier") {
    const records = await db.supplier.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, city: true, country: true, status: true },
      orderBy: { name: "asc" },
      take: 10,
    });
    return records.map((r) => ({
      id: r.id,
      label: r.name,
      detail: [r.city, r.country, r.status].filter(Boolean).join(" · "),
    }));
  }
  const records = await db.quote.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { quoteReference: { contains: q, mode: "insensitive" } },
        { destination: { contains: q, mode: "insensitive" } },
        { recipientName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true, title: true, quoteReference: true, quoteNumber: true,
      status: true, destination: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  return records.map((r) => ({
    id: r.id,
    label: `${r.quoteReference ?? `#${r.quoteNumber}`} · ${r.title ?? "Untitled quotation"}`,
    detail: [r.destination, r.status].filter(Boolean).join(" · "),
  }));
}

export async function loadEpochAiContext(
  type: EpochAiContextType,
  id: string,
): Promise<string | null> {
  if (type === "none") return null;
  if (!id || id.length > 128) throw new Error("Select a record from the results.");
  if (type === "supplier") {
    const supplier = await db.supplier.findUnique({
      where: { id },
      select: {
        id: true, name: true, type: true, city: true, country: true,
        status: true, preferred: true, defaultCurrency: true, paymentTerms: true,
        cancellationTerms: true,
        services: {
          select: { name: true, type: true, city: true, isActive: true },
          take: 40,
        },
        rates: {
          select: {
            name: true, amount: true, currency: true, unit: true,
            roomType: true, mealBasis: true, validFrom: true, validTo: true,
            cityTaxIncluded: true, cityTaxAmount: true, cityTaxUnit: true,
            dinnerAmount: true, dinnerUnit: true,
            porterageAmount: true, porterageUnit: true,
            beveragePackageAmount: true, beveragePackageUnit: true,
            isActive: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 35,
        },
      },
    });
    if (!supplier) throw new Error("Supplier was not found.");
    const formatted = {
      id: supplier.id, name: supplier.name, type: supplier.type,
      city: supplier.city, country: supplier.country, status: supplier.status,
      preferred: supplier.preferred, currency: supplier.defaultCurrency,
      paymentTerms: supplier.paymentTerms,
      cancellationTerms: supplier.cancellationTerms,
      services: supplier.services,
      rates: supplier.rates.map((rate) => ({
        ...rate,
        amount: rate.amount.toString(),
        cityTaxAmount: rate.cityTaxAmount?.toString() ?? null,
        dinnerAmount: rate.dinnerAmount?.toString() ?? null,
        porterageAmount: rate.porterageAmount?.toString() ?? null,
        beveragePackageAmount: rate.beveragePackageAmount?.toString() ?? null,
      })),
    };
    return `SUPPLIER CRM SNAPSHOT (read-only; ${supplier.rates.length} recent rates max; may be incomplete):\n${JSON.stringify(formatted)}`;
  }
  const quote = await db.quote.findUnique({
    where: { id },
    select: {
      id: true, title: true, quoteReference: true, quoteNumber: true,
      status: true, currency: true, destination: true, groupSize: true,
      travelDates: true, subtotal: true, taxTotal: true,
      totalAmount: true, validUntil: true,
      quoteBuilderSummary: true,
    },
  });
  if (!quote) throw new Error("Quotation was not found.");
  const { quoteBuilderSummary, ...basic } = quote;
  const summary = JSON.stringify(quoteBuilderSummary ?? {});
  return `QUOTATION DATABASE SNAPSHOT (read-only; summary may be truncated):\n${JSON.stringify(basic)}\nSaved builder summary: ${summary.slice(0, 22_000)}${summary.length > 22_000 ? " [TRUNCATED]" : ""}`;
}
