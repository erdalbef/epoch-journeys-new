"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Star,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  type: string;
  country: string | null;
  city: string | null;
  description: string | null;
  notes: string | null;
};

type Rate = {
  id: string;
  serviceId: string | null;
  name: string;
  description: string | null;
  validFrom: string;
  validTo: string;
  amount: string;
  currency: string;
  unit: string;
  roomType: string | null;
  mealBasis: string | null;
  minPax: number | null;
  maxPax: number | null;
  breakfastIncluded: boolean | null;
  dinnerIncluded: boolean | null;
  dinnerAmount: string | null;
  dinnerUnit: string | null;
  dinnerNotes: string | null;
  cityTaxIncluded: boolean;
  cityTaxAmount: string | null;
  cityTaxCurrency: string | null;
  cityTaxUnit: string | null;
  porterageAvailable: boolean | null;
  porterageIncluded: boolean | null;
  porterageAmount: string | null;
  porterageUnit: string | null;
  beveragePackageIncluded: boolean | null;
  beveragePackageDescription: string | null;
  beveragePackageAmount: string | null;
  beveragePackageUnit: string | null;
  beverageNotes: string | null;
  freePlaces: string | null;
  freePlaceRatio: number | null;
  freePlaceMax: number | null;
  freePlaceNotes: string | null;
  minimumRooms: number | null;
  minimumNights: number | null;
  rateRestrictions: string | null;
  supplements: string | null;
  reductions: string | null;
  singleSupplement: string | null;
  tripleReduction: string | null;
  childRate: string | null;
  extraBedRate: string | null;
  driverRoomIncluded: boolean | null;
  driverMealIncluded: boolean | null;
  guideRoomIncluded: boolean | null;
  guideMealIncluded: boolean | null;
  tourManagerRoomIncluded: boolean | null;
  tourManagerMealIncluded: boolean | null;
  cancellationTerms: string | null;
  paymentTerms: string | null;
  depositRequired: boolean | null;
  depositAmount: string | null;
  depositPercent: string | null;
  paymentDeadlineDays: number | null;
  rateSource: string | null;
  supplierReference: string | null;
  lastVerifiedAt: string | null;
  internalRateNotes: string | null;
  notes: string | null;
};

type Supplier = {
  id: string;
  name: string;
  preferred: boolean;
  country: string | null;
  city: string | null;
  defaultCurrency: string;
  services: Service[];
  rates: Rate[];
};

type Tour = {
  id: string;
  title: string;
  departureDates: Array<{
    id: string;
    date: string;
  }>;
};

type Booking = {
  id: string;
  bookingReference: string;
  bookingDisplayCode: string | null;
  tourTitleSnapshot: string;
};

type SupplierDocumentType =
  | "PROFORMA"
  | "DEPOSIT_INVOICE"
  | "FINAL_INVOICE"
  | "CREDIT_NOTE";

const DOCUMENT_TYPE_OPTIONS: Array<{
  value: SupplierDocumentType;
  label: string;
  help: string;
}> = [
  {
    value: "PROFORMA",
    label: "Proforma",
    help: "Operational payment request; kept outside final purchase invoices in Accounting.",
  },
  {
    value: "DEPOSIT_INVOICE",
    label: "Deposit Invoice",
    help: "Supplier invoice/request for an advance or deposit payment.",
  },
  {
    value: "FINAL_INVOICE",
    label: "Final Invoice",
    help: "Final supplier liability for the service or group.",
  },
  {
    value: "CREDIT_NOTE",
    label: "Credit Note",
    help: "Records a supplier credit. No payment will be due on this record.",
  },
];

const SERVICE_CATEGORY_OPTIONS = [
  ["ACCOMMODATION", "Hotels / Accommodation"],
  ["TRANSPORT", "Transportation / Coach / Transfers"],
  ["MEAL", "Restaurants / Meals"],
  ["GUIDE", "Local Guides"],
  ["TOUR_MANAGER", "Tour Managers"],
  ["ENTRANCE", "Entrance Fees / Attractions"],
  ["MASS_ARRANGEMENT", "Mass Arrangements"],
  ["CHURCH_RESERVATION", "Church / Shrine Reservations"],
  ["TICKET", "Tickets"],
  ["RAIL", "Rail"],
  ["FERRY", "Ferry"],
  ["CRUISE", "Cruise"],
  ["FLIGHT", "Flights"],
  ["INSURANCE", "Insurance"],
  ["DMC_SERVICE", "DMC / Ground Services"],
  ["OTHER", "Other"],
] as const;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function serviceTypeLabel(
  type: string,
) {
  const match =
    SERVICE_CATEGORY_OPTIONS.find(
      ([value]) =>
        value === type,
    );

  if (match) {
    return match[1];
  }

  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (value) =>
        value.toUpperCase(),
    );
}

