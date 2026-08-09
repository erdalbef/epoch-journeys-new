"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  type: string;
};

type Rate = {
  id: string;
  serviceId: string | null;
  name: string;
  amount: string;
  currency: string;
  unit: string;
};

type Supplier = {
  id: string;
  name: string;
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

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function SupplierPayableForm({
  suppliers,
  tours,
  bookings,
}: {
  suppliers: Supplier[];
  tours: Tour[];
  bookings: Booking[];
}) {
  const router = useRouter();

  const [supplierId, setSupplierId] =
    useState("");

  const [serviceId, setServiceId] =
    useState("");

  const [rateId, setRateId] =
    useState("");

  const [tourId, setTourId] =
    useState("");

  const [
    departureDateId,
    setDepartureDateId,
  ] = useState("");

  const [bookingId, setBookingId] =
    useState("");

  const [currency, setCurrency] =
    useState("EUR");

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
  ] = useState("0");

  const [
    invoiceFile,
    setInvoiceFile,
  ] = useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const supplier =
    suppliers.find(
      (item) =>
        item.id === supplierId,
    );

  const selectedTour =
    tours.find(
      (item) =>
        item.id === tourId,
    );

  const services =
    supplier?.services ?? [];

  const rates =
    supplier?.rates.filter(
      (rate) =>
        !serviceId ||
        !rate.serviceId ||
        rate.serviceId ===
          serviceId,
    ) ?? [];

  const balancePreview =
    useMemo(() => {
      const approved =
        Number(
          approvedAmount || 0,
        );

      const credit =
        Number(
          creditAmount || 0,
        );

      return Math.max(
        0,
        approved - credit,
      );
    }, [
      approvedAmount,
      creditAmount,
    ]);

  function chooseSupplier(
    value: string,
  ) {
    setSupplierId(value);
    setServiceId("");
    setRateId("");

    const selected =
      suppliers.find(
        (item) =>
          item.id === value,
      );

    if (selected) {
      setCurrency(
        selected.defaultCurrency ||
          "EUR",
      );
    }
  }

  function chooseRate(
    value: string,
  ) {
    setRateId(value);

    const selected =
      rates.find(
        (item) =>
          item.id === value,
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

    if (!approvedAmount) {
      setApprovedAmount(
        selected.amount,
      );
    }

    if (selected.serviceId) {
      setServiceId(
        selected.serviceId,
      );
    }
  }

  function handleInvoiceFile(
    file: File | null,
  ) {
    if (!file) {
      setInvoiceFile(null);
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
        "Invoice file must be smaller than 10 MB.",
      );

      return;
    }

    setInvoiceFile(file);
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);

    const form =
      new FormData(
        event.currentTarget,
      );

    /*
     * The controlled file is explicitly
     * attached to the FormData.
     */
    if (invoiceFile) {
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
            method: "POST",
            body: form,
          },
        );

      const data =
        (await response
          .json()
          .catch(() => null)) as {
          error?: string;
          payable?: {
            id: string;
          };
          financeDocument?: {
            id: string;
          } | null;
        } | null;

      if (
        !response.ok ||
        !data?.payable?.id
      ) {
        throw new Error(
          data?.error ||
            "Failed to create supplier payable.",
        );
      }

      toast.success(
        invoiceFile
          ? "Supplier payable created and invoice stored in Finance Documents."
          : "Supplier payable created successfully.",
      );

      router.push(
        `/admin/supplier-payables/${data.payable.id}`,
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create supplier payable.",
      );

      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {/* ============================================== */}
      {/* SUPPLIER / SERVICE */}
      {/* ============================================== */}

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Supplier *">
          <select
            name="supplierId"
            required
            value={supplierId}
            onChange={(event) =>
              chooseSupplier(
                event.target.value,
              )
            }
            className="input"
          >
            <option value="">
              Select supplier...
            </option>

            {suppliers.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ),
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Service">
          <select
            name="serviceId"
            value={serviceId}
            onChange={(event) => {
              setServiceId(
                event.target.value,
              );

              setRateId("");
            }}
            disabled={!supplierId}
            className="input"
          >
            <option value="">
              General supplier
              service
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
                  {service.name} ·{" "}
                  {service.type.replaceAll(
                    "_",
                    " ",
                  )}
                </option>
              ),
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Contracted rate">
          <select
            name="rateId"
            value={rateId}
            onChange={(event) =>
              chooseRate(
                event.target.value,
              )
            }
            disabled={!supplierId}
            className="input"
          >
            <option value="">
              No rate / manual cost
            </option>

            {rates.map(
              (rate) => (
                <option
                  key={rate.id}
                  value={rate.id}
                >
                  {rate.name} ·{" "}
                  {rate.currency}{" "}
                  {rate.amount} /{" "}
                  {rate.unit.replaceAll(
                    "_",
                    " ",
                  )}
                </option>
              ),
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Currency *">
          <input
            name="currency"
            required
            value={currency}
            onChange={(event) =>
              setCurrency(
                event.target.value.toUpperCase(),
              )
            }
            maxLength={3}
            className="input"
          />
        </FieldLabel>
      </div>

      {/* ============================================== */}
      {/* AMOUNTS */}
      {/* ============================================== */}

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
            onChange={(event) =>
              setContractedAmount(
                event.target.value,
              )
            }
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Approved amount *">
          <input
            name="approvedAmount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={approvedAmount}
            onChange={(event) =>
              setApprovedAmount(
                event.target.value,
              )
            }
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Credit / reduction">
          <input
            name="creditAmount"
            type="number"
            min="0"
            step="0.01"
            value={creditAmount}
            onChange={(event) =>
              setCreditAmount(
                event.target.value,
              )
            }
            className="input"
          />
        </FieldLabel>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Initial balance
          after credit
        </p>

        <p className="mt-1 text-2xl font-bold text-[#001F3F]">
          {currency}{" "}
          {balancePreview.toFixed(
            2,
          )}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Payments recorded
          later will reduce this
          balance without creating
          another supplier cost.
        </p>
      </div>

      {/* ============================================== */}
      {/* INVOICE DETAILS */}
      {/* ============================================== */}

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Payable title *">
          <input
            name="title"
            required
            placeholder="e.g. Rome Hotel – May 2027 group"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Supplier invoice number">
          <input
            name="supplierInvoiceNumber"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Supplier reference">
          <input
            name="supplierReference"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Invoice date">
          <input
            name="invoiceDate"
            type="date"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Due date">
          <input
            name="dueDate"
            type="date"
            className="input"
          />
        </FieldLabel>
      </div>

      {/* ============================================== */}
      {/* SUPPLIER INVOICE UPLOAD */}
      {/* ============================================== */}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#8B0000] shadow-sm">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-950">
              Supplier Invoice
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Upload the supplier
              invoice once. It will
              also appear automatically
              in Finance Documents.
            </p>
          </div>
        </div>

        {!invoiceFile ? (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-7 text-center transition hover:border-[#001F3F]/40 hover:bg-slate-50">
            <Upload className="h-6 w-6 text-slate-400" />

            <span className="mt-2 text-sm font-semibold text-slate-700">
              Select invoice or
              supporting document
            </span>

            <span className="mt-1 text-xs text-slate-500">
              PDF, JPG, PNG or WEBP
              · Maximum 10 MB
            </span>

            <input
              name="invoiceFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handleInvoiceFile(
                  event.target
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
                  ).toFixed(2)}{" "}
                  MB
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setInvoiceFile(
                  null,
                )
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-[#8B0000]"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================== */}
      {/* TOUR / DEPARTURE / BOOKING */}
      {/* ============================================== */}

      <div className="grid gap-4 md:grid-cols-3">
        <FieldLabel label="Tour">
          <select
            name="tourId"
            value={tourId}
            onChange={(event) => {
              setTourId(
                event.target.value,
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
                  key={tour.id}
                  value={tour.id}
                >
                  {tour.title}
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
            onChange={(event) =>
              setDepartureDateId(
                event.target.value,
              )
            }
            disabled={!tourId}
            className="input"
          >
            <option value="">
              Not linked to a
              departure
            </option>

            {selectedTour?.departureDates.map(
              (departure) => (
                <option
                  key={
                    departure.id
                  }
                  value={
                    departure.id
                  }
                >
                  {new Date(
                    departure.date,
                  ).toLocaleDateString(
                    "en-GB",
                  )}
                </option>
              ),
            )}
          </select>
        </FieldLabel>

        <FieldLabel label="Booking">
          <select
            name="bookingId"
            value={bookingId}
            onChange={(event) =>
              setBookingId(
                event.target.value,
              )
            }
            className="input"
          >
            <option value="">
              Not linked to a
              booking
            </option>

            {bookings.map(
              (booking) => (
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
                  ·{" "}
                  {
                    booking.tourTitleSnapshot
                  }
                </option>
              ),
            )}
          </select>
        </FieldLabel>
      </div>

      {/* ============================================== */}
      {/* NOTES */}
      {/* ============================================== */}

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

      {/* ============================================== */}
      {/* ACTIONS */}
      {/* ============================================== */}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
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
          disabled={loading}
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
          border: 1px solid
            rgb(226 232 240);
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
          background: rgb(
            248 250 252
          );
          color: rgb(
            148 163 184
          );
        }
      `}</style>
    </form>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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