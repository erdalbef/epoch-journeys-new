"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SupplierServiceOption = {
  id: string;
  type: string;
  name: string;
  city: string | null;
  country: string | null;
};

type SupplierRateOption = {
  id: string;
  serviceId: string | null;
  name: string;
  currency: string;
  amount: string;
  unit: string;
  roomType: string | null;
  mealBasis: string | null;
  validFrom: Date | string;
  validTo: Date | string;
};

type SupplierOption = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  preferred: boolean;
  country: string | null;
  city: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  emergencyPhone: string | null;
  primaryContact: {
    id: string;
    name: string;
    jobTitle: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  services: SupplierServiceOption[];
  rates: SupplierRateOption[];
};

type OperationItem = {
  id: string;
  supplierId: string;
  serviceId: string;
  source: "CRM" | "MANUAL";
  supplierType: string;
  name: string;
  location: string;
  date: string;
  contactName: string;
  contactInfo: string;
  notes: string;
  confirmed: boolean;
};

type RawItem = Partial<OperationItem> | null;

type InitialData = {
  hotelItems: unknown;
  transportItems: unknown;
  guideItems: unknown;
  restaurantItems: unknown;
  massItems: unknown;
  ticketItems: unknown;
  paymentItems: unknown;
  documentItems: unknown;
  emergencyItems: unknown;
  finalNotes: string | null;
} | null;

type Props = {
  bookingId: string;
  initialData: InitialData;
  suppliers: SupplierOption[];
};

type SectionKey =
  | "hotelItems"
  | "transportItems"
  | "guideItems"
  | "restaurantItems"
  | "massItems"
  | "ticketItems"
  | "paymentItems"
  | "documentItems"
  | "emergencyItems";

type FormState = Record<SectionKey, OperationItem[]> & {
  finalNotes: string;
};

type SectionDefinition = {
  key: SectionKey;
  title: string;
  description: string;
  supplierTypes?: string[];
  serviceTypes?: string[];
};

const sections: SectionDefinition[] = [
  {
    key: "hotelItems",
    title: "Hotels",
    description: "Accommodation confirmations and hotel operating contacts.",
    supplierTypes: ["HOTEL", "DMC"],
    serviceTypes: ["ACCOMMODATION", "DMC_SERVICE"],
  },
  {
    key: "transportItems",
    title: "Transportation",
    description: "Coaches, transfers, rail, ferry and other transport services.",
    supplierTypes: ["TRANSPORT", "DMC", "FERRY", "RAIL"],
    serviceTypes: ["TRANSPORT", "FERRY", "RAIL", "DMC_SERVICE"],
  },
  {
    key: "guideItems",
    title: "Guides / Tour Managers",
    description: "Local guides, escorts and tour management services.",
    supplierTypes: ["GUIDE", "TOUR_MANAGER", "DMC"],
    serviceTypes: ["GUIDE", "TOUR_MANAGER", "DMC_SERVICE"],
  },
  {
    key: "restaurantItems",
    title: "Restaurants / Meals",
    description: "Group meals and restaurant reservations.",
    supplierTypes: ["RESTAURANT", "DMC"],
    serviceTypes: ["MEAL", "DMC_SERVICE"],
  },
  {
    key: "massItems",
    title: "Churches / Mass Arrangements",
    description: "Church, shrine, sacristy and pilgrimage Mass coordination.",
    supplierTypes: ["CHURCH_SHRINE", "DMC"],
    serviceTypes: ["MASS_ARRANGEMENT", "CHURCH_RESERVATION", "DMC_SERVICE"],
  },
  {
    key: "ticketItems",
    title: "Tickets / Visits",
    description: "Attractions, entrances, museums and ticket providers.",
    supplierTypes: ["ATTRACTION", "TICKET_PROVIDER", "DMC"],
    serviceTypes: ["ENTRANCE", "TICKET", "DMC_SERVICE"],
  },
  {
    key: "paymentItems",
    title: "Supplier Payments",
    description: "Operational payment reminders or supplier-payment notes.",
  },
  {
    key: "documentItems",
    title: "Documents",
    description: "Vouchers, confirmations, permits and operational documents.",
  },
  {
    key: "emergencyItems",
    title: "Emergency Contacts",
    description: "Emergency and after-hours operational contacts.",
  },
];

