import Link from "next/link";
import { Building2, Church, FileText, Plus, Search, Star } from "lucide-react";

import { db } from "@/lib/db";
import { supplierStayEventKey, supplierEventKey } from "@/lib/epoch-ai/hotelSupplierSendSafety";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    preferred?: string;
  }>;
};

function clean(value?: string) {
  return value?.trim() || "";
}

export default async function SuppliersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = clean(params.q);
  const type = clean(params.type);
  const status = clean(params.status);
  const preferred = clean(params.preferred);

  const suppliers = await db.supplier.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { legalName: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(type ? { type: type as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(preferred === "yes" ? { preferred: true } : {}),
    },
    orderBy: [{ preferred: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          contacts: true,
          services: true,
          rates: true,
          contracts: true,
          massArrangements: true,
        },
      },
    },
  });

  // Read-only hotel inquiry summary. Supplier CRM approval remains independent.
  const hotelIds = suppliers.filter((item) => item.type === "HOTEL").map((item) => item.id);
  const hotelInquiries = hotelIds.length
    ? await db.hotelInquiry.findMany({
        where: { supplierId: { in: hotelIds } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          tourId: true,
          supplierId: true,
          status: true,
          destination: true,
          checkIn: true,
          checkOut: true,
          rooms: true,
          createdAt: true,
        },
      })
    : [];

  const inquiryKeys = [...new Set(hotelInquiries.flatMap((item) => [supplierStayEventKey(item), supplierEventKey(item.id)]))];
  const sendAttempts = inquiryKeys.length
    ? await db.epochEmailOutbox.findMany({
        where: { eventKey: { in: inquiryKeys } },
        select: { id: true, eventKey: true, status: true, acceptedAt: true, createdAt: true },
      })
    : [];
  const eventRows = sendAttempts.length
    ? await db.epochSupplierDeliveryEvent.findMany({
        where: { outboxId: { in: sendAttempts.map((item) => item.id) } },
        select: { outboxId: true, type: true },
      })
    : [];
  const attemptsByKey = new Map(sendAttempts.map((item) => [item.eventKey, item]));
  const eventTypesByOutbox = new Map<string, Set<string>>();
  for (const event of eventRows) {
    const types = eventTypesByOutbox.get(event.outboxId) ?? new Set<string>();
    types.add(event.type);
    eventTypesByOutbox.set(event.outboxId, types);
  }
  const inquiriesBySupplier = new Map<string, typeof hotelInquiries>();
  for (const inquiry of hotelInquiries) {
    const rows = inquiriesBySupplier.get(inquiry.supplierId) ?? [];
    rows.push(inquiry);
    inquiriesBySupplier.set(inquiry.supplierId, rows);
  }

  const [total, preferredCount, churchCount] = await Promise.all([
    db.supplier.count(),
    db.supplier.count({ where: { preferred: true, status: "ACTIVE" } }),
    db.supplier.count({ where: { type: "CHURCH_SHRINE", status: "ACTIVE" } }),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
            Partner network
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Supplier CRM</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Store supplier contacts, contracted services, historical rates, contracts, and pilgrimage-specific church relationships.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/mass-arrangements"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <Church className="h-4 w-4" />
            Mass Arrangements
          </Link>
          <Link
            href="/admin/suppliers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New Supplier
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Building2} label="Total suppliers" value={total} />
        <Metric icon={Star} label="Preferred active" value={preferredCount} />
        <Metric icon={Church} label="Churches / shrines" value={churchCount} />
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_190px_170px_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search supplier, city, country or code..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#001F3F]/40"
          />
        </label>

        <select name="type" defaultValue={type} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">All supplier types</option>
          {["HOTEL","DMC","TRANSPORT","GUIDE","TOUR_MANAGER","RESTAURANT","CHURCH_SHRINE","ATTRACTION","TICKET_PROVIDER","AIRLINE","CRUISE","FERRY","RAIL","INSURANCE","OTHER"].map((item) => (
            <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
          ))}
        </select>

        <select name="status" defaultValue={status} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">All statuses</option>
          {["ACTIVE","INACTIVE","SUSPENDED","BLACKLISTED"].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select name="preferred" defaultValue={preferred} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">All suppliers</option>
          <option value="yes">Preferred only</option>
        </select>

        <button className="h-10 rounded-xl bg-[#001F3F] px-5 text-sm font-semibold text-white">
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">CRM</th>
                <th className="px-5 py-3">Rates</th>
                <th className="px-5 py-3">Contracts</th>
                <th className="px-5 py-3">Inquiries</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/suppliers/${supplier.id}`} className="font-semibold text-[#001F3F] hover:underline">
                        {supplier.name}
                      </Link>
                      {supplier.preferred && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{supplier.code || supplier.email || "No code"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{supplier.type.replaceAll("_", " ")}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {[supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {supplier._count.contacts} contacts · {supplier._count.services} services
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{supplier._count.rates}</td>
                  <td className="px-5 py-4 text-slate-600">{supplier._count.contracts}</td>
                  <td className="px-5 py-4 text-slate-700">
                    {supplier.type === "HOTEL" ? (() => {
                      const inquiries = inquiriesBySupplier.get(supplier.id) ?? [];
                      if (!inquiries.length) return <span className="text-slate-400">No inquiry</span>;
                      const attempted = inquiries.find((item) => attemptsByKey.has(supplierStayEventKey(item)) || attemptsByKey.has(supplierEventKey(item.id)));
                      const selected = attempted ?? inquiries[0];
                      const outbox = attemptsByKey.get(supplierStayEventKey(selected)) ?? attemptsByKey.get(supplierEventKey(selected.id));
                      const events = outbox ? eventTypesByOutbox.get(outbox.id) : undefined;
                      let label = selected.status === "APPROVED" ? "Approved - awaiting send" : "Draft";
                      let className = "text-slate-700";
                      if (outbox) {
                        const status = outbox.status.toUpperCase();
                        if (events?.has("email.bounced") || events?.has("email.complained") || events?.has("email.failed") || events?.has("email.suppressed") || ["BOUNCED", "COMPLAINED", "SUPPRESSED", "DELIVERY_FAILED"].includes(status)) {
                          label = "Delivery issue";
                          className = "text-red-800";
                        } else if (events?.has("email.delivered")) {
                          label = "Delivered (provider reported)";
                          className = "text-green-800";
                        } else if (events?.has("email.delivery_delayed")) {
                          label = "Delivery delayed";
                          className = "text-amber-800";
                        } else if (status === "ACCEPTED") {
                          label = "Quotation Requested";
                          className = "text-blue-800";
                        } else if (status === "FAILED") {
                          label = "Send failed - review";
                          className = "text-red-800";
                        } else {
                          label = "Send attempted - investigate";
                          className = "text-amber-800";
                        }
                      }
                      return (
                        <div className="min-w-[190px]">
                          <Link href={`/admin/tours/${selected.tourId}/hotel-inquiry-history`} className={`font-semibold hover:underline ${className}`}>
                            {label}
                          </Link>
                          <div className="mt-1 text-xs text-slate-500">
                            {selected.destination} · {selected.checkIn} to {selected.checkOut}
                          </div>
                          <div className="text-xs text-slate-500">{inquiries.length} saved inquiry record{inquiries.length === 1 ? "" : "s"}</div>
                        </div>
                      );
                    })() : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/suppliers/${supplier.id}`} className="font-semibold text-[#8B0000]">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center text-slate-500">
                    No suppliers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="rounded-xl bg-slate-100 p-2.5 text-[#001F3F]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-950">{value}</p>
      </div>
    </div>
  );
}
