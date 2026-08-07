"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Users } from "lucide-react";

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  isEmergency: boolean;
  notes: string | null;
};

type Service = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  country: string | null;
  city: string | null;
  isActive: boolean;
  notes: string | null;
};

type Rate = {
  id: string;
  name: string;
  description: string | null;
  validFrom: Date | string;
  validTo: Date | string;
  currency: string;
  amount: number;
  unit: string;
  roomType: string | null;
  mealBasis: string | null;
  minPax: number | null;
  maxPax: number | null;
  isActive: boolean;
  service: { id: string; name: string } | null;
};

type Contract = {
  id: string;
  title: string;
  reference: string | null;
  status: string;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  currency: string | null;
  documentUrl: string | null;
};

type SupplierData = {
  id: string;
  contacts: Contact[];
  services: Service[];
  rates: Rate[];
  contracts: Contract[];
};

type Panel = "contacts" | "services" | "rates" | "contracts";

function date(value: Date | string | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "—";
}

export default function SupplierWorkspace({ supplier }: { supplier: SupplierData }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("contacts");
  const [adding, setAdding] = useState(false);

  async function submit(path: string, payload: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Could not save.");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
        {(["contacts", "services", "rates", "contracts"] as Panel[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setPanel(item); setAdding(false); }}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${panel === item ? "bg-[#001F3F] text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#8B0000] px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {adding && (
        <div className="border-b border-slate-100 bg-slate-50 p-4">
          {panel === "contacts" && <ContactForm onSubmit={(data) => submit(`/api/admin/suppliers/${supplier.id}/contacts`, data)} />}
          {panel === "services" && <ServiceForm onSubmit={(data) => submit(`/api/admin/suppliers/${supplier.id}/services`, data)} />}
          {panel === "rates" && <RateForm services={supplier.services} onSubmit={(data) => submit(`/api/admin/suppliers/${supplier.id}/rates`, data)} />}
          {panel === "contracts" && <ContractForm onSubmit={(data) => submit(`/api/admin/suppliers/${supplier.id}/contracts`, data)} />}
        </div>
      )}

      <div className="p-5">
        {panel === "contacts" && (
          <div className="space-y-3">
            {supplier.contacts.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {[item.firstName, item.lastName].filter(Boolean).join(" ") || "Unnamed contact"}
                    </p>
                    <p className="text-sm text-slate-500">{item.jobTitle || item.department || "Contact"}</p>
                  </div>
                  <div className="flex gap-1">
                    {item.isPrimary && <Badge>Primary</Badge>}
                    {item.isEmergency && <Badge>Emergency</Badge>}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {[item.email, item.mobile || item.phone].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
            ))}
            {supplier.contacts.length === 0 && <Empty icon={Users} text="No supplier contacts yet." />}
          </div>
        )}

        {panel === "services" && (
          <div className="space-y-3">
            {supplier.services.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between gap-3">
                  <div><p className="font-semibold text-slate-900">{item.name}</p><p className="text-sm text-slate-500">{item.type.replaceAll("_", " ")} · {[item.city, item.country].filter(Boolean).join(", ") || "General"}</p></div>
                  <Badge>{item.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            ))}
            {supplier.services.length === 0 && <Empty icon={FileText} text="No supplier services yet." />}
          </div>
        )}

        {panel === "rates" && (
          <div className="space-y-3">
            {supplier.rates.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.service?.name || "General supplier rate"} · {item.unit.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-slate-500">{date(item.validFrom)} → {date(item.validTo)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#001F3F]">{item.currency} {item.amount.toFixed(2)}</p>
                    <Badge>{item.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {supplier.rates.length === 0 && <Empty icon={FileText} text="No contracted rates yet." />}
          </div>
        )}

        {panel === "contracts" && (
          <div className="space-y-3">
            {supplier.contracts.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.reference || "No reference"} · {date(item.validFrom)} → {date(item.validTo)}</p>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
                {item.documentUrl && <a href={item.documentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#8B0000]">Open document</a>}
              </div>
            ))}
            {supplier.contracts.length === 0 && <Empty icon={FileText} text="No contracts recorded yet." />}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{children}</span>;
}

function Empty({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-500"><Icon className="mb-3 h-6 w-6" /><p className="text-sm">{text}</p></div>;
}

const field = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#001F3F]/40";

function ContactForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", jobTitle: "", email: "", phone: "", mobile: "", isPrimary: false, isEmergency: false });
  return <MiniForm submit={() => onSubmit(form)}>
    <input required placeholder="First name" className={field} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
    <input placeholder="Last name" className={field} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
    <input placeholder="Job title / department" className={field} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
    <input placeholder="Email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
    <input placeholder="Phone" className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
    <input placeholder="Mobile" className={field} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}/> Primary</label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isEmergency} onChange={(e) => setForm({ ...form, isEmergency: e.target.checked })}/> Emergency</label>
  </MiniForm>;
}

function ServiceForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const types = ["ACCOMMODATION","TRANSPORT","GUIDE","TOUR_MANAGER","MEAL","MASS_ARRANGEMENT","CHURCH_RESERVATION","ENTRANCE","TICKET","FLIGHT","CRUISE","FERRY","RAIL","INSURANCE","DMC_SERVICE","OTHER"];
  const [form, setForm] = useState({ type: "ACCOMMODATION", name: "", country: "", city: "", description: "" });
  return <MiniForm submit={() => onSubmit(form)}>
    <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{types.map((x) => <option key={x}>{x}</option>)}</select>
    <input required placeholder="Service name" className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
    <input placeholder="Country" className={field} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
    <input placeholder="City" className={field} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
  </MiniForm>;
}

function RateForm({ services, onSubmit }: { services: Service[]; onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const units = ["PER_PERSON","PER_PERSON_PER_DAY","PER_PERSON_PER_NIGHT","PER_ROOM","PER_ROOM_PER_NIGHT","PER_GROUP","PER_DAY","PER_HALF_DAY","PER_HOUR","PER_TRANSFER","PER_VEHICLE","PER_MEAL","PER_TICKET","FLAT_RATE"];
  const [form, setForm] = useState({ serviceId: "", name: "", validFrom: "", validTo: "", currency: "EUR", amount: "", unit: "PER_PERSON", roomType: "", mealBasis: "", minPax: "", maxPax: "" });
  return <MiniForm submit={() => onSubmit({ ...form, amount: Number(form.amount), minPax: form.minPax ? Number(form.minPax) : null, maxPax: form.maxPax ? Number(form.maxPax) : null, serviceId: form.serviceId || null, roomType: form.roomType || null })}>
    <select className={field} value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}><option value="">General rate</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <input required placeholder="Rate name" className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
    <input required type="date" className={field} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
    <input required type="date" className={field} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
    <input required type="number" step="0.01" placeholder="Amount" className={field} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
    <input placeholder="Currency" className={field} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
    <select className={field} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{units.map((x) => <option key={x}>{x}</option>)}</select>
    <select className={field} value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })}><option value="">No room type</option><option>SINGLE</option><option>DOUBLE_TWIN</option><option>TRIPLE</option></select>
    <input placeholder="Meal basis" className={field} value={form.mealBasis} onChange={(e) => setForm({ ...form, mealBasis: e.target.value })} />
    <input type="number" placeholder="Min pax" className={field} value={form.minPax} onChange={(e) => setForm({ ...form, minPax: e.target.value })} />
    <input type="number" placeholder="Max pax" className={field} value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: e.target.value })} />
  </MiniForm>;
}

function ContractForm({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ title: "", reference: "", status: "ACTIVE", validFrom: "", validTo: "", currency: "EUR", documentUrl: "" });
  return <MiniForm submit={() => onSubmit(form)}>
    <input required placeholder="Contract title" className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
    <input placeholder="Reference" className={field} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
    <select className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["DRAFT","ACTIVE","EXPIRED","TERMINATED","ARCHIVED"].map((x)=><option key={x}>{x}</option>)}</select>
    <input type="date" className={field} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
    <input type="date" className={field} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
    <input placeholder="Document URL/path" className={field} value={form.documentUrl} onChange={(e) => setForm({ ...form, documentUrl: e.target.value })} />
  </MiniForm>;
}

function MiniForm({ submit, children }: { submit: () => Promise<void>; children: React.ReactNode }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); setError(""); try { await submit(); } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); } finally { setSaving(false); } }} className="space-y-3">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    {error && <p className="text-sm text-red-700">{error}</p>}
    <button disabled={saving} className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
  </form>;
}
