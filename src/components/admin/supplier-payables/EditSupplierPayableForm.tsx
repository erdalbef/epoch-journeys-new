"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, Upload, X } from "lucide-react";
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

type SupplierDocumentType =
  | "PROFORMA"
  | "DEPOSIT_INVOICE"
  | "FINAL_INVOICE"
  | "CREDIT_NOTE";

type Payable = {
  id: string;
  supplierId: string;
  serviceId: string | null;
  rateId: string | null;
  tourId: string | null;
  departureDateId: string | null;
  bookingId: string | null;
  documentType: SupplierDocumentType;
  title: string;
  description: string | null;
  agencyGroupName: string | null;
  supplierInvoiceNumber: string | null;
  supplierReference: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string;
  contractedAmount: string | null;
  approvedAmount: string;
  creditAmount: string;
  amountPaid: string;
  internalNotes: string | null;
  approvalStatus: string;
  document: {
    id: string;
    originalFileName: string;
    storagePath: string;
  } | null;
};

const DOCUMENT_TYPE_OPTIONS: Array<{
  value: SupplierDocumentType;
  label: string;
}> = [
  { value: "PROFORMA", label: "Proforma" },
  { value: "DEPOSIT_INVOICE", label: "Deposit Invoice" },
  { value: "FINAL_INVOICE", label: "Final Invoice" },
  { value: "CREDIT_NOTE", label: "Credit Note" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatDateTyping(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseEuropeanDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function europeanDateFromIso(value: string | null) {
  if (!value) return "";

  const directMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) {
    return `${directMatch[3]}/${directMatch[2]}/${directMatch[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function serviceTypeLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function rateUnitLabel(unit: string) {
  return unit
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export default function EditSupplierPayableForm({
  payable,
  suppliers,
  tours,
  bookings,
}: {
  payable: Payable;
  suppliers: Supplier[];
  tours: Tour[];
  bookings: Booking[];
}) {
  const router = useRouter();

  const [supplierId, setSupplierId] = useState(payable.supplierId);
  const [serviceId, setServiceId] = useState(payable.serviceId || "");
  const [rateId, setRateId] = useState(payable.rateId || "");
  const [tourId, setTourId] = useState(payable.tourId || "");
  const [departureDateId, setDepartureDateId] = useState(
    payable.departureDateId || "",
  );
  const [bookingId, setBookingId] = useState(payable.bookingId || "");
  const [documentType, setDocumentType] = useState<SupplierDocumentType>(
    payable.documentType,
  );
  const [currency, setCurrency] = useState(payable.currency);
  const [contractedAmount, setContractedAmount] = useState(
    payable.contractedAmount || "",
  );
  const [approvedAmount, setApprovedAmount] = useState(payable.approvedAmount);
  const [creditAmount, setCreditAmount] = useState(payable.creditAmount);
  const [invoiceDate, setInvoiceDate] = useState(
    europeanDateFromIso(payable.invoiceDate),
  );
  const [dueDate, setDueDate] = useState(europeanDateFromIso(payable.dueDate));
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [removeExistingDocument, setRemoveExistingDocument] = useState(false);
  const [loading, setLoading] = useState(false);

  const supplier = suppliers.find((item) => item.id === supplierId);
  const selectedTour = tours.find((item) => item.id === tourId);
  const services = supplier?.services ?? [];
  const rates =
    supplier?.rates.filter(
      (rate) => !serviceId || !rate.serviceId || rate.serviceId === serviceId,
    ) ?? [];

  const paidAmount = Number(payable.amountPaid || 0);

  const balancePreview = useMemo(() => {
    const approved = Number(approvedAmount || 0);
    const credit =
      documentType === "CREDIT_NOTE" ? approved : Number(creditAmount || 0);

    return Math.max(0, approved - credit - paidAmount);
  }, [approvedAmount, creditAmount, documentType, paidAmount]);

  function chooseSupplier(value: string) {
    setSupplierId(value);
    setServiceId("");
    setRateId("");

    const selected = suppliers.find((item) => item.id === value);
    if (selected && paidAmount <= 0) {
      setCurrency(selected.defaultCurrency || "EUR");
    }
  }

  function chooseRate(value: string) {
    setRateId(value);

    const selected = rates.find((item) => item.id === value);
    if (!selected) return;

    if (paidAmount <= 0) {
      setCurrency(selected.currency);
    }

    setContractedAmount(selected.amount);

    if (selected.serviceId) {
      setServiceId(selected.serviceId);
    }
  }

  function handleInvoiceFile(file: File | null) {
    if (!file) {
      setInvoiceFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPG, PNG and WEBP files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Supplier document file must be smaller than 10 MB.");
      return;
    }

    setInvoiceFile(file);
    setRemoveExistingDocument(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    if (invoiceFile && !serviceId) {
      toast.error(
        "Please select the supplier service so the replacement document can be classified correctly in Accounting.",
      );
      return;
    }

    const parsedInvoiceDate = parseEuropeanDate(invoiceDate);
    if (invoiceDate && !parsedInvoiceDate) {
      toast.error("Document date must use DD/MM/YYYY format.");
      return;
    }

    const parsedDueDate = parseEuropeanDate(dueDate);
    if (dueDate && !parsedDueDate) {
      toast.error("Due date must use DD/MM/YYYY format.");
      return;
    }

    const approved = Number(approvedAmount || 0);
    const credit =
      documentType === "CREDIT_NOTE" ? approved : Number(creditAmount || 0);
    const correctedLiability = Math.max(0, approved - credit);

    if (!Number.isFinite(approved) || approved <= 0) {
      toast.error("Approved amount must be greater than zero.");
      return;
    }

    if (!Number.isFinite(credit) || credit < 0 || credit > approved) {
      toast.error("Credit amount must be between zero and the approved amount.");
      return;
    }

    if (correctedLiability < paidAmount) {
      toast.error(
        `The corrected payable total cannot be below the amount already paid (${currency} ${paidAmount.toFixed(2)}).`,
      );
      return;
    }

    setLoading(true);

    const form = new FormData(event.currentTarget);
    form.set("supplierId", supplierId);
    form.set("serviceId", serviceId);
    form.set("rateId", rateId);
    form.set("tourId", tourId);
    form.set("departureDateId", departureDateId);
    form.set("bookingId", bookingId);
    form.set("documentType", documentType);
    form.set("currency", currency);
    form.set("contractedAmount", contractedAmount);
    form.set("approvedAmount", approvedAmount);
    form.set(
      "creditAmount",
      documentType === "CREDIT_NOTE" ? approvedAmount : creditAmount,
    );
    form.set("invoiceDate", parsedInvoiceDate || "");
    form.set("dueDate", parsedDueDate || "");
    form.set("removeExistingDocument", removeExistingDocument ? "true" : "false");

    if (invoiceFile) {
      form.set("invoiceFile", invoiceFile);
    } else {
      form.delete("invoiceFile");
    }

    try {
      const response = await fetch(
        `/api/admin/supplier-payables/${payable.id}`,
        {
          method: "PUT",
          body: form,
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to update supplier payable.");
      }

      toast.success(
        invoiceFile
          ? "Supplier payable updated and document replaced."
          : removeExistingDocument
            ? "Supplier payable updated and document removed."
            : "Supplier payable updated successfully.",
      );

      router.push(`/admin/supplier-payables/${payable.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update supplier payable.",
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <strong>Edit payable.</strong> Amounts, dates, supplier document details,
        tour/group links and the uploaded invoice can be corrected. If payments
        already exist, the corrected liability cannot be lower than the amount
        already paid. Currency and supplier are locked after the first payment.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Supplier *">
          <select
            name="supplierId"
            required
            value={supplierId}
            onChange={(event) => chooseSupplier(event.target.value)}
            disabled={paidAmount > 0}
            className="input"
          >
            <option value="">Select supplier...</option>
            {suppliers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Supplier service">
          <select
            name="serviceId"
            value={serviceId}
            onChange={(event) => {
              setServiceId(event.target.value);
              setRateId("");
            }}
            disabled={!supplierId}
            className="input"
          >
            <option value="">No service selected</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {serviceTypeLabel(service.type)} - {service.name}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Contracted rate">
          <select
            name="rateId"
            value={rateId}
            onChange={(event) => chooseRate(event.target.value)}
            disabled={!supplierId}
            className="input"
          >
            <option value="">No contracted rate selected</option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name} - {rate.currency} {rate.amount} / {rateUnitLabel(rate.unit)}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Currency *">
          <input
            name="currency"
            required
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            maxLength={3}
            disabled={paidAmount > 0}
            className="input"
          />
        </FieldLabel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Agency / Parish / Group">
          <input
            name="agencyGroupName"
            defaultValue={payable.agencyGroupName || ""}
            placeholder="e.g. GLORY TOURS / JOSSIE or St. Mary's Parish"
            className="input"
          />
        </FieldLabel>

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
            disabled={paidAmount > 0 && documentType !== "CREDIT_NOTE"}
            className="input"
          >
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldLabel label="Contracted amount">
          <input
            name="contractedAmount"
            type="number"
            min="0"
            step="0.01"
            value={contractedAmount}
            onChange={(event) => setContractedAmount(event.target.value)}
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
            value={documentType === "CREDIT_NOTE" ? approvedAmount : creditAmount}
            onChange={(event) => setCreditAmount(event.target.value)}
            disabled={documentType === "CREDIT_NOTE"}
            className="input disabled:bg-slate-100"
          />
        </FieldLabel>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryBox label="Already Paid" value={`${currency} ${paidAmount.toFixed(2)}`} />
        <SummaryBox
          label="Corrected Liability"
          value={`${currency} ${Math.max(
            0,
            Number(approvedAmount || 0) -
              (documentType === "CREDIT_NOTE"
                ? Number(approvedAmount || 0)
                : Number(creditAmount || 0)),
          ).toFixed(2)}`}
        />
        <SummaryBox
          label="New Outstanding Balance"
          value={`${currency} ${balancePreview.toFixed(2)}`}
          strong
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Payable title *">
          <input
            name="title"
            required
            defaultValue={payable.title}
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Supplier document number">
          <input
            name="supplierInvoiceNumber"
            defaultValue={payable.supplierInvoiceNumber || ""}
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Supplier reference">
          <input
            name="supplierReference"
            defaultValue={payable.supplierReference || ""}
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Document date">
          <EuropeanDateInput value={invoiceDate} onChange={setInvoiceDate} />
        </FieldLabel>

        <FieldLabel label="Due date">
          <EuropeanDateInput value={dueDate} onChange={setDueDate} />
        </FieldLabel>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#8B0000] shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Supplier Document</h3>
            <p className="mt-1 text-sm text-slate-500">
              Keep the existing file, replace it with the correct invoice, or remove it.
              Replacing the file also updates the Finance / Accounting document record.
            </p>
          </div>
        </div>

        {payable.document && !removeExistingDocument && !invoiceFile ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {payable.document.originalFileName}
              </p>
              <p className="mt-1 text-xs text-slate-500">Current uploaded document</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={payable.document.storagePath}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border px-3 py-2 text-sm font-semibold text-[#001F3F] hover:bg-slate-50"
              >
                View Current
              </a>
              <button
                type="button"
                onClick={() => setRemoveExistingDocument(true)}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Remove Current
              </button>
            </div>
          </div>
        ) : null}

        {removeExistingDocument && !invoiceFile ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            The current document will be removed when you save.
            <button
              type="button"
              onClick={() => setRemoveExistingDocument(false)}
              className="ml-2 font-semibold underline"
            >
              Keep it
            </button>
          </div>
        ) : null}

        {!invoiceFile ? (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-7 text-center transition hover:border-[#001F3F]/40 hover:bg-slate-50">
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="mt-2 text-sm font-semibold text-slate-700">
              {payable.document ? "Select replacement document" : "Select supplier document"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              PDF, JPG, PNG or WEBP - Maximum 10 MB
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handleInvoiceFile(event.target.files?.[0] ?? null)
              }
              className="sr-only"
            />
          </label>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border bg-white p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {invoiceFile.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {(invoiceFile.size / 1024 / 1024).toFixed(2)} MB - replacement file
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInvoiceFile(null)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-[#8B0000]"
              aria-label="Remove replacement document"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldLabel label="Tour">
          <select
            name="tourId"
            value={tourId}
            onChange={(event) => {
              setTourId(event.target.value);
              setDepartureDateId("");
            }}
            className="input"
          >
            <option value="">Not linked to a tour</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.title}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Departure">
          <select
            name="departureDateId"
            value={departureDateId}
            onChange={(event) => setDepartureDateId(event.target.value)}
            disabled={!tourId}
            className="input"
          >
            <option value="">Not linked to a departure</option>
            {selectedTour?.departureDates.map((departure) => (
              <option key={departure.id} value={departure.id}>
                {europeanDateFromIso(departure.date)}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Booking">
          <select
            name="bookingId"
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            className="input"
          >
            <option value="">Not linked to a booking</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.bookingDisplayCode || booking.bookingReference} - {booking.tourTitleSnapshot}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>

      <FieldLabel label="Description">
        <textarea
          name="description"
          rows={3}
          defaultValue={payable.description || ""}
          className="input py-2"
        />
      </FieldLabel>

      <FieldLabel label="Internal notes">
        <textarea
          name="internalNotes"
          rows={4}
          defaultValue={payable.internalNotes || ""}
          className="input py-2"
        />
      </FieldLabel>

      <div className="flex flex-wrap gap-3 border-t pt-5">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#760000] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => router.push(`/admin/supplier-payables/${payable.id}`)}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
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

function EuropeanDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const isoValue = parseEuropeanDate(value) || "";

  function openCalendar() {
    const picker = pickerRef.current;
    if (!picker) return;

    if (typeof picker.showPicker === "function") {
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
        onChange={(event) => onChange(formatDateTyping(event.target.value))}
        className="input pr-12"
      />
      <button
        type="button"
        onClick={openCalendar}
        className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#001F3F]"
        title="Open calendar"
        aria-label="Open calendar"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        value={isoValue}
        onChange={(event) => {
          const selected = event.target.value;
          if (!selected) {
            onChange("");
            return;
          }

          const [year, month, day] = selected.split("-");
          onChange(`${day}/${month}/${year}`);
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

function SummaryBox({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${strong ? "text-[#8B0000]" : "text-[#001F3F]"}`}>
        {value}
      </p>
    </div>
  );
}