function rateUnitLabel(
  unit: string,
) {
  return unit
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (value) =>
        value.toUpperCase(),
    );
}

function moneyValue(
  value: string | null,
  currency: string,
) {
  if (
    value === null ||
    value === ""
  ) {
    return "—";
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return `${currency} ${value}`;
  }

  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    },
  ).format(parsed);
}

function parseEuropeanDate(
  value: string,
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  const match =
    trimmed.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
    );

  if (!match) {
    return null;
  }

  const day =
    Number(match[1]);

  const month =
    Number(match[2]);

  const year =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12,
        0,
        0,
      ),
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return `${String(
    year,
  ).padStart(
    4,
    "0",
  )}-${String(
    month,
  ).padStart(
    2,
    "0",
  )}-${String(
    day,
  ).padStart(
    2,
    "0",
  )}`;
}

function europeanDateFromIso(
  value: string,
) {
  const directMatch =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (directMatch) {
    return `${directMatch[3]}/${directMatch[2]}/${directMatch[1]}`;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function formatDateTyping(
  value: string,
) {
  const digits =
    value
      .replace(
        /\D/g,
        "",
      )
      .slice(
        0,
        8,
      );

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  if (
    digits.length <= 4
  ) {
    return `${digits.slice(
      0,
      2,
    )}/${digits.slice(
      2,
    )}`;
  }

  return `${digits.slice(
    0,
    2,
  )}/${digits.slice(
    2,
    4,
  )}/${digits.slice(
    4,
  )}`;
}

function normalize(
  value:
    | string
    | null
    | undefined,
) {
  return value
    ?.trim()
    .toLocaleLowerCase() ??
    "";
}

function uniqueSorted(
  values: Array<
    string | null
  >,
) {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value?.trim() ??
            "",
        )
        .filter(Boolean),
    ),
  ).sort((a, b) =>
    a.localeCompare(b),
  );
}

function lowestRateAmount(
  supplier: Supplier,
  category: string,
  country: string,
  city: string,
) {
  const matchingServiceIds =
    new Set(
      supplier.services
        .filter(
          (service) =>
            service.type ===
              category &&
            (!country ||
              normalize(
                service.country ??
                  supplier.country,
              ) ===
                normalize(
                  country,
                )) &&
            (!city ||
              normalize(
                service.city ??
                  supplier.city,
              ) ===
                normalize(
                  city,
                )),
        )
        .map(
          (service) =>
            service.id,
        ),
    );

  const values =
    supplier.rates
      .filter(
        (rate) =>
          !rate.serviceId ||
          matchingServiceIds.has(
            rate.serviceId,
          ),
      )
      .map(
        (rate) =>
          Number(
            rate.amount,
          ),
      )
      .filter(
        (value) =>
          Number.isFinite(
            value,
          ),
      );

  return values.length
    ? Math.min(...values)
    : Number.POSITIVE_INFINITY;
}

