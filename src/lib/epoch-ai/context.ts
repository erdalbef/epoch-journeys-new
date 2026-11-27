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
  const contains = { contains: q, mode: "insensitive" as const };
  if (type === "supplier") {
    const records = await db.supplier.findMany({
      where: q ? { OR: [{ name: contains }, { city: contains }, { code: contains }] } : undefined,
      select: { id: true, name: true, city: true, country: true, status: true },
      orderBy: q ? { name: "asc" } : { updatedAt: "desc" },
      take: 10,
    });
    return records.map((r) => ({
      id: r.id,
      label: r.name,
      detail: [r.city, r.country, r.status].filter(Boolean).join(" · "),
    }));
  }
  const select = {
    id: true, title: true, quoteReference: true, quoteNumber: true,
    status: true, destination: true, tour: { select: { title: true } },
  } as const;
  const numberMatch = q.match(/^(?:quot(?:e|ation)\s*)?#?\s*(\d+)$/i);
  const quoteNumber = numberMatch ? Number(numberMatch[1]) : 0;
  const exact = quoteNumber > 0 && quoteNumber <= 2_147_483_647
    ? await db.quote.findUnique({ where: { quoteNumber }, select })
    : null;
  const records = exact ? [exact] : await db.quote.findMany({
    where: q ? {
      OR: [
        { title: contains },
        { quoteReference: contains },
        { destination: contains },
        { recipientName: contains },
        { agentName: contains },
        { clientName: contains },
        { tour: { is: { title: contains } } },
      ],
    } : undefined,
    select,
    orderBy: [{ updatedAt: "desc" }, { quoteNumber: "desc" }],
    take: 10,
  });
  return records.map((record) => ({
    id: record.id,
    label: `${record.quoteReference ?? `#${record.quoteNumber}`} · ${record.title ?? record.tour?.title ?? "Untitled quotation"}`,
    detail: [record.destination, record.status].filter(Boolean).join(" · "),
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
