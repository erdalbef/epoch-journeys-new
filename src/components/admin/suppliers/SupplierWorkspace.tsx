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
  minPax: number | null;
  maxPax: number | null;
  isActive: boolean;
  service: {
    id: string;
    name: string;
  } | null;
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

          {panel ===
            "contracts" && (
            <ContractForm
              onSubmit={(
                data,
              ) =>
                submit(
                  `/api/admin/suppliers/${supplier.id}/contracts`,
                  data,
                )
              }
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

                    <Badge>
                      {item.isActive
                        ? "Active"
                        : "Inactive"}
                    </Badge>
                  </div>
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

        {panel ===
          "contracts" && (
          <div className="space-y-3">
            {supplier.contracts.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {
                          item.title
                        }
                      </p>

                      <p className="text-sm text-slate-500">
                        {item.reference ||
                          "No reference"}{" "}
                        ·{" "}
                        {date(
                          item.validFrom,
                        )}{" "}
                        →{" "}
                        {date(
                          item.validTo,
                        )}
                      </p>
                    </div>

                    <Badge>
                      {
                        item.status
                      }
                    </Badge>
                  </div>

                  {item.documentUrl && (
                    <a
                      href={
                        item.documentUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-[#8B0000]"
                    >
                      Open document
                    </a>
                  )}
                </div>
              ),
            )}

            {supplier.contracts
              .length ===
              0 && (
              <Empty
                icon={
                  FileText
                }
                text="No contracts recorded yet."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
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

function RateForm({
  services,
  onSubmit,
}: {
  services: Service[];
  onSubmit: (
    data: Record<
      string,
      unknown
    >,
  ) => Promise<void>;
}) {
  const units = [
    "PER_PERSON",
    "PER_PERSON_PER_DAY",
    "PER_PERSON_PER_NIGHT",
    "PER_ROOM",
    "PER_ROOM_PER_NIGHT",
    "PER_GROUP",
    "PER_DAY",
    "PER_HALF_DAY",
    "PER_HOUR",
    "PER_TRANSFER",
    "PER_VEHICLE",
    "PER_MEAL",
    "PER_TICKET",
    "FLAT_RATE",
  ];

  const [form, setForm] =
    useState({
      serviceId: "",
      name: "",
      validFrom: "",
      validTo: "",
      currency: "EUR",
      amount: "",
      unit: "PER_PERSON",
      roomType: "",
      mealBasis: "",
      minPax: "",
      maxPax: "",
    });

  return (
    <MiniForm
      submit={() =>
        onSubmit({
          ...form,
          amount: Number(
            form.amount,
          ),
          minPax:
            form.minPax
              ? Number(
                  form.minPax,
                )
              : null,
          maxPax:
            form.maxPax
              ? Number(
                  form.maxPax,
                )
              : null,
          serviceId:
            form.serviceId ||
            null,
          roomType:
            form.roomType ||
            null,
        })
      }
    >
      <select
        className={field}
        value={
          form.serviceId
        }
        onChange={(event) =>
          setForm({
            ...form,
            serviceId:
              event.target
                .value,
          })
        }
      >
        <option value="">
          General rate
        </option>

        {services.map(
          (service) => (
            <option
              key={
                service.id
              }
              value={
                service.id
              }
            >
              {serviceTypeLabel(
                service.type,
              )}{" "}
              -{" "}
              {
                service.name
              }
            </option>
          ),
        )}
      </select>

      <input
        required
        placeholder="Rate name"
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

      <input
        required
        type="date"
        className={field}
        value={
          form.validFrom
        }
        onChange={(event) =>
          setForm({
            ...form,
            validFrom:
              event.target
                .value,
          })
        }
      />

      <input
        required
        type="date"
        className={field}
        value={form.validTo}
        onChange={(event) =>
          setForm({
            ...form,
            validTo:
              event.target
                .value,
          })
        }
      />

      <input
        required
        type="number"
        step="0.01"
        placeholder="Amount"
        className={field}
        value={form.amount}
        onChange={(event) =>
          setForm({
            ...form,
            amount:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Currency"
        className={field}
        value={
          form.currency
        }
        onChange={(event) =>
          setForm({
            ...form,
            currency:
              event.target.value.toUpperCase(),
          })
        }
      />

      <select
        className={field}
        value={form.unit}
        onChange={(event) =>
          setForm({
            ...form,
            unit:
              event.target
                .value,
          })
        }
      >
        {units.map(
          (unit) => (
            <option
              key={unit}
              value={unit}
            >
              {rateUnitLabel(
                unit,
              )}
            </option>
          ),
        )}
      </select>

      <select
        className={field}
        value={
          form.roomType
        }
        onChange={(event) =>
          setForm({
            ...form,
            roomType:
              event.target
                .value,
          })
        }
      >
        <option value="">
          No room type
        </option>
        <option value="SINGLE">
          Single
        </option>
        <option value="DOUBLE_TWIN">
          Double / Twin
        </option>
        <option value="TRIPLE">
          Triple
        </option>
      </select>

      <input
        placeholder="Meal basis"
        className={field}
        value={
          form.mealBasis
        }
        onChange={(event) =>
          setForm({
            ...form,
            mealBasis:
              event.target
                .value,
          })
        }
      />

      <input
        type="number"
        placeholder="Min pax"
        className={field}
        value={form.minPax}
        onChange={(event) =>
          setForm({
            ...form,
            minPax:
              event.target
                .value,
          })
        }
      />

      <input
        type="number"
        placeholder="Max pax"
        className={field}
        value={form.maxPax}
        onChange={(event) =>
          setForm({
            ...form,
            maxPax:
              event.target
                .value,
          })
        }
      />
    </MiniForm>
  );
}

function ContractForm({
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
      title: "",
      reference: "",
      status: "ACTIVE",
      validFrom: "",
      validTo: "",
      currency: "EUR",
      documentUrl: "",
    });

  return (
    <MiniForm
      submit={() =>
        onSubmit(form)
      }
    >
      <input
        required
        placeholder="Contract title"
        className={field}
        value={form.title}
        onChange={(event) =>
          setForm({
            ...form,
            title:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Reference"
        className={field}
        value={
          form.reference
        }
        onChange={(event) =>
          setForm({
            ...form,
            reference:
              event.target
                .value,
          })
        }
      />

      <select
        className={field}
        value={form.status}
        onChange={(event) =>
          setForm({
            ...form,
            status:
              event.target
                .value,
          })
        }
      >
        {[
          "DRAFT",
          "ACTIVE",
          "EXPIRED",
          "TERMINATED",
          "ARCHIVED",
        ].map(
          (status) => (
            <option
              key={
                status
              }
              value={
                status
              }
            >
              {status}
            </option>
          ),
        )}
      </select>

      <input
        type="date"
        className={field}
        value={
          form.validFrom
        }
        onChange={(event) =>
          setForm({
            ...form,
            validFrom:
              event.target
                .value,
          })
        }
      />

      <input
        type="date"
        className={field}
        value={form.validTo}
        onChange={(event) =>
          setForm({
            ...form,
            validTo:
              event.target
                .value,
          })
        }
      />

      <input
        placeholder="Document URL/path"
        className={field}
        value={
          form.documentUrl
        }
        onChange={(event) =>
          setForm({
            ...form,
            documentUrl:
              event.target
                .value,
          })
        }
      />
    </MiniForm>
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