export default function SupplierPayableForm({
  suppliers,
  tours,
  bookings,
}: {
  suppliers: Supplier[];
  tours: Tour[];
  bookings: Booking[];
}) {
  const router =
    useRouter();

  const [
    category,
    setCategory,
  ] = useState("");

  const [
    countryFilter,
    setCountryFilter,
  ] = useState("");

  const [
    cityFilter,
    setCityFilter,
  ] = useState("");

  const [
    supplierId,
    setSupplierId,
  ] = useState("");

  const [
    serviceId,
    setServiceId,
  ] = useState("");

  const [
    rateId,
    setRateId,
  ] = useState("");

  const [
    tourId,
    setTourId,
  ] = useState("");

  const [
    departureDateId,
    setDepartureDateId,
  ] = useState("");

  const [
    bookingId,
    setBookingId,
  ] = useState("");

  const [
    documentType,
    setDocumentType,
  ] = useState<SupplierDocumentType>(
    "FINAL_INVOICE",
  );

  const [
    currency,
    setCurrency,
  ] = useState(
    "EUR",
  );

  const [
    contractedAmount,
    setContractedAmount,
  ] = useState("");

  const [
    approvedAmount,
    setApprovedAmount,
  ] = useState("");

  const [
    creditAmount,
    setCreditAmount,
  ] = useState(
    "0",
  );

  const [
    invoiceDate,
    setInvoiceDate,
  ] = useState("");

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    invoiceFile,
    setInvoiceFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const countries =
    useMemo(
      () =>
        uniqueSorted(
          suppliers.flatMap(
            (supplier) =>
              supplier.services
                .filter(
                  (service) =>
                    !category ||
                    service.type ===
                      category,
                )
                .map(
                  (service) =>
                    service.country ??
                    supplier.country,
                ),
          ),
        ),
      [
        suppliers,
        category,
      ],
    );

  const cities =
    useMemo(
      () =>
        uniqueSorted(
          suppliers.flatMap(
            (supplier) =>
              supplier.services
                .filter(
                  (service) =>
                    (!category ||
                      service.type ===
                        category) &&
                    (!countryFilter ||
                      normalize(
                        service.country ??
                          supplier.country,
                      ) ===
                        normalize(
                          countryFilter,
                        )),
                )
                .map(
                  (service) =>
                    service.city ??
                    supplier.city,
                ),
          ),
        ),
      [
        suppliers,
        category,
        countryFilter,
      ],
    );

  const filteredSuppliers =
    useMemo(() => {
      if (!category) {
        return [];
      }

      return suppliers
        .filter(
          (supplier) =>
            supplier.services.some(
              (service) =>
                service.type ===
                  category &&
                (!countryFilter ||
                  normalize(
                    service.country ??
                      supplier.country,
                  ) ===
                    normalize(
                      countryFilter,
                    )) &&
                (!cityFilter ||
                  normalize(
                    service.city ??
                      supplier.city,
                  ) ===
                    normalize(
                      cityFilter,
                    )),
            ),
        )
        .slice()
        .sort((a, b) => {
          if (
            a.preferred !==
            b.preferred
          ) {
            return a.preferred
              ? -1
              : 1;
          }

          const aRate =
            lowestRateAmount(
              a,
              category,
              countryFilter,
              cityFilter,
            );

          const bRate =
            lowestRateAmount(
              b,
              category,
              countryFilter,
              cityFilter,
            );

          if (
            aRate !==
            bRate
          ) {
            return aRate - bRate;
          }

          return a.name.localeCompare(
            b.name,
          );
        });
    }, [
      suppliers,
      category,
      countryFilter,
      cityFilter,
    ]);

  const supplier =
    filteredSuppliers.find(
      (item) =>
        item.id ===
        supplierId,
    ) ??
    suppliers.find(
      (item) =>
        item.id ===
        supplierId,
    );

  const services =
    useMemo(
      () =>
        supplier?.services.filter(
          (service) =>
            (!category ||
              service.type ===
                category) &&
            (!countryFilter ||
              normalize(
                service.country ??
                  supplier.country,
              ) ===
                normalize(
                  countryFilter,
                )) &&
            (!cityFilter ||
              normalize(
                service.city ??
                  supplier.city,
              ) ===
                normalize(
                  cityFilter,
                )),
        ) ?? [],
      [
        supplier,
        category,
        countryFilter,
        cityFilter,
      ],
    );

  const selectedService =
    services.find(
      (item) =>
        item.id ===
        serviceId,
    ) ?? null;

  const rates =
    useMemo(
      () =>
        (supplier?.rates.filter(
          (rate) =>
            !serviceId ||
            !rate.serviceId ||
            rate.serviceId ===
              serviceId,
        ) ?? [])
          .slice()
          .sort(
            (a, b) => {
              const amountA =
                Number(
                  a.amount,
                );

              const amountB =
                Number(
                  b.amount,
                );

              if (
                Number.isFinite(
                  amountA,
                ) &&
                Number.isFinite(
                  amountB,
                ) &&
                amountA !==
                  amountB
              ) {
                return amountA -
                  amountB;
              }

              return a.name.localeCompare(
                b.name,
              );
            },
          ),
      [
        supplier,
        serviceId,
      ],
    );

  const selectedRate =
    rates.find(
      (item) =>
        item.id ===
        rateId,
    ) ?? null;

  const selectedTour =
    tours.find(
      (item) =>
        item.id ===
        tourId,
    );

  const balancePreview =
    useMemo(() => {
      const approved =
        Number(
          approvedAmount ||
            0,
        );

      const credit =
        Number(
          creditAmount ||
            0,
        );

      if (
        documentType ===
        "CREDIT_NOTE"
      ) {
        return 0;
      }

      return Math.max(
        0,
        approved -
          credit,
      );
    }, [
      approvedAmount,
      creditAmount,
      documentType,
    ]);

  function resetSupplierChoice() {
    setSupplierId("");
    setServiceId("");
    setRateId("");
    setContractedAmount("");
  }

  function chooseCategory(
    value: string,
  ) {
    setCategory(
      value,
    );
    setCountryFilter("");
    setCityFilter("");
    resetSupplierChoice();
  }

  function chooseCountry(
    value: string,
  ) {
    setCountryFilter(
      value,
    );
    setCityFilter("");
    resetSupplierChoice();
  }

  function chooseCity(
    value: string,
  ) {
    setCityFilter(
      value,
    );
    resetSupplierChoice();
  }

  function chooseSupplier(
    value: string,
  ) {
    setSupplierId(
      value,
    );

    setRateId(
      "",
    );

    const selected =
      filteredSuppliers.find(
        (item) =>
          item.id ===
          value,
      ) ??
      suppliers.find(
        (item) =>
          item.id ===
          value,
      );

    if (!selected) {
      setServiceId(
        "",
      );

      return;
    }

    setCurrency(
      selected.defaultCurrency ||
        "EUR",
    );

    const matchingServices =
      selected.services.filter(
        (service) =>
          (!category ||
            service.type ===
              category) &&
          (!countryFilter ||
            normalize(
              service.country ??
                selected.country,
            ) ===
              normalize(
                countryFilter,
              )) &&
          (!cityFilter ||
            normalize(
              service.city ??
                selected.city,
            ) ===
              normalize(
                cityFilter,
              )),
      );

    setServiceId(
      matchingServices.length ===
        1
        ? matchingServices[0].id
        : "",
    );
  }

  function chooseRate(
    value: string,
  ) {
    setRateId(
      value,
    );

    const selected =
      rates.find(
        (item) =>
          item.id ===
          value,
      );

    if (!selected) {
      return;
    }

    setCurrency(
      selected.currency,
    );

    setContractedAmount(
      selected.amount,
    );

    if (
      !approvedAmount
    ) {
      setApprovedAmount(
        selected.amount,
      );
    }

    if (
      selected.serviceId
    ) {
      setServiceId(
        selected.serviceId,
      );
    }
  }

  function handleInvoiceFile(
    file:
      | File
      | null,
  ) {
    if (!file) {
      setInvoiceFile(
        null,
      );
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        file.type,
      )
    ) {
      toast.error(
        "Only PDF, JPG, PNG and WEBP files are allowed.",
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      toast.error(
        "Supplier document file must be smaller than 10 MB.",
      );

      return;
    }

    setInvoiceFile(
      file,
    );
  }

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (
      invoiceFile &&
      !serviceId
    ) {
      toast.error(
        "Please select the supplier service so the invoice can be classified correctly in Accounting.",
      );

      return;
    }

    const parsedInvoiceDate =
      parseEuropeanDate(
        invoiceDate,
      );

    if (
      invoiceDate &&
      !parsedInvoiceDate
    ) {
      toast.error(
        "Invoice date must use DD/MM/YYYY format.",
      );

      return;
    }

    const parsedDueDate =
      parseEuropeanDate(
        dueDate,
      );

    if (
      dueDate &&
      !parsedDueDate
    ) {
      toast.error(
        "Due date must use DD/MM/YYYY format.",
      );

      return;
    }

    setLoading(
      true,
    );

    const form =
      new FormData(
        event.currentTarget,
      );

    form.set(
      "documentType",
      documentType,
    );

    form.set(
      "tourId",
      tourId,
    );

    form.set(
      "departureDateId",
      departureDateId,
    );

    form.set(
      "bookingId",
      bookingId,
    );

    form.set(
      "invoiceDate",
      parsedInvoiceDate ||
        "",
    );

    form.set(
      "dueDate",
      parsedDueDate ||
        "",
    );

    if (
      invoiceFile
    ) {
      form.set(
        "invoiceFile",
        invoiceFile,
      );
    }

    try {
      const response =
        await fetch(
          "/api/admin/supplier-payables",
          {
            method:
              "POST",
            body:
              form,
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () =>
              null,
          )) as {
          error?: string;

          payable?: {
            id: string;
          };

          financeDocument?: {
            id: string;
          } | null;

          accounting?: {
            category?: string;
            subcategory?: string;
          };
        } | null;

      if (
        !response.ok ||
        !data?.payable
          ?.id
      ) {
        throw new Error(
          data?.error ||
            "Failed to create supplier payable.",
        );
      }

      toast.success(
        invoiceFile
          ? `Supplier payable created. Document added to Accounting${
              data.accounting?.subcategory
                ? ` / ${data.accounting.subcategory}`
                : ""
            }.`
          : "Supplier payable created successfully.",
      );

      router.push(
        `/admin/supplier-payables/${data.payable.id}`,
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Failed to create supplier payable.",
      );

      setLoading(
        false,
      );
    }
  }

  const showCountry =
    category ===
      "GUIDE" ||
    category ===
      "TOUR_MANAGER" ||
    category ===
      "TRANSPORT" ||
    category ===
      "DMC_SERVICE";

  const showCity =
    category !== "";

  return (
    <form
      onSubmit={
        submit
      }
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Supplier Selection
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the service category and location first. Preferred suppliers are listed first,
            followed by suppliers with the lower matching rate.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FieldLabel label="Supplier category *">
            <select
              required
              value={
                category
              }
              onChange={(
                event,
              ) =>
                chooseCategory(
                  event
                    .target
                    .value,
                )
              }
              className="input"
            >
              <option value="">
                Select category...
              </option>

              {SERVICE_CATEGORY_OPTIONS.map(
                ([
                  value,
                  label,
                ]) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {label}
                  </option>
                ),
              )}
            </select>
          </FieldLabel>

          {showCountry && (
            <FieldLabel label="Country">
              <select
                value={
                  countryFilter
                }
                onChange={(
                  event,
                ) =>
                  chooseCountry(
                    event
                      .target
                      .value,
                  )
                }
                className="input"
              >
                <option value="">
                  All countries
                </option>

                {countries.map(
                  (country) => (
                    <option
                      key={
                        country
                      }
                      value={
                        country
                      }
                    >
                      {country}
                    </option>
                  ),
                )}
              </select>
            </FieldLabel>
          )}

          {showCity && (
            <FieldLabel
              label={
                category ===
                "GUIDE"
                  ? "City / Region"
                  : "City / Operating area"
              }
            >
              <select
                value={
                  cityFilter
                }
                onChange={(
                  event,
                ) =>
                  chooseCity(
                    event
                      .target
                      .value,
                  )
                }
                className="input"
              >
                <option value="">
                  All locations
                </option>

                {cities.map(
                  (city) => (
                    <option
                      key={
                        city
                      }
                      value={
                        city
                      }
                    >
                      {city}
                    </option>
                  ),
                )}
              </select>
            </FieldLabel>
          )}

          <FieldLabel label="Supplier *">
            <select
              name="supplierId"
              required
              value={
                supplierId
              }
              onChange={(
                event,
              ) =>
                chooseSupplier(
                  event
                    .target
                    .value,
                )
              }
              disabled={
                !category
              }
              className="input"
            >
              <option value="">
                {!category
                  ? "Select category first..."
                  : filteredSuppliers.length ===
                      0
                    ? "No matching suppliers"
                    : "Select supplier..."}
              </option>

              {filteredSuppliers.map(
                (item) => {
                  const lowest =
                    lowestRateAmount(
                      item,
                      category,
                      countryFilter,
                      cityFilter,
                    );

                  return (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {item.preferred
                        ? "★ "
                        : ""}
                      {item.name}
                      {Number.isFinite(
                        lowest,
                      )
                        ? ` · from ${lowest.toFixed(
                            2,
                          )}`
                        : ""}
                    </option>
                  );
                },
              )}
            </select>

            {supplier?.preferred && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                Preferred supplier
              </p>
            )}
          </FieldLabel>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FieldLabel label="Supplier service">
            <select
              name="serviceId"
              value={
                serviceId
              }
              onChange={(
                event,
              ) => {
                setServiceId(
                  event
                    .target
                    .value,
                );

                setRateId(
                  "",
                );
              }}
              disabled={
                !supplierId
              }
              className="input"
            >
              <option value="">
                {supplierId
                  ? services.length >
                    0
                    ? "Select service..."
                    : "No matching active service"
                  : "Select supplier first..."}
              </option>

              {services.map(
                (
                  service,
                ) => (
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
                    )}
                    {" - "}
                    {service.name}
                    {service.city
                      ? ` · ${service.city}`
                      : ""}
                    {service.country
                      ? `, ${service.country}`
                      : ""}
                  </option>
                ),
              )}
            </select>

            {supplierId &&
              services.length ===
                0 && (
                <p className="mt-1.5 text-xs text-amber-700">
                  This supplier has no active service matching the selected category/location.
                </p>
              )}

            {selectedService && (
              <p className="mt-1.5 text-xs text-slate-500">
                Accounting classification will be based on{" "}
                <span className="font-semibold text-slate-700">
                  {serviceTypeLabel(
                    selectedService.type,
                  )}
                </span>
                .
              </p>
            )}
          </FieldLabel>

          <FieldLabel label="Supplier rate">
            <select
              name="rateId"
              value={
                rateId
              }
              onChange={(
                event,
              ) =>
                chooseRate(
                  event
                    .target
                    .value,
                )
              }
              disabled={
                !supplierId
              }
              className="input"
            >
              <option value="">
                {supplierId
                  ? rates.length >
                    0
                    ? "Select contracted rate..."
                    : "No active rates"
                  : "Select supplier first..."}
              </option>

              {rates.map(
                (rate) => (
                  <option
                    key={
                      rate.id
                    }
                    value={
                      rate.id
                    }
                  >
                    {rate.name}
                    {" · "}
                    {rate.currency}
                    {" "}
                    {Number(
                      rate.amount,
                    ).toFixed(
                      2,
                    )}
                    {" · "}
                    {rateUnitLabel(
                      rate.unit,
                    )}
                  </option>
                ),
              )}
            </select>

            {rates.length >
              1 && (
              <p className="mt-1.5 text-xs text-slate-500">
                Rates are listed from lower to higher base rate.
              </p>
            )}
          </FieldLabel>

          <FieldLabel label="Currency *">
            <input
              name="currency"
              required
              value={
                currency
              }
              onChange={(
                event,
              ) =>
                setCurrency(
                  event.target.value.toUpperCase(),
                )
              }
              maxLength={
                3
              }
              className="input"
            />
          </FieldLabel>
        </div>

        {selectedRate && (
          <RateReference
            category={
              category
            }
            rate={
              selectedRate
            }
          />
        )}

        {category ===
          "GUIDE" && (
          <p className="mt-4 text-xs text-slate-500">
            Guide filtering currently uses country and city/region. A dedicated guide-language field
            is not yet stored in Supplier Service/Rate data, so language filtering should be added
            later rather than inferred from notes.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Agency / Parish / Group">
          <input
            name="agencyGroupName"
            placeholder="e.g. GLORY TOURS / JOSSIE or St. Mary's Parish"
            className="input"
          />
        </FieldLabel>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <FieldLabel label="Supplier document type *">
            <select
              name="documentType"
              value={documentType}
              onChange={(event) => {
                const next = event.target.value as SupplierDocumentType;
                setDocumentType(next);
                if (next === "CREDIT_NOTE") {
                  setCreditAmount(approvedAmount || "0");
                }
              }}
              className="input"
              required
            >
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldLabel>

          <div className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">
              {DOCUMENT_TYPE_OPTIONS.find((item) => item.value === documentType)?.label}
            </p>
            <p className="mt-1">
              {DOCUMENT_TYPE_OPTIONS.find((item) => item.value === documentType)?.help}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Epoch will assign the internal supplier-payable reference automatically after saving.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldLabel label="Contracted amount">
          <input
            name="contractedAmount"
            type="number"
            min="0"
            step="0.01"
            value={
              contractedAmount
            }
            onChange={(
              event,
            ) =>
              setContractedAmount(
                event
                  .target
                  .value,
              )
            }
            className="input"
          />
        </FieldLabel>

        <FieldLabel
          label={
            documentType === "CREDIT_NOTE"
              ? "Credit note amount *"
              : "Approved amount *"
          }
        >
          <input
            name="approvedAmount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={
              approvedAmount
            }
            onChange={(event) => {
              setApprovedAmount(event.target.value);
              if (documentType === "CREDIT_NOTE") {
                setCreditAmount(event.target.value || "0");
              }
            }}
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Credit / reduction">
          <input
            name="creditAmount"
            type="number"
            min="0"
            step="0.01"
            value={
              documentType === "CREDIT_NOTE"
                ? approvedAmount || "0"
                : creditAmount
            }
            onChange={(event) =>
              setCreditAmount(event.target.value)
            }
            disabled={documentType === "CREDIT_NOTE"}
            className="input disabled:bg-slate-100"
          />
        </FieldLabel>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Initial balance after credit
        </p>

        <p className="mt-1 text-2xl font-bold text-[#001F3F]">
          {currency}{" "}
          {balancePreview.toFixed(
            2,
          )}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Payments recorded later will reduce this balance without creating another supplier cost.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Payable title *">
          <input
            name="title"
            required
            placeholder="e.g. Rome Hotel - May 2027 group"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Supplier document number">
          <input
            name="supplierInvoiceNumber"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Supplier reference (optional)">
          <input
            name="supplierReference"
            placeholder="Reservation / confirmation / order reference"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Document date">
          <EuropeanDateInput
            value={
              invoiceDate
            }
            onChange={
              setInvoiceDate
            }
          />
        </FieldLabel>

        <FieldLabel label="Due date">
          <EuropeanDateInput
            value={
              dueDate
            }
            onChange={
              setDueDate
            }
          />
        </FieldLabel>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#8B0000] shadow-sm">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-950">
              Supplier Document
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Upload the supplier document once. It will automatically appear in Finance Documents
              and in the monthly Accounting package.
            </p>
          </div>
        </div>

        {!invoiceFile ? (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-7 text-center transition hover:border-[#001F3F]/40 hover:bg-slate-50">
            <Upload className="h-6 w-6 text-slate-400" />

            <span className="mt-2 text-sm font-semibold text-slate-700">
              Select invoice or supporting document
            </span>

            <span className="mt-1 text-xs text-slate-500">
              PDF, JPG, PNG or WEBP - Maximum 10 MB
            </span>

            <input
              name="invoiceFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(
                event,
              ) =>
                handleInvoiceFile(
                  event
                    .target
                    .files?.[0] ??
                    null,
                )
              }
              className="sr-only"
            />
          </label>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#8B0000]">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {
                    invoiceFile.name
                  }
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {(
                    invoiceFile.size /
                    1024 /
                    1024
                  ).toFixed(
                    2,
                  )}{" "}
                  MB
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(invoiceFile);
                  window.open(url, "_blank", "noopener,noreferrer");
                  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
                }}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#001F3F] hover:bg-slate-50"
              >
                View Document
              </button>

              <button
                type="button"
                onClick={() => setInvoiceFile(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-[#8B0000]"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldLabel label="Tour">
          <select
            name="tourId"
            value={
              tourId
            }
            onChange={(
              event,
            ) => {
              setTourId(
                event
                  .target
                  .value,
              );

              setDepartureDateId(
                "",
              );
            }}
            className="input"
          >
            <option value="">
              Not linked to a tour
            </option>

            {tours.map(
              (tour) => (
                <option
                  key={
                    tour.id
                  }
                  value={
                    tour.id
                  }
                >
                  {
                    tour.title
                  }
                </option>
              ),
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Departure">
          <select
            name="departureDateId"
            value={
              departureDateId
            }
            onChange={(
              event,
            ) =>
              setDepartureDateId(
                event
                  .target
                  .value,
              )
            }
            disabled={
              !tourId
            }
            className="input"
          >
            <option value="">
              Not linked to a departure
            </option>

            {selectedTour?.departureDates.map(
              (
                departure,
              ) => (
                <option
                  key={
                    departure.id
                  }
                  value={
                    departure.id
                  }
                >
                  {europeanDateFromIso(
                    departure.date,
                  )}
                </option>
              ),
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Booking">
          <select
            name="bookingId"
            value={
              bookingId
            }
            onChange={(
              event,
            ) =>
              setBookingId(
                event
                  .target
                  .value,
              )
            }
            className="input"
          >
            <option value="">
              Not linked to a booking
            </option>

            {bookings.map(
              (
                booking,
              ) => (
                <option
                  key={
                    booking.id
                  }
                  value={
                    booking.id
                  }
                >
                  {booking.bookingDisplayCode ||
                    booking.bookingReference}{" "}
                  -{" "}
                  {
                    booking.tourTitleSnapshot
                  }
                </option>
              ),
            )}
          </select>
        </FieldLabel>
      </div>

      <FieldLabel label="Description">
        <textarea
          name="description"
          rows={3}
          className="input py-2"
        />
      </FieldLabel>

      <FieldLabel label="Internal notes">
        <textarea
          name="internalNotes"
          rows={4}
          className="input py-2"
        />
      </FieldLabel>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={
            loading
          }
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#760000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : "Create Payable"}
        </button>

        <button
          type="submit"
          name="submitForApproval"
          value="true"
          disabled={
            loading
          }
          className="rounded-xl bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d59] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : "Create & Submit for Approval"}
        </button>
      </div>

      <style jsx>{`
        .input {
          height: 44px;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }

        textarea.input {
          height: auto;
        }

        .input:focus {
          border-color: #001f3f;
        }

        .input:disabled {
          background: rgb(248 250 252);
          color: rgb(148 163 184);
        }
      `}</style>
    </form>
  );
}

function RateReference({
  category,
  rate,
}: {
  category: string;
  rate: Rate;
}) {
  const isHotel =
    category ===
    "ACCOMMODATION";

  const isRestaurant =
    category ===
    "MEAL";

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Selected rate reference
          </p>

          <p className="mt-1 font-semibold text-slate-950">
            {rate.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Valid {europeanDateFromIso(rate.validFrom)} - {europeanDateFromIso(rate.validTo)}
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold text-[#001F3F]">
            {moneyValue(
              rate.amount,
              rate.currency,
            )}
          </p>

          <p className="text-xs text-slate-500">
            {rateUnitLabel(
              rate.unit,
            )}
          </p>
        </div>
      </div>

      {(isHotel ||
        isRestaurant) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isHotel && (
            <>
              <ReferenceItem
                label="Meal basis"
                value={
                  rate.mealBasis ||
                  "—"
                }
              />

              <ReferenceItem
                label="Dinner"
                value={
                  rate.dinnerIncluded ===
                  true
                    ? "Included"
                    : rate.dinnerAmount
                      ? `${moneyValue(
                          rate.dinnerAmount,
                          rate.currency,
                        )} / ${rate.dinnerUnit ? rateUnitLabel(rate.dinnerUnit) : "unit"}`
                      : "Not included / no supplement stored"
                }
              />

              <ReferenceItem
                label="City tax"
                value={
                  rate.cityTaxIncluded
                    ? "Included"
                    : rate.cityTaxAmount
                      ? `${moneyValue(
                          rate.cityTaxAmount,
                          rate.cityTaxCurrency ||
                            rate.currency,
                        )} / ${rate.cityTaxUnit ? rateUnitLabel(rate.cityTaxUnit) : "unit"}`
                      : "No additional amount stored"
                }
              />

              <ReferenceItem
                label="Porterage"
                value={
                  rate.porterageIncluded ===
                  true
                    ? "Included"
                    : rate.porterageAvailable ===
                        false
                      ? "Not available"
                      : rate.porterageAmount
                        ? `${moneyValue(
                            rate.porterageAmount,
                            rate.currency,
                          )} / ${rate.porterageUnit ? rateUnitLabel(rate.porterageUnit) : "unit"}`
                        : "Not included / no amount stored"
                }
              />
            </>
          )}

          <ReferenceItem
            label="Drinks / beverage package"
            value={
              rate.beveragePackageIncluded ===
              true
                ? rate.beveragePackageDescription ||
                  "Included"
                : rate.beveragePackageAmount
                  ? `${moneyValue(
                      rate.beveragePackageAmount,
                      rate.currency,
                    )} / ${rate.beveragePackageUnit ? rateUnitLabel(rate.beveragePackageUnit) : "unit"}${
                      rate.beveragePackageDescription
                        ? ` · ${rate.beveragePackageDescription}`
                        : ""
                    }`
                  : rate.beveragePackageDescription ||
                    "No additional package stored"
            }
          />

          {isRestaurant && (
            <ReferenceItem
              label="Meal basis / description"
              value={
                rate.mealBasis ||
                rate.description ||
                "—"
              }
            />
          )}
        </div>
      )}

      {(rate.rateRestrictions ||
        rate.paymentTerms ||
        rate.cancellationTerms) && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {rate.rateRestrictions && (
            <ReferenceItem
              label="Restrictions"
              value={
                rate.rateRestrictions
              }
            />
          )}

          {rate.paymentTerms && (
            <ReferenceItem
              label="Payment terms"
              value={
                rate.paymentTerms
              }
            />
          )}

          {rate.cancellationTerms && (
            <ReferenceItem
              label="Cancellation"
              value={
                rate.cancellationTerms
              }
            />
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        This rate is a reference. The contracted and approved payable amounts remain editable so the
        actual supplier document can be recorded correctly.
      </p>
    </div>
  );
}

function ReferenceItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function EuropeanDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  const pickerRef =
    useRef<HTMLInputElement>(
      null,
    );

  const isoValue =
    parseEuropeanDate(
      value,
    ) || "";

  function openCalendar() {
    const picker =
      pickerRef.current;

    if (!picker) {
      return;
    }

    if (
      typeof picker.showPicker ===
      "function"
    ) {
      picker.showPicker();
      return;
    }

    picker.click();
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        value={value}
        maxLength={10}
        onChange={(
          event,
        ) =>
          onChange(
            formatDateTyping(
              event
                .target
                .value,
            ),
          )
        }
        className="input pr-12"
      />

      <button
        type="button"
        onClick={
          openCalendar
        }
        className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#001F3F]"
        title="Open calendar"
        aria-label="Open calendar"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      <input
        ref={
          pickerRef
        }
        type="date"
        tabIndex={-1}
        value={
          isoValue
        }
        onChange={(
          event,
        ) => {
          const value =
            event
              .target
              .value;

          if (!value) {
            onChange(
              "",
            );
            return;
          }

          const [
            year,
            month,
            day,
          ] =
            value.split(
              "-",
            );

          onChange(
            `${day}/${month}/${year}`,
          );
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}
