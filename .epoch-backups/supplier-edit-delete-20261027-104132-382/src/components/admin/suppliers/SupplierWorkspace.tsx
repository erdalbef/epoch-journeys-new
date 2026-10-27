"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Users,
} from "lucide-react";

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
  breakfastIncluded: boolean | null;
  dinnerIncluded: boolean | null;
  dinnerAmount: number | null;
  dinnerUnit: string | null;
  dinnerNotes: string | null;
  cityTaxIncluded: boolean | null;
  cityTaxAmount: number | null;
  cityTaxUnit: string | null;
  porterageAvailable: boolean | null;
  porterageIncluded: boolean | null;
  porterageAmount: number | null;
  porterageUnit: string | null;
  beveragePackageIncluded: boolean | null;
  beveragePackageDescription: string | null;
  beveragePackageAmount: number | null;
  beveragePackageUnit: string | null;
  minPax: number | null;
  maxPax: number | null;
  isActive: boolean;
  service: {
    id: string;
    name: string;
  } | null;
};

type ContractPayment = {
  id: string;
  label: string;
  paymentType: "DEPOSIT" | "INSTALLMENT" | "FINAL_BALANCE" | "OTHER";
  dueDate: Date | string;
  amount: number | null;
  percent: number | null;
  warningDays: number;
  notes: string | null;
  sortOrder: number;
  paidAmount?: number;
};

type Contract = {
  id: string;
  title: string;
  reference: string | null;
  status: string;
  version?: number;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  signedDate?: Date | string | null;
  renewalNoticeDate?: Date | string | null;
  expiryWarningDays?: number;
  currency: string | null;
  documentUrl: string | null;
  originalFileName?: string | null;
  paymentSchedule?: ContractPayment[];
};

type SupplierData = {
  id: string;
  contacts: Contact[];
  services: Service[];
  rates: Rate[];
  contracts: Contract[];
};

type Panel =
  | "contacts"
  | "services"
  | "rates"
  | "contracts";

const SERVICE_TYPES = [
  {
    value: "ACCOMMODATION",
    label: "Accommodation / Hotel",
    defaultName: "Hotel Accommodation",
  },
  {
    value: "TRANSPORT",
    label: "Transport / Transfers",
    defaultName: "Transport / Transfers",
  },
  {
    value: "GUIDE",
    label: "Guide",
    defaultName: "Guide Service",
  },
  {
    value: "TOUR_MANAGER",
    label: "Tour Manager",
    defaultName: "Tour Manager Service",
  },
  {
    value: "MEAL",
    label: "Restaurant / Meals",
    defaultName: "Restaurant / Meals",
  },
  {
    value: "MASS_ARRANGEMENT",
    label: "Mass Arrangement",
    defaultName: "Mass Arrangement",
  },
  {
    value: "CHURCH_RESERVATION",
    label: "Church / Shrine Reservation",
    defaultName: "Church / Shrine Reservation",
  },
  {
    value: "ENTRANCE",
    label: "Entrance Fee",
    defaultName: "Entrance Fees",
  },
  {
    value: "TICKET",
    label: "Ticket",
    defaultName: "Tickets",
  },
  {
    value: "FLIGHT",
    label: "Flight",
    defaultName: "Flight Service",
  },
  {
    value: "CRUISE",
    label: "Cruise",
    defaultName: "Cruise Service",
  },
  {
    value: "FERRY",
    label: "Ferry",
    defaultName: "Ferry Service",
  },
  {
    value: "RAIL",
    label: "Rail",
    defaultName: "Rail Service",
  },
  {
    value: "INSURANCE",
    label: "Insurance",
    defaultName: "Travel Insurance",
  },
  {
    value: "DMC_SERVICE",
    label: "DMC / Ground Services",
    defaultName: "DMC / Ground Services",
  },
  {
    value: "OTHER",
    label: "Other",
    defaultName: "Other Service",
  },
] as const;

function serviceTypeLabel(
  value: string,
) {
  return (
    SERVICE_TYPES.find(
      (item) =>
        item.value === value,
    )?.label ??
    value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )
  );
}