function createEmptyItem(): OperationItem {
  return {
    id: crypto.randomUUID(),
    supplierId: "",
    serviceId: "",
    source: "MANUAL",
    supplierType: "",
    name: "",
    location: "",
    date: "",
    contactName: "",
    contactInfo: "",
    notes: "",
    confirmed: false,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseItems(value: unknown): OperationItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isObject).map((item) => {
    const raw = item as RawItem;

    return {
      id:
        typeof raw?.id === "string"
          ? raw.id
          : crypto.randomUUID(),
      supplierId:
        typeof raw?.supplierId === "string"
          ? raw.supplierId
          : "",
      serviceId:
        typeof raw?.serviceId === "string"
          ? raw.serviceId
          : "",
      source: raw?.source === "CRM" ? "CRM" : "MANUAL",
      supplierType:
        typeof raw?.supplierType === "string"
          ? raw.supplierType
          : "",
      name: typeof raw?.name === "string" ? raw.name : "",
      location:
        typeof raw?.location === "string" ? raw.location : "",
      date: typeof raw?.date === "string" ? raw.date : "",
      contactName:
        typeof raw?.contactName === "string"
          ? raw.contactName
          : "",
      contactInfo:
        typeof raw?.contactInfo === "string"
          ? raw.contactInfo
          : "",
      notes: typeof raw?.notes === "string" ? raw.notes : "",
      confirmed: Boolean(raw?.confirmed),
    };
  });
}

function formatLocation(
  city: string | null,
  country: string | null,
) {
  return [city, country].filter(Boolean).join(", ");
}

function prettyEnum(value: string) {
  return value.replaceAll("_", " ");
}

function getStatusBadge(completed: number, total: number) {
  if (total === 0 || completed === 0) {
    return {
      label: "PENDING",
      className: "bg-red-100 text-red-800",
    };
  }

  if (completed === total) {
    return {
      label: "READY",
      className: "bg-green-100 text-green-800",
    };
  }

  return {
    label: "IN PROGRESS",
    className: "bg-amber-100 text-amber-800",
  };
}

function supplierMatchesSection(
  supplier: SupplierOption,
  section: SectionDefinition,
) {
  if (!section.supplierTypes) return false;

  const typeMatch = section.supplierTypes.includes(supplier.type);

  const serviceMatch =
    section.serviceTypes?.some((type) =>
      supplier.services.some((service) => service.type === type),
    ) ?? false;

  return typeMatch || serviceMatch;
}

