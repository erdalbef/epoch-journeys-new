import Link from "next/link";
import { notFound } from "next/navigation";
import { Church, FileText, Pencil, Star, Users } from "lucide-react";

import { db } from "@/lib/db";
import SupplierWorkspace from "@/components/admin/suppliers/SupplierWorkspace";

type Props = { params: Promise<{ id: string }> };

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value)
    : "—";
}

export default async function SupplierDetailPage({ params }: Props) {
  const { id } = await params;

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }] },
      services: { orderBy: [{ isActive: "desc" }, { name: "asc" }] },
      rates: {
        orderBy: [{ validFrom: "desc" }, { name: "asc" }],
        include: { service: { select: { id: true, name: true } } },
      },
      contracts: { orderBy: [{ validTo: "desc" }, { title: "asc" }] },
      massArrangements: {
        take: 8,
        orderBy: [{ massDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!supplier) notFound();

  const serialized = {
    id: supplier.id,
    contacts: supplier.contacts,
    services: supplier.services,
    rates: supplier.rates.map((rate) => ({
      ...rate,
      amount: Number(rate.amount),
      taxRate: rate.taxRate === null ? null : Number(rate.taxRate),
    })),
    contracts: supplier.contracts,
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-[#001F3F] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                {supplier.type.replaceAll("_", " ")}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                {supplier.status}
              </span>
              {supplier.preferred && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Preferred
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold">{supplier.name}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {[supplier.city, supplier.country].filter(Boolean).join(", ") || "Location not entered"}
              {supplier.code ? ` · ${supplier.code}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {supplier.type === "CHURCH_SHRINE" && (
              <Link
                href={`/admin/mass-arrangements/new?supplierId=${supplier.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F]"
              >
                <Church className="h-4 w-4" />
                Arrange Mass
              </Link>
            )}
            <Link
              href={`/admin/suppliers/${supplier.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit Supplier
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Contacts" value={supplier.contacts.length} />
        <Metric icon={FileText} label="Services" value={supplier.services.length} />
        <Metric icon={FileText} label="Contracted rates" value={supplier.rates.length} />
        <Metric icon={FileText} label="Contracts" value={supplier.contracts.length} />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">CRM overview</h2>
          <div className="mt-4 divide-y divide-slate-100 text-sm">
            <Row label="Legal name" value={supplier.legalName || "—"} />
            <Row label="Email" value={supplier.email || "—"} />
            <Row label="Phone" value={supplier.phone || "—"} />
            <Row label="Emergency" value={supplier.emergencyPhone || "—"} />
            <Row label="Website" value={supplier.website || "—"} />
            <Row label="Address" value={[supplier.address, supplier.postalCode, supplier.city, supplier.country].filter(Boolean).join(", ") || "—"} />
            <Row label="Currency" value={supplier.defaultCurrency} />
            <Row label="Tax number" value={supplier.taxNumber || "—"} />
            <Row label="Rating" value={supplier.rating ? `${supplier.rating}/5` : "—"} />
          </div>

          {(supplier.paymentTerms || supplier.cancellationTerms || supplier.notes) && (
            <div className="mt-6 space-y-4 border-t border-slate-100 pt-5 text-sm">
              {supplier.paymentTerms && <TextBlock title="Payment terms" value={supplier.paymentTerms} />}
              {supplier.cancellationTerms && <TextBlock title="Cancellation terms" value={supplier.cancellationTerms} />}
              {supplier.notes && <TextBlock title="Internal notes" value={supplier.notes} />}
            </div>
          )}
        </div>

        <SupplierWorkspace supplier={serialized} />
      </section>

      {supplier.massArrangements.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Recent Mass arrangements</h2>
              <p className="text-sm text-slate-500">Pilgrimage services linked to this church or shrine.</p>
            </div>
            <Link href="/admin/mass-arrangements" className="text-sm font-semibold text-[#001F3F]">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {supplier.massArrangements.map((item) => (
              <div key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold text-slate-900">{item.churchName}</p>
                  <p className="text-sm text-slate-500">
                    {date(item.massDate)}{item.massTime ? ` · ${item.massTime}` : ""}{item.language ? ` · ${item.language}` : ""}
                  </p>
                </div>
                <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="rounded-xl bg-slate-100 p-2 text-[#001F3F]"><Icon className="h-4 w-4" /></span>
      <div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold text-slate-950">{value}</p></div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[130px_1fr] gap-3 py-3"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-900">{value}</span></div>;
}
function TextBlock({ title, value }: { title: string; value: string }) {
  return <div><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 whitespace-pre-wrap text-slate-600">{value}</p></div>;
}