function rateUnitLabel(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function date(
  value:
    | Date
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(parsed);
}

export default function SupplierWorkspace({
  supplier,
}: {
  supplier: SupplierData;
}) {
  const router =
    useRouter();

  const [panel, setPanel] =
    useState<Panel>(
      "contacts",
    );

  const [adding, setAdding] =
    useState(false);

  const [viewingServiceId, setViewingServiceId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceDraft, setServiceDraft] = useState({
    name: "", country: "", city: "", description: "", notes: "",
  });
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState("");

  function startEditingService(service: Service) {
    setEditingServiceId(service.id);
    setViewingServiceId(service.id);
    setServiceError("");
    setServiceDraft({
      name: service.name,
      country: service.country ?? "",
      city: service.city ?? "",
      description: service.description ?? "",
      notes: service.notes ?? "",
    });
  }

  async function patchService(serviceId: string, changes: Record<string, unknown>) {
    setSavingServiceId(serviceId);
    setServiceError("");
    try {
      const response = await fetch(
        `/api/admin/suppliers/${supplier.id}/services/${serviceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update service.");
      setEditingServiceId(null);
      router.refresh();
    } catch (caught) {
      setServiceError(caught instanceof Error ? caught.message : "Could not update service.");
    } finally {
      setSavingServiceId(null);
    }
  }


  async function submit(
    path: string,
    payload: Record<
      string,
      unknown
    >,
  ) {
    const response =
      await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          payload,
        ),
      });

    const data =
      (await response.json()) as {
        error?: string;
      };

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not save.",
      );
    }

    setAdding(false);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
        {(
          [
            "contacts",
            "services",
            "rates",
            "contracts",
          ] as Panel[]
        ).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setPanel(item);
              setAdding(false);
              setViewingServiceId(null);
              setEditingServiceId(null);
              setServiceError("");
            }}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              panel === item
                ? "bg-[#001F3F] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item[0].toUpperCase() +
              item.slice(1)}
          </button>
        ))}

        <button
          type="button"
          onClick={() =>
            setAdding(
              (value) =>
                !value,
            )
          }
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#8B0000] px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {adding && (
        <div className="border-b border-slate-100 bg-slate-50 p-4">
          {panel ===
            "contacts" && (
            <ContactForm
              onSubmit={(
                data,
              ) =>
                submit(
                  `/api/admin/suppliers/${supplier.id}/contacts`,
                  data,
                )
              }
            />
          )}

          {panel ===
            "services" && (
            <ServiceForm
              onSubmit={(
                data,
              ) =>
                submit(
                  `/api/admin/suppliers/${supplier.id}/services`,
                  data,
                )
              }
            />
          )}

          {panel ===
            "rates" && (
            <RateForm
              services={supplier.services.filter(
                (service) =>
                  service.isActive,
              )}
              onSubmit={(
                data,
              ) =>
                submit(
                  `/api/admin/suppliers/${supplier.id}/rates`,
                  data,
                )
              }
            />
          )}

          {panel === "contracts" && (
            <ContractUploadForm
              supplierId={supplier.id}
              contracts={supplier.contracts}
              onSaved={() => {
                setAdding(false);
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      <div className="p-5">
        {panel ===
          "contacts" && (
          <div className="space-y-3">
            {supplier.contacts.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {[
                          item.firstName,
                          item.lastName,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " ",
                          ) ||
                          "Unnamed contact"}
                      </p>

                      <p className="text-sm text-slate-500">
                        {item.jobTitle ||
                          item.department ||
                          "Contact"}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      {item.isPrimary && (
                        <Badge>
                          Primary
                        </Badge>
                      )}

                      {item.isEmergency && (
                        <Badge>
                          Emergency
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {[
                      item.email,
                      item.mobile ||
                        item.phone,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        " · ",
                      ) ||
                      "No contact details"}
                  </p>
                </div>
              ),
            )}

            {supplier.contacts
              .length ===
              0 && (
              <Empty
                icon={Users}
                text="No supplier contacts yet."
              />
            )}
          </div>
        )}

        {panel ===
          "services" && (
          <div className="space-y-3">
            {supplier.services.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {serviceTypeLabel(
                          item.type,
                        )}{" "}
                        ·{" "}
                        {[
                          item.city,
                          item.country,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ", ",
                          ) ||
                          "General"}
                      </p>

                      {item.description && (
                        <p className="mt-2 text-sm text-slate-600">
                          {
                            item.description
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge>{item.isActive ? "Active" : "Inactive"}</Badge>
                      <button
                        type="button"
                        aria-expanded={viewingServiceId === item.id}
                        onClick={() => setViewingServiceId((current) => current === item.id ? null : item.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#001F3F] hover:bg-slate-50"
                      >
                        {viewingServiceId === item.id ? "Close" : "View"}
                      </button>
                      <button
                        type="button"
                        disabled={savingServiceId !== null}
                        onClick={() => editingServiceId === item.id ? setEditingServiceId(null) : startEditingService(item)}
                        className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {editingServiceId === item.id ? "Cancel Edit" : "Edit"}
                      </button>
                      <button
                        type="button"
                        disabled={savingServiceId !== null}
                        onClick={() => {
                          if (window.confirm(`${item.isActive ? "Deactivate" : "Reactivate"} ${item.name}? Linked rates will not be deleted.`)) {
                            void patchService(item.id, { isActive: !item.isActive });
                          }
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${item.isActive ? "border-amber-300 text-amber-800 hover:bg-amber-50" : "border-emerald-300 text-emerald-800 hover:bg-emerald-50"}`}
                      >
                        {savingServiceId === item.id ? "Saving..." : item.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                  {serviceError && (editingServiceId === item.id || viewingServiceId === item.id) && (
                    <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{serviceError}</p>
                  )}
                  {editingServiceId === item.id && (
                    <form
                      className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4"
                      onSubmit={(event) => { event.preventDefault(); void patchService(item.id, serviceDraft); }}
                    >
                      <p className="text-sm font-semibold text-slate-900">Edit service details</p>
                      <p className="text-xs text-slate-600">The service ID and linked rates will remain unchanged.</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {(["name", "country", "city", "description", "notes"] as const).map((key) => (
                          <label key={key} className="text-xs font-semibold text-slate-700">
                            {key === "name" ? "Service Name *" : key[0].toUpperCase() + key.slice(1)}
                            <input
                              className={field + " mt-1"}
                              required={key === "name"}
                              value={serviceDraft[key]}
                              onChange={(event) => setServiceDraft((current) => ({ ...current, [key]: event.target.value }))}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={savingServiceId !== null} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          {savingServiceId === item.id ? "Saving..." : "Save Changes"}
                        </button>
                        <button type="button" onClick={() => { setEditingServiceId(null); setServiceError(""); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                      </div>
                    </form>
                  )}
                  {viewingServiceId === item.id && (
                    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <RateDetail label="Service ID" value={item.id} />
                        <RateDetail label="Type" value={serviceTypeLabel(item.type)} />
                        <RateDetail label="City" value={item.city || "General / not specified"} />
                        <RateDetail label="Country" value={item.country || "Not specified"} />
                        <RateDetail label="Status" value={item.isActive ? "Active" : "Inactive"} />
                        <RateDetail label="Notes" value={item.notes || "None"} />
                      </div>
                      <div className="border-t border-slate-100 pt-3">
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                          Linked rates ({supplier.rates.filter((rate) => rate.service?.id === item.id).length})
                        </p>
                        {supplier.rates.filter((rate) => rate.service?.id === item.id).length === 0 ? (
                          <p className="text-sm text-slate-500">No rates are linked to this service.</p>
                        ) : (
                          <div className="space-y-2">
                            {supplier.rates.filter((rate) => rate.service?.id === item.id).map((rate) => (
                              <div key={rate.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-900">{rate.name}</span>
                                  <Badge>{rate.isActive ? "Active" : "Inactive"}</Badge>
                                </div>
                                <p className="mt-1 text-slate-600">
                                  {date(rate.validFrom)} → {date(rate.validTo)} · {rate.currency} {rate.amount.toFixed(2)} · {rateUnitLabel(rate.unit)}
                                </p>
                                {rate.roomType && (
                                  <p className="mt-1 text-slate-600">
                                    Room: {rate.roomType === "DOUBLE_TWIN" ? "Double / Twin" : rate.roomType === "SINGLE" ? "Single" : rate.roomType === "TRIPLE" ? "Triple" : rate.roomType}
                                    {rate.mealBasis ? ` · ${rate.mealBasis}` : ""}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ),
            )}

            {supplier.services
              .length ===
              0 && (
              <Empty
                icon={
                  FileText
                }
                text="No supplier services yet. Select Add to create the first service."
              />
            )}
          </div>
        )}

        {panel ===
          "rates" && (
          <div className="space-y-3">
            {supplier.rates.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {item
                          .service
                          ?.name ||
                          "General supplier rate"}{" "}
                        ·{" "}
                        {rateUnitLabel(
                          item.unit,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {date(
                          item.validFrom,
                        )}{" "}
                        →{" "}
                        {date(
                          item.validTo,
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-[#001F3F]">
                        {
                          item.currency
                        }{" "}
                        {item.amount.toFixed(
                          2,
                        )}
                      </p>

                      <Badge>
                        {item.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {item.roomType && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Hotel rate details</p>
                      <div className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                        <RateDetail label="Room type" value={item.roomType === "DOUBLE_TWIN" ? "Double / Twin" : item.roomType === "SINGLE" ? "Single" : item.roomType === "TRIPLE" ? "Triple" : item.roomType} />
                        <RateDetail label="Meal basis" value={item.mealBasis ?? "Not specified"} />
                        <RateDetail label="Breakfast" value={includedLabel(item.breakfastIncluded)} />
                        <RateDetail label="Dinner" value={chargeLabel(item.dinnerIncluded, item.dinnerAmount, item.currency, item.dinnerUnit, "Not specified")} />
                        <RateDetail label="City tax" value={chargeLabel(item.cityTaxIncluded, item.cityTaxAmount, item.currency, item.cityTaxUnit, "Not specified")} />
                        <RateDetail label="Porterage" value={item.porterageAvailable === false ? "Not available" : item.porterageAvailable === null ? "Not specified" : chargeLabel(item.porterageIncluded, item.porterageAmount, item.currency, item.porterageUnit, "Available; charge not specified")} />
                        <RateDetail label="Beverage package" value={chargeLabel(item.beveragePackageIncluded, item.beveragePackageAmount, item.currency, item.beveragePackageUnit, "Not specified")} />
                        {item.dinnerNotes && <RateDetail label="Dinner notes" value={item.dinnerNotes} />}
                        {item.beveragePackageDescription && <RateDetail label="Beverage details" value={item.beveragePackageDescription} />}
                      </div>
                    </div>
                  )}
                </div>
              ),
            )}

            {supplier.rates
              .length ===
              0 && (
              <Empty
                icon={
                  FileText
                }
                text="No contracted rates yet."
              />
            )}
          </div>
        )}

        {panel === "contracts" && (
          <div className="space-y-3">
            {supplier.contracts.map((item) => (
              <ContractCard key={item.id} supplierId={supplier.id} contract={item} />
            ))}
            {supplier.contracts.length === 0 && (
              <Empty icon={FileText} text="No contracts recorded yet." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RateDetail({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap gap-1"><span className="text-slate-500">{label}:</span><span className="font-medium text-slate-800">{value}</span></div>;
}

function includedLabel(value: boolean | null) {
  return value === true ? "Included" : value === false ? "Not included" : "Not specified";
}

function chargeLabel(included: boolean | null, amount: number | null, currency: string, unit: string | null, fallback: string) {
  if (included === true) return "Included";
  if (amount !== null) return `${currency} ${amount.toFixed(2)}${unit ? ` / ${rateUnitLabel(unit)}` : ""}`;
  return fallback;
}

function Badge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: typeof FileText;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-500">
      <Icon className="mb-3 h-6 w-6" />

      <p className="text-sm">
        {text}
      </p>
    </div>
  );
}

const field =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#001F3F]/40";

function ContactForm({
  onSubmit,
}: {
  onSubmit: (
    data: Record<
      string,
      unknown
    >,
  ) => Promise<void>;
}) {
  const [form, setForm] =
    useState({
      firstName: "",
      lastName: "",
      jobTitle: "",
      email: "",
      phone: "",
      mobile: "",
      isPrimary: false,
      isEmergency: false,
    });

  return (
    <MiniForm
      submit={() =>
        onSubmit(form)
      }
    >
      <input
        required
        placeholder="First name"
        className={field}
        value={
          form.firstName
        }
        onChange={(event) =>
          setForm({
            ...form,
            firstName:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Last name"
        className={field}
        value={form.lastName}
        onChange={(event) =>
          setForm({
            ...form,
            lastName:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Job title / department"
        className={field}
        value={form.jobTitle}
        onChange={(event) =>
          setForm({
            ...form,
            jobTitle:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Email"
        className={field}
        value={form.email}
        onChange={(event) =>
          setForm({
            ...form,
            email:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Phone"
        className={field}
        value={form.phone}
        onChange={(event) =>
          setForm({
            ...form,
            phone:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Mobile"
        className={field}
        value={form.mobile}
        onChange={(event) =>
          setForm({
            ...form,
            mobile:
              event.target
                .value,
          })
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={
            form.isPrimary
          }
          onChange={(event) =>
            setForm({
              ...form,
              isPrimary:
                event.target
                  .checked,
            })
          }
        />
        Primary
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={
            form.isEmergency
          }
          onChange={(event) =>
            setForm({
              ...form,
              isEmergency:
                event.target
                  .checked,
            })
          }
        />
        Emergency
      </label>
    </MiniForm>
  );
}

function ServiceForm({
  onSubmit,
}: {
  onSubmit: (
    data: Record<
      string,
      unknown
    >,
  ) => Promise<void>;
}) {
  const [form, setForm] =
    useState({
      type:
        "ACCOMMODATION",
      name:
        "Hotel Accommodation",
      country: "",
      city: "",
      description: "",
    });

  function changeType(
    type: string,
  ) {
    const option =
      SERVICE_TYPES.find(
        (item) =>
          item.value ===
          type,
      );

    setForm({
      ...form,
      type,
      name:
        option?.defaultName ??
        "",
    });
  }

  return (
    <MiniForm
      submit={() =>
        onSubmit(form)
      }
    >
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Service Type *
        </label>

        <select
          required
          className={field}
          value={form.type}
          onChange={(event) =>
            changeType(
              event.target
                .value,
            )
          }
        >
          {SERVICE_TYPES.map(
            (item) => (
              <option
                key={
                  item.value
                }
                value={
                  item.value
                }
              >
                {
                  item.label
                }
              </option>
            ),
          )}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Service Name *
        </label>

        <input
          required
          placeholder="Service name"
          className={field}
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name:
                event.target
                  .value,
            })
          }
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Country
        </label>

        <input
          placeholder="Country"
          className={field}
          value={
            form.country
          }
          onChange={(event) =>
            setForm({
              ...form,
              country:
                event.target
                  .value,
            })
          }
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          City
        </label>

        <input
          placeholder="City"
          className={field}
          value={form.city}
          onChange={(event) =>
            setForm({
              ...form,
              city:
                event.target
                  .value,
            })
          }
        />
      </div>

      <div className="md:col-span-2 xl:col-span-3">
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Description
        </label>

        <input
          placeholder="Optional service description"
          className={field}
          value={
            form.description
          }
          onChange={(event) =>
            setForm({
              ...form,
              description:
                event.target
                  .value,
            })
          }
        />
      </div>
    </MiniForm>
  );
}

function RateForm({ services, onSubmit }: {
  services: Service[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}) {
  const units = [
    "PER_PERSON", "PER_PERSON_PER_DAY", "PER_PERSON_PER_NIGHT", "PER_ROOM",
    "PER_ROOM_PER_NIGHT", "PER_GROUP", "PER_DAY", "PER_HALF_DAY",
    "PER_HOUR", "PER_TRANSFER", "PER_VEHICLE", "PER_MEAL", "PER_TICKET", "FLAT_RATE",
  ];
  const [form, setForm] = useState({
    serviceId: "", name: "", validFrom: "", validTo: "", currency: "EUR",
    amount: "", unit: "PER_PERSON", roomType: "", mealBasis: "BB",
    singleRate: "", doubleRate: "", tripleRate: "", hotelUnit: "PER_ROOM_PER_NIGHT",
    breakfastIncluded: true, dinnerIncluded: false, dinnerAmount: "",
    dinnerUnit: "PER_MEAL", dinnerNotes: "", cityTaxIncluded: false,
    cityTaxAmount: "", cityTaxUnit: "PER_PERSON_PER_NIGHT",
    porterageAvailable: false, porterageIncluded: false, porterageAmount: "",
    porterageUnit: "PER_PERSON", beveragePackageIncluded: false,
    beveragePackageDescription: "", beveragePackageAmount: "",
    beveragePackageUnit: "PER_MEAL", minPax: "", maxPax: "",
  });
  const selectedService = services.find((service) => service.id === form.serviceId);
  const isHotel = selectedService?.type === "ACCOMMODATION";
  const roomRates = ([
    { roomType: "SINGLE", amount: form.singleRate },
    { roomType: "DOUBLE_TWIN", amount: form.doubleRate },
    { roomType: "TRIPLE", amount: form.tripleRate },
  ]).filter((item) => item.amount.trim() !== "").map((item) => ({
    roomType: item.roomType, amount: Number(item.amount),
  }));
  const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);
  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    if (isHotel && roomRates.length === 0) {
      throw new Error("Enter at least one hotel room rate. Leave unavailable types blank.");
    }
    const payload: Record<string, unknown> = {
      ...form,
      serviceId: form.serviceId || null,
      unit: isHotel ? form.hotelUnit : form.unit,
      amount: isHotel ? undefined : Number(form.amount),
      roomType: isHotel ? null : form.roomType || null,
      minPax: numberOrNull(form.minPax),
      maxPax: numberOrNull(form.maxPax),
      dinnerAmount: !form.dinnerIncluded ? numberOrNull(form.dinnerAmount) : null,
      dinnerUnit: !form.dinnerIncluded && form.dinnerAmount !== "" ? form.dinnerUnit : null,
      dinnerNotes: !form.dinnerIncluded ? form.dinnerNotes || null : null,
      cityTaxAmount: !form.cityTaxIncluded ? numberOrNull(form.cityTaxAmount) : null,
      cityTaxUnit: !form.cityTaxIncluded && form.cityTaxAmount !== "" ? form.cityTaxUnit : null,
      porterageAmount: form.porterageAvailable && !form.porterageIncluded ? numberOrNull(form.porterageAmount) : null,
      porterageUnit: form.porterageAvailable && !form.porterageIncluded && form.porterageAmount !== "" ? form.porterageUnit : null,
      beveragePackageAmount: !form.beveragePackageIncluded ? numberOrNull(form.beveragePackageAmount) : null,
      beveragePackageUnit: !form.beveragePackageIncluded && form.beveragePackageAmount !== "" ? form.beveragePackageUnit : null,
    };
    if (isHotel) payload.roomRates = roomRates;
    await onSubmit(payload);
  }
  const inputNumber = (label: string, key: keyof typeof form, required = false) => (
    <label className="block text-xs font-semibold text-slate-600" key={key}>
      {label}
      <input className={field} type="number" min="0" step="0.01" required={required}
        value={String(form[key])} onChange={(event) => update(key, event.target.value as never)} />
    </label>
  );
  const check = (label: string, key: "breakfastIncluded" | "dinnerIncluded" | "cityTaxIncluded" | "porterageAvailable" | "porterageIncluded" | "beveragePackageIncluded") => (
    <label className="flex items-center gap-2 text-sm" key={key}>
      <input type="checkbox" checked={form[key]} onChange={(event) => update(key, event.target.checked)} />{label}
    </label>
  );
  const unitSelect = (key: "unit" | "dinnerUnit" | "cityTaxUnit" | "porterageUnit" | "beveragePackageUnit") => (
    <select className={field} value={form[key]} onChange={(event) => update(key, event.target.value)}>
      {units.map((unit) => <option key={unit} value={unit}>{rateUnitLabel(unit)}</option>)}
    </select>
  );
  return (
    <MiniForm submit={save}>
      <label className="text-xs font-semibold text-slate-600">Supplier service
        <select className={field} value={form.serviceId} onChange={(event) => update("serviceId", event.target.value)}>
          <option value="">General rate</option>
          {services.map((service) => <option key={service.id} value={service.id}>
            {serviceTypeLabel(service.type)} - {service.name}
          </option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">Rate name *
        <input required className={field} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. 2027 group contract" />
      </label>
      <label className="text-xs font-semibold text-slate-600">Valid from *
        <input required type="date" className={field} value={form.validFrom} onChange={(event) => update("validFrom", event.target.value)} />
      </label>
      <label className="text-xs font-semibold text-slate-600">Valid to *
        <input required type="date" min={form.validFrom || undefined} className={field} value={form.validTo} onChange={(event) => update("validTo", event.target.value)} />
      </label>
      <label className="text-xs font-semibold text-slate-600">Currency
        <input className={field} maxLength={3} value={form.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} />
      </label>
      {isHotel ? (<>
        <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="font-semibold text-slate-900">Hotel room rates</p>
          <p className="text-xs text-slate-500">Enter only available room types. Blank means not quoted, not zero. At least one is required.</p>
          <div className="grid gap-3 md:grid-cols-3">
            {inputNumber("Single room", "singleRate")}
            {inputNumber("Double / Twin room", "doubleRate")}
            {inputNumber("Triple room", "tripleRate")}
          </div>
          <label className="block text-xs font-semibold text-slate-600">Rate basis
            <select className={field} value={form.hotelUnit} onChange={(event) => update("hotelUnit", event.target.value)}>
              <option value="PER_ROOM_PER_NIGHT">Per room per night</option>
              <option value="PER_PERSON_PER_NIGHT">Per person per night</option>
            </select>
          </label>
        </div>
        <label className="text-xs font-semibold text-slate-600">Meal basis
          <select className={field} value={form.mealBasis} onChange={(event) => {
            const basis = event.target.value;
            setForm((current) => ({ ...current, mealBasis: basis, breakfastIncluded: basis !== "RO", dinnerIncluded: basis === "HB" || basis === "FB" }));
          }}>
            <option value="RO">RO - Room Only</option>
            <option value="BB">BB - Bed & Breakfast</option>
            <option value="HB">HB - Half Board</option>
            <option value="FB">FB - Full Board</option>
          </select>
        </label>
        {check("Breakfast included", "breakfastIncluded")}
        {check("Dinner included", "dinnerIncluded")}
        {!form.dinnerIncluded && <>
          {inputNumber("Dinner supplement", "dinnerAmount")}
          <label className="text-xs font-semibold text-slate-600">Dinner supplement basis{unitSelect("dinnerUnit")}</label>
          <label className="text-xs font-semibold text-slate-600">Dinner notes
            <input className={field} value={form.dinnerNotes} onChange={(event) => update("dinnerNotes", event.target.value)} />
          </label>
        </>}
        {check("City tax included in room rate", "cityTaxIncluded")}
        {!form.cityTaxIncluded && <>
          {inputNumber("City tax (additional)", "cityTaxAmount")}
          <label className="text-xs font-semibold text-slate-600">City tax basis{unitSelect("cityTaxUnit")}</label>
        </>}
        {check("Porterage available", "porterageAvailable")}
        {form.porterageAvailable && <>
          {check("Porterage included", "porterageIncluded")}
          {!form.porterageIncluded && <>
            {inputNumber("Porterage charge", "porterageAmount")}
            <label className="text-xs font-semibold text-slate-600">Porterage basis{unitSelect("porterageUnit")}</label>
          </>}
        </>}
        {check("Beverage package included", "beveragePackageIncluded")}
        <label className="text-xs font-semibold text-slate-600">Beverage package description
          <input className={field} value={form.beveragePackageDescription} onChange={(event) => update("beveragePackageDescription", event.target.value)} />
        </label>
        {!form.beveragePackageIncluded && <>
          {inputNumber("Beverage package charge", "beveragePackageAmount")}
          <label className="text-xs font-semibold text-slate-600">Beverage package basis{unitSelect("beveragePackageUnit")}</label>
        </>}
      </>) : <>
        {inputNumber("Amount *", "amount", true)}
        <label className="text-xs font-semibold text-slate-600">Rate unit{unitSelect("unit")}</label>
        <label className="text-xs font-semibold text-slate-600">Room type (optional)
          <select className={field} value={form.roomType} onChange={(event) => update("roomType", event.target.value)}>
            <option value="">No room type</option><option value="SINGLE">Single</option>
            <option value="DOUBLE_TWIN">Double / Twin</option><option value="TRIPLE">Triple</option>
          </select>
        </label>
      </>}
      <label className="text-xs font-semibold text-slate-600">Minimum pax
        <input className={field} type="number" min="0" step="1" value={form.minPax} onChange={(event) => update("minPax", event.target.value)} />
      </label>
      <label className="text-xs font-semibold text-slate-600">Maximum pax
        <input className={field} type="number" min="0" step="1" value={form.maxPax} onChange={(event) => update("maxPax", event.target.value)} />
      </label>
    </MiniForm>
  );
}

type PaymentDraft = {
  key: number;
  label: string;
  paymentType: ContractPayment["paymentType"];
  dueDate: string;
  amount: string;
  percent: string;
  warningDays: string;
  notes: string;
};

function dueStatus(due: Date | string, warningDays: number) {
  const isoDay = typeof due === "string" ? due.slice(0, 10) : due.toISOString().slice(0, 10);
  const parsed = new Date(`${isoDay}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const deadline = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  const days = Math.round((deadline - start) / 86400000);
  if (days < 0) return { text: `${-days} day(s) overdue`, className: "bg-red-100 text-red-800" };
  if (days === 0) return { text: "Due today", className: "bg-red-100 text-red-800" };
  if (days <= warningDays) return { text: `Due in ${days} day(s)`, className: "bg-amber-100 text-amber-800" };
  return null;
}

function paymentMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ContractCard({ supplierId, contract }: { supplierId: string; contract: Contract }) {
  const active = contract.status === "ACTIVE" || contract.status === "DRAFT";
  const currency = contract.currency || "EUR";
  const payments = [...(contract.paymentSchedule ?? [])].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() || a.sortOrder - b.sortOrder,
  );
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{contract.title} {contract.version ? `(v${contract.version})` : ""}</p>
          <p className="text-sm text-slate-500">{contract.reference || "No reference"} · {date(contract.validFrom)} → {date(contract.validTo)}</p>
        </div>
        <Badge>{contract.status}</Badge>
      </div>
      {contract.documentUrl && (
        <a href={`/api/admin/suppliers/${supplierId}/contracts/${contract.id}/file`}
          target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-[#8B0000]">
          Open Contract {contract.originalFileName ? `(${contract.originalFileName})` : ""}
        </a>
      )}
      {payments.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-slate-800">Payment schedule · {currency}</p>
          {payments.map((payment) => {
            const paid = Math.max(0, payment.paidAmount ?? 0);
            const required = payment.amount;
            const knownRequired = required !== null && Number.isFinite(required);
            const outstanding = knownRequired ? Math.max(0, required - paid) : null;
            const settled = knownRequired && outstanding !== null && outstanding < 0.005;
            const deadline = active && !settled ? dueStatus(payment.dueDate, payment.warningDays) : null;
            const state = settled ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid";
            const stateColor = settled
              ? "bg-emerald-100 text-emerald-800"
              : paid > 0
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-200 text-slate-700";
            return (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-slate-800">{payment.label} · {payment.paymentType.replaceAll("_", " ")}</p>
                  <p className="text-slate-600">Due {date(payment.dueDate)} · {knownRequired ? `Required ${paymentMoney(required, currency)}` : payment.percent !== null ? `Required ${payment.percent}% (monetary total not defined)` : "Final amount not defined"}</p>
                  <p className="text-slate-600">Paid {paymentMoney(paid, currency)}{outstanding !== null ? ` · Outstanding ${paymentMoney(outstanding, currency)}` : " · Outstanding amount unknown"}</p>
                  {payment.notes && <p className="text-xs text-slate-500">{payment.notes}</p>}
                  {!knownRequired && <p className="text-xs text-amber-700">Settlement cannot be verified until the required amount is recorded.</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateColor}`}>{state}{!knownRequired ? " (unverified)" : ""}</span>
                  {deadline && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${deadline.className}`}>{deadline.text}</span>}
                </div>
              </div>
            );
          })}
          <p className="text-xs text-slate-500">Amounts paid are calculated from supplier payments explicitly linked to each installment. Unlinked payments are not allocated automatically.</p>
        </div>
      )}
      {active && contract.renewalNoticeDate && dueStatus(contract.renewalNoticeDate, contract.expiryWarningDays ?? 30) && (
        <p className="text-sm font-semibold text-amber-800">Renewal notice: {date(contract.renewalNoticeDate)} · {dueStatus(contract.renewalNoticeDate, contract.expiryWarningDays ?? 30)?.text}</p>
      )}
    </div>
  );
}

function ContractUploadForm({
  supplierId, contracts, onSaved,
}: {
  supplierId: string;
  contracts: Contract[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "", reference: "", status: "ACTIVE", validFrom: "", validTo: "",
    signedDate: "", renewalNoticeDate: "", expiryWarningDays: "30",
    currency: "EUR", paymentTerms: "", cancellationTerms: "", notes: "",
    previousVersionId: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addPayment(type: ContractPayment["paymentType"] = "DEPOSIT") {
    const count = payments.filter((item) => item.paymentType === type).length + 1;
    const label = type === "FINAL_BALANCE" ? "Final Balance" : type === "DEPOSIT" ? `Deposit ${count}` : type === "INSTALLMENT" ? `Installment ${count}` : "Other Payment";
    setPayments((current) => [...current, { key: nextKey, label, paymentType: type, dueDate: "", amount: "", percent: "", warningDays: "14", notes: "" }]);
    setNextKey((value) => value + 1);
  }

  function updatePayment(key: number, changes: Partial<PaymentDraft>) {
    setPayments((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file) { setError("Please select a contract PDF, DOC or DOCX file."); return; }
    if (payments.some((item) => !item.label.trim() || !item.dueDate)) {
      setError("Each payment must have a label and an actual due date."); return;
    }
    if (payments.some((item) => item.amount !== "" && item.percent !== "")) {
      setError("Use either an amount or a percentage for each payment, not both."); return;
    }
    if (payments.some((item) => item.paymentType !== "FINAL_BALANCE" && item.amount === "" && item.percent === "")) {
      setError("Each deposit or installment needs an amount or percentage."); return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, value);
      body.append("file", file);
      body.append("paymentSchedule", JSON.stringify(payments.map((item, index) => ({
        label: item.label.trim(), paymentType: item.paymentType, dueDate: item.dueDate,
        amount: item.amount === "" ? null : Number(item.amount),
        percent: item.percent === "" ? null : Number(item.percent),
        warningDays: Number(item.warningDays), notes: item.notes, sortOrder: index,
      }))));
      const response = await fetch(`/api/admin/suppliers/${supplierId}/contracts/upload`, { method: "POST", body });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not upload contract.");
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload contract.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">Contract title *
          <input required className={field} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Reference
          <input className={field} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Status
          <select className={field} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            {["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "ARCHIVED"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Valid from
          <input type="date" className={field} value={form.validFrom} onChange={(event) => setForm({ ...form, validFrom: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Valid to
          <input type="date" className={field} value={form.validTo} onChange={(event) => setForm({ ...form, validTo: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Signed date
          <input type="date" className={field} value={form.signedDate} onChange={(event) => setForm({ ...form, signedDate: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Renewal notice date
          <input type="date" className={field} value={form.renewalNoticeDate} onChange={(event) => setForm({ ...form, renewalNoticeDate: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Expiry warning days
          <input type="number" min="0" className={field} value={form.expiryWarningDays} onChange={(event) => setForm({ ...form, expiryWarningDays: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Currency
          <input className={field} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} />
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-3">New version of existing contract
          <select className={field} value={form.previousVersionId} onChange={(event) => setForm({ ...form, previousVersionId: event.target.value })}>
            <option value="">New contract (not a replacement)</option>
            {contracts.filter((item) => !["REPLACED", "TERMINATED"].includes(item.status)).map((item) => (
              <option key={item.id} value={item.id}>{item.title} · v{item.version ?? 1} · {item.status}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-3">Contract document (PDF, DOC, DOCX) *
          <input type="file" required accept=".pdf,.doc,.docx" className="mt-1 block w-full text-sm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-3">Payment terms
          <textarea className={field + " h-20 py-2"} value={form.paymentTerms} onChange={(event) => setForm({ ...form, paymentTerms: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-3">Cancellation terms
          <textarea className={field + " h-20 py-2"} value={form.cancellationTerms} onChange={(event) => setForm({ ...form, cancellationTerms: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-3">Internal notes
          <textarea className={field + " h-20 py-2"} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">Contract payment schedule</p>
            <p className="text-xs text-slate-500">Set an actual due date and warning period for each payment.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addPayment("DEPOSIT")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">+ Deposit</button>
            <button type="button" onClick={() => addPayment("INSTALLMENT")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">+ Installment</button>
            <button type="button" onClick={() => addPayment("FINAL_BALANCE")} className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white">+ Final Balance</button>
          </div>
        </div>
        {payments.length === 0 && <p className="text-sm text-slate-500">No scheduled payments added yet.</p>}
        {payments.map((item) => (
          <div key={item.key} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">Payment type
              <select className={field} value={item.paymentType} onChange={(event) => updatePayment(item.key, { paymentType: event.target.value as PaymentDraft["paymentType"] })}>
                {["DEPOSIT", "INSTALLMENT", "FINAL_BALANCE", "OTHER"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Payment label *
              <input required className={field} value={item.label} onChange={(event) => updatePayment(item.key, { label: event.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Due date *
              <input required type="date" className={field} value={item.dueDate} onChange={(event) => updatePayment(item.key, { dueDate: event.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Amount ({form.currency || "EUR"})
              <input type="number" min="0" step="0.01" className={field} value={item.amount} onChange={(event) => updatePayment(item.key, { amount: event.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Percentage (%)
              <input type="number" min="0" max="100" step="0.01" className={field} value={item.percent} onChange={(event) => updatePayment(item.key, { percent: event.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Warn before (days)
              <input required type="number" min="0" step="1" className={field} value={item.warningDays} onChange={(event) => updatePayment(item.key, { warningDays: event.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-600 xl:col-span-2">Notes
              <input className={field} value={item.notes} onChange={(event) => updatePayment(item.key, { notes: event.target.value })} />
            </label>
            <div className="xl:col-span-4 flex items-center justify-between gap-3">
              {item.paymentType === "FINAL_BALANCE" && !item.amount && !item.percent ? <p className="text-xs text-slate-500">Amount will be recorded as remaining balance.</p> : <span />}
              <button type="button" className="text-xs font-semibold text-red-700" onClick={() => setPayments((current) => current.filter((row) => row.key !== item.key))}>Remove payment</button>
            </div>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-xl bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Uploading..." : "Upload contract and save schedule"}</button>
    </form>
  );
}

function MiniForm({
  submit,
  children,
}: {
  submit: () => Promise<void>;
  children:
    React.ReactNode;
}) {
  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  return (
    <form
      onSubmit={async (
        event,
      ) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
          await submit();
        } catch (error) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Could not save.",
          );
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>

      {error && (
        <p className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        disabled={saving}
        className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving
          ? "Saving..."
          : "Save"}
      </button>
    </form>
  );
}