export default function BookingOperationControlForm({
  bookingId,
  initialData,
  suppliers,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    hotelItems: parseItems(initialData?.hotelItems),
    transportItems: parseItems(initialData?.transportItems),
    guideItems: parseItems(initialData?.guideItems),
    restaurantItems: parseItems(initialData?.restaurantItems),
    massItems: parseItems(initialData?.massItems),
    ticketItems: parseItems(initialData?.ticketItems),
    paymentItems: parseItems(initialData?.paymentItems),
    documentItems: parseItems(initialData?.documentItems),
    emergencyItems: parseItems(initialData?.emergencyItems),
    finalNotes: initialData?.finalNotes ?? "",
  });

  const summary = useMemo(() => {
    const allItems = sections.flatMap((section) => form[section.key]);
    const total = allItems.length;
    const completed = allItems.filter((item) => item.confirmed).length;

    const percentage =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    const missingItems = allItems
      .filter((item) => !item.confirmed && item.name.trim())
      .map((item) => item.name.trim());

    return {
      total,
      completed,
      percentage,
      missingItems,
      badge: getStatusBadge(completed, total),
    };
  }, [form]);

  function addRow(section: SectionKey) {
    setForm((previous) => ({
      ...previous,
      [section]: [...previous[section], createEmptyItem()],
    }));
  }

  function updateItem(
    section: SectionKey,
    id: string,
    patch: Partial<OperationItem>,
  ) {
    setForm((previous) => ({
      ...previous,
      [section]: previous[section].map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function selectSupplier(
    sectionKey: SectionKey,
    itemId: string,
    supplierId: string,
  ) {
    if (!supplierId) {
      updateItem(sectionKey, itemId, {
        supplierId: "",
        serviceId: "",
        supplierType: "",
        source: "MANUAL",
      });
      return;
    }

    const supplier = suppliers.find((item) => item.id === supplierId);

    if (!supplier) return;

    const contactName = supplier.primaryContact?.name || "";
    const contactInfo =
      supplier.primaryContact?.email ||
      supplier.primaryContact?.phone ||
      supplier.email ||
      supplier.phone ||
      "";

    updateItem(sectionKey, itemId, {
      supplierId: supplier.id,
      serviceId: "",
      supplierType: supplier.type,
      source: "CRM",
      name: supplier.name,
      location: formatLocation(supplier.city, supplier.country),
      contactName,
      contactInfo,
    });
  }

  function removeRow(section: SectionKey, id: string) {
    setForm((previous) => ({
      ...previous,
      [section]: previous[section].filter((item) => item.id !== id),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/bookings/${bookingId}/control`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save operation control.",
        );
      }

      alert("Operation control saved.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save operation control.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B0000]">
              Operational readiness
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              {summary.completed} / {summary.total} confirmed
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {summary.percentage}% of entered operational items are ready.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${summary.badge.className}`}
          >
            {summary.badge.label}
          </span>
        </div>

        {summary.missingItems.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Still requiring confirmation
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {summary.missingItems.join(" · ")}
            </p>
          </div>
        )}
      </section>

      {sections.map((section) => {
        const crmEnabled = Boolean(section.supplierTypes);
        const matchingSuppliers = crmEnabled
          ? suppliers.filter((supplier) =>
              supplierMatchesSection(supplier, section),
            )
          : [];

        return (
          <section
            key={section.key}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-950">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {section.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => addRow(section.key)}
                className="w-fit rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Add item
              </button>
            </div>

            <div className="space-y-4 p-5">
              {form[section.key].length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No items entered yet.
                  {crmEnabled && matchingSuppliers.length > 0
                    ? " Add an item and select a saved CRM supplier."
                    : ""}
                </div>
              ) : (
                form[section.key].map((item, index) => {
                  const selectedSupplier = suppliers.find(
                    (supplier) => supplier.id === item.supplierId,
                  );

                  const availableServices =
                    selectedSupplier?.services.filter((service) =>
                      section.serviceTypes?.includes(service.type),
                    ) ?? [];

                  const currentRates =
                    selectedSupplier?.rates.filter(
                      (rate) =>
                        !item.serviceId ||
                        rate.serviceId === item.serviceId ||
                        rate.serviceId === null,
                    ) ?? [];

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {section.title} #{index + 1}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.source === "CRM"
                              ? "Linked to Supplier CRM"
                              : "Manual operational entry"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.supplierId ? (
                            <Link
                              href={`/admin/suppliers/${item.supplierId}`}
                              target="_blank"
                              className="text-xs font-semibold text-[#001F3F] hover:underline"
                            >
                              Open CRM
                            </Link>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => removeRow(section.key, item.id)}
                            className="text-xs font-semibold text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {crmEnabled ? (
                        <div className="mb-4 grid gap-3 lg:grid-cols-2">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Supplier CRM
                            </span>
                            <select
                              value={item.supplierId}
                              onChange={(event) =>
                                selectSupplier(
                                  section.key,
                                  item.id,
                                  event.target.value,
                                )
                              }
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#001F3F]"
                            >
                              <option value="">
                                Manual entry / select supplier...
                              </option>

                              {matchingSuppliers.map((supplier) => (
                                <option
                                  key={supplier.id}
                                  value={supplier.id}
                                >
                                  {supplier.preferred ? "★ " : ""}
                                  {supplier.name}
                                  {supplier.city
                                    ? ` — ${supplier.city}`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Service
                            </span>
                            <select
                              value={item.serviceId}
                              disabled={
                                !selectedSupplier ||
                                availableServices.length === 0
                              }
                              onChange={(event) =>
                                updateItem(section.key, item.id, {
                                  serviceId: event.target.value,
                                })
                              }
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">
                                {availableServices.length
                                  ? "General supplier service"
                                  : "No matching service saved"}
                              </option>

                              {availableServices.map((service) => (
                                <option
                                  key={service.id}
                                  value={service.id}
                                >
                                  {service.name} ·{" "}
                                  {prettyEnum(service.type)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}

                      {selectedSupplier && currentRates.length > 0 ? (
                        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                            Current contracted rates
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {currentRates.map((rate) => (
                              <span
                                key={rate.id}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-blue-900 shadow-sm"
                              >
                                {rate.name}: {rate.currency} {rate.amount} /{" "}
                                {prettyEnum(rate.unit)}
                                {rate.roomType
                                  ? ` · ${prettyEnum(rate.roomType)}`
                                  : ""}
                                {rate.mealBasis
                                  ? ` · ${rate.mealBasis}`
                                  : ""}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-blue-700">
                            Rates are shown for reference only. They are not
                            automatically posted to Finance or Quote costing yet.
                          </p>
                        </div>
                      ) : null}

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field
                          label="Name / Confirmation"
                          value={item.name}
                          onChange={(value) =>
                            updateItem(section.key, item.id, {
                              name: value,
                              source: item.supplierId ? "CRM" : "MANUAL",
                            })
                          }
                        />

                        <Field
                          label="Location"
                          value={item.location}
                          onChange={(value) =>
                            updateItem(section.key, item.id, {
                              location: value,
                            })
                          }
                        />

                        <Field
                          label="Date / Time"
                          value={item.date}
                          onChange={(value) =>
                            updateItem(section.key, item.id, {
                              date: value,
                            })
                          }
                        />

                        <Field
                          label="Contact"
                          value={item.contactName}
                          onChange={(value) =>
                            updateItem(section.key, item.id, {
                              contactName: value,
                            })
                          }
                        />

                        <Field
                          label="Contact Info"
                          value={item.contactInfo}
                          onChange={(value) =>
                            updateItem(section.key, item.id, {
                              contactInfo: value,
                            })
                          }
                        />

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </span>
                          <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3">
                            <input
                              type="checkbox"
                              checked={item.confirmed}
                              disabled={!item.name.trim()}
                              onChange={(event) =>
                                updateItem(section.key, item.id, {
                                  confirmed: event.target.checked,
                                })
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-medium text-slate-700">
                              Confirmed / Ready
                            </span>
                          </label>
                        </label>
                      </div>

                      <label className="mt-3 block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Operational notes
                        </span>
                        <textarea
                          value={item.notes}
                          onChange={(event) =>
                            updateItem(section.key, item.id, {
                              notes: event.target.value,
                            })
                          }
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#001F3F]"
                          placeholder="Confirmation number, pickup instructions, special requirements, payment reminder..."
                        />
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-2 block font-bold text-slate-950">
            Final operational notes
          </span>
          <textarea
            value={form.finalNotes}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                finalNotes: event.target.value,
              }))
            }
            rows={5}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#001F3F]"
            placeholder="Overall departure notes, unresolved issues, handover notes..."
          />
        </label>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-red-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Operation Control"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#001F3F]"
      />
    </label>
  );
}
