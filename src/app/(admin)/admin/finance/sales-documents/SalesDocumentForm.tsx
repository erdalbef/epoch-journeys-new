"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillToData = {
  recipientName: string;
  recipientCompany: string;
  recipientEmail: string;
  recipientEmailSecondary: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  recipientCountry: string;
  recipientTaxNumber: string;
  recipientVatNumber: string;
};

type BillToOption = BillToData & {
  key: string;
  label: string;
};

type BookingOption = {
  id: string;
  bookingReference: string;
  groupName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  agencyNameSnapshot: string | null;
  currency: string;
  netAmount: number;
  amountPaid: number;
  tourTitleSnapshot: string;
  departureDateSnapshot: string;
  billTo: BillToData;
};

type Line = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

const emptyBillTo: BillToData = {
  recipientName: "",
  recipientCompany: "",
  recipientEmail: "",
  recipientEmailSecondary: "",
  recipientAddress: "",
  recipientCity: "",
  recipientPostalCode: "",
  recipientCountry: "",
  recipientTaxNumber: "",
  recipientVatNumber: "",
};

function formatMoney(
  value: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function SalesDocumentForm({
  bookings,
  billToOptions,
}: {
  bookings: BookingOption[];
  billToOptions: BillToOption[];
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] =
    useState("PROFORMA");

  const [bookingId, setBookingId] =
    useState("");

  const [
    billToProfileKey,
    setBillToProfileKey,
  ] = useState("");

  const [
    saveBillingProfile,
    setSaveBillingProfile,
  ] = useState(true);

  const [billTo, setBillTo] =
    useState<BillToData>(
      emptyBillTo,
    );

  const [amountPaid, setAmountPaid] =
    useState(0);

  const [
    additionalNotes,
    setAdditionalNotes,
  ] = useState("");

  const [
    serviceDescriptionEn,
    setServiceDescriptionEn,
  ] = useState(
    "Pilgrimage land arrangements including accommodation, transportation, licensed guides, entrance fees and operational services.",
  );

  const [
    serviceDescriptionBg,
    setServiceDescriptionBg,
  ] = useState(
    "Поклонническа програма, включваща хотелско настаняване, транспорт, лицензиран екскурзовод, входни такси и организационно обслужване.",
  );

  const [vatEn, setVatEn] = useState(
    "VAT not charged according to Article 21 of the Bulgarian VAT Act (Reverse Charge).",
  );

  const [vatBg, setVatBg] = useState(
    "Основание за неначисляване на ДДС: чл.21 от Закона за ДДС – Обратно начисляване.",
  );

  const [paymentEn, setPaymentEn] =
    useState(
      "Please include the document number and booking reference in the bank transfer.",
    );

  const [paymentBg, setPaymentBg] =
    useState(
      "Моля посочете номера на документа и референтния номер на резервацията при банковия превод.",
    );

  const [lines, setLines] =
    useState<Line[]>([
      {
        description:
          "Land arrangements",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ]);

  const selected = useMemo(
    () =>
      bookings.find(
        (booking) =>
          booking.id === bookingId,
      ),
    [bookings, bookingId],
  );

  const currency =
    selected?.currency || "EUR";

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          line.quantity *
            line.unitPrice,
        0,
      ),
    [lines],
  );

  const taxTotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => {
          const lineSubtotal =
            line.quantity *
            line.unitPrice;

          return (
            sum +
            lineSubtotal *
              (line.taxRate / 100)
          );
        },
        0,
      ),
    [lines],
  );

  const total =
    subtotal + taxTotal;

  const balanceDue = Math.max(
    0,
    total - amountPaid,
  );

  function applyBillTo(
    data: BillToData,
  ) {
    setBillTo(data);
  }

  function selectBillToProfile(
    key: string,
  ) {
    setBillToProfileKey(key);

    const profile =
      billToOptions.find(
        (option) =>
          option.key === key,
      );

    if (profile) {
      applyBillTo(profile);
    }
  }

  function selectBooking(
    id: string,
  ) {
    setBookingId(id);

    const booking =
      bookings.find(
        (option) =>
          option.id === id,
      );

    if (!booking) {
      setAmountPaid(0);
      return;
    }

    applyBillTo(booking.billTo);
    setAmountPaid(
      booking.amountPaid,
    );

    setLines([
      {
        description: `${booking.tourTitleSnapshot} - Land Arrangements`,
        quantity: 1,
        unitPrice:
          booking.netAmount,
        taxRate: 0,
      },
    ]);
  }

  function updateBillTo<
    K extends keyof BillToData,
  >(
    key: K,
    value: BillToData[K],
  ) {
    setBillTo((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateLine(
    index: number,
    patch: Partial<Line>,
  ) {
    setLines((current) =>
      current.map(
        (
          line,
          currentIndex,
        ) =>
          currentIndex === index
            ? {
                ...line,
                ...patch,
              }
            : line,
      ),
    );
  }

  function removeLine(
    index: number,
  ) {
    setLines((current) =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");

    const invalidLine =
      lines.find(
        (line) =>
          !line.description.trim() ||
          line.quantity <= 0 ||
          line.unitPrice < 0 ||
          line.taxRate < 0 ||
          line.taxRate > 100,
      );

    if (invalidLine) {
      setBusy(false);

      setError(
        "Please check the line items. Quantity must be greater than 0, Unit Price cannot be negative, and VAT must be between 0% and 100%.",
      );

      return;
    }

    const form = new FormData(
      event.currentTarget,
    );

    const payload = {
      type,
      bookingId:
        bookingId || null,

      billToProfileKey:
        billToProfileKey ||
        null,

      saveBillingProfile,

      ...billTo,

      amountPaid: bookingId
        ? undefined
        : amountPaid,

      dueDate:
        form.get("dueDate") ||
        null,

      serviceDescriptionEn,
      serviceDescriptionBg,
      vatEn,
      vatBg,
      paymentEn,
      paymentBg,

      additionalNotes:
        additionalNotes ||
        null,

      items: lines,
    };

    try {
      const response =
        await fetch(
          "/api/admin/finance/sales-documents",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload,
            ),
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        setError(
          data?.error ||
            "Could not create sales document.",
        );

        return;
      }

      router.push(
        `/admin/finance/sales-documents/${data.id}`,
      );

      router.refresh();
    } catch {
      setError(
        "Could not create sales document. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* DOCUMENT */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#001F3F]">
          Document & Booking
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label
            className={labelClass}
          >
            Document Type

            <select
              className={
                inputClass
              }
              value={type}
              onChange={(
                event,
              ) =>
                setType(
                  event.target
                    .value,
                )
              }
            >
              <option value="PROFORMA">
                Proforma
                Invoice
              </option>

              <option value="INVOICE">
                Invoice
              </option>

              <option value="CREDIT_NOTE">
                Credit Note
              </option>
            </select>
          </label>

          <label
            className={labelClass}
          >
            Select Booking
            (optional)

            <select
              className={
                inputClass
              }
              value={bookingId}
              onChange={(
                event,
              ) =>
                selectBooking(
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                No booking /
                manual document
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
                    {
                      booking.bookingReference
                    }{" "}
                    —{" "}
                    {booking.groupName ||
                      booking.tourTitleSnapshot}
                  </option>
                ),
              )}
            </select>
          </label>

          <label
            className={labelClass}
          >
            Due Date

            <input
              name="dueDate"
              type="date"
              className={
                inputClass
              }
            />
          </label>

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {selected ? (
              <>
                <strong>
                  {
                    selected.bookingReference
                  }
                </strong>

                <div className="mt-1">
                  Booking total:{" "}
                  {
                    selected.currency
                  }{" "}
                  {selected.netAmount.toFixed(
                    2,
                  )}{" "}
                  · Paid:{" "}
                  {
                    selected.currency
                  }{" "}
                  {selected.amountPaid.toFixed(
                    2,
                  )}
                </div>
              </>
            ) : (
              "Choose a booking above to prefill Bill To, tour item and paid deposit."
            )}
          </div>
        </div>
      </section>

      {/* BILL TO */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#001F3F]">
          Bill To /
          Получател
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Select a registered
          agent/company or enter
          the billing details
          manually.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label
            className={`${labelClass} md:col-span-2`}
          >
            Bill To Profile

            <select
              className={
                inputClass
              }
              value={
                billToProfileKey
              }
              onChange={(
                event,
              ) =>
                selectBillToProfile(
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                Manual / do not
                use saved profile
              </option>

              {billToOptions.map(
                (option) => (
                  <option
                    key={
                      option.key
                    }
                    value={
                      option.key
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <BillingInput
            label="Recipient / Contact Name *"
            value={
              billTo.recipientName
            }
            required
            onChange={(value) =>
              updateBillTo(
                "recipientName",
                value,
              )
            }
          />

          <BillingInput
            label="Company / Legal Name"
            value={
              billTo.recipientCompany
            }
            onChange={(value) =>
              updateBillTo(
                "recipientCompany",
                value,
              )
            }
          />

          <BillingInput
            label="Primary Billing Email"
            type="email"
            value={
              billTo.recipientEmail
            }
            onChange={(value) =>
              updateBillTo(
                "recipientEmail",
                value,
              )
            }
          />

          <BillingInput
            label="Secondary Billing Email / CC"
            type="email"
            value={
              billTo.recipientEmailSecondary
            }
            onChange={(value) =>
              updateBillTo(
                "recipientEmailSecondary",
                value,
              )
            }
          />

          <BillingInput
            label="Address"
            value={
              billTo.recipientAddress
            }
            onChange={(value) =>
              updateBillTo(
                "recipientAddress",
                value,
              )
            }
          />

          <BillingInput
            label="City"
            value={
              billTo.recipientCity
            }
            onChange={(value) =>
              updateBillTo(
                "recipientCity",
                value,
              )
            }
          />

          <BillingInput
            label="Postal Code"
            value={
              billTo.recipientPostalCode
            }
            onChange={(value) =>
              updateBillTo(
                "recipientPostalCode",
                value,
              )
            }
          />

          <BillingInput
            label="Country"
            value={
              billTo.recipientCountry
            }
            onChange={(value) =>
              updateBillTo(
                "recipientCountry",
                value,
              )
            }
          />

          <BillingInput
            label="Tax / Company ID"
            value={
              billTo.recipientTaxNumber
            }
            onChange={(value) =>
              updateBillTo(
                "recipientTaxNumber",
                value,
              )
            }
          />

          <BillingInput
            label="VAT Number"
            value={
              billTo.recipientVatNumber
            }
            onChange={(value) =>
              updateBillTo(
                "recipientVatNumber",
                value,
              )
            }
          />

          {billToProfileKey && (
            <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={
                  saveBillingProfile
                }
                onChange={(
                  event,
                ) =>
                  setSaveBillingProfile(
                    event.target
                      .checked,
                  )
                }
              />

              Save these Bill To
              details back to the
              selected registered
              profile for future
              invoices.
            </label>
          )}
        </div>
      </section>

      {/* PAYMENTS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#001F3F]">
          Payments
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          When a booking is
          selected, Paid /
          Deposit Received comes
          from the booking
          automatically.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label
            className={labelClass}
          >
            Paid / Deposit
            Received

            <input
              type="number"
              min="0"
              step="0.01"
              className={
                inputClass
              }
              value={amountPaid}
              disabled={Boolean(
                bookingId,
              )}
              onChange={(
                event,
              ) =>
                setAmountPaid(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
            />
          </label>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current Balance
              Due
            </p>

            <p className="mt-1 text-xl font-bold text-[#001F3F]">
              {formatMoney(
                balanceDue,
                currency,
              )}
            </p>
          </div>
        </div>
      </section>

      {/* LINE ITEMS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              Line Items
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the service,
              number of units or
              passengers, price
              per unit and
              applicable VAT
              rate.
            </p>
          </div>

          <button
            type="button"
            className={
              secondaryButton
            }
            onClick={() =>
              setLines(
                (current) => [
                  ...current,
                  {
                    description:
                      "",
                    quantity: 1,
                    unitPrice: 0,
                    taxRate: 0,
                  },
                ],
              )
            }
          >
            + Add Item
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {lines.map(
            (line, index) => {
              const lineSubtotal =
                line.quantity *
                line.unitPrice;

              const lineTax =
                lineSubtotal *
                (line.taxRate /
                  100);

              const lineTotal =
                lineSubtotal +
                lineTax;

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_110px_150px_110px_150px]">
                    <label
                      className={
                        labelClass
                      }
                    >
                      Description

                      <input
                        className={
                          inputClass
                        }
                        placeholder="e.g. Land Arrangements PP DBL"
                        value={
                          line.description
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            index,
                            {
                              description:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        required
                      />
                    </label>

                    <label
                      className={
                        labelClass
                      }
                    >
                      Quantity

                      <input
                        className={
                          inputClass
                        }
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          line.quantity
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            index,
                            {
                              quantity:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            },
                          )
                        }
                        required
                      />
                    </label>

                    <label
                      className={
                        labelClass
                      }
                    >
                      Unit Price

                      <input
                        className={
                          inputClass
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          line.unitPrice
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            index,
                            {
                              unitPrice:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            },
                          )
                        }
                        required
                      />
                    </label>

                    <label
                      className={
                        labelClass
                      }
                    >
                      VAT %

                      <input
                        className={
                          inputClass
                        }
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={
                          line.taxRate
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            index,
                            {
                              taxRate:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            },
                          )
                        }
                        required
                      />
                    </label>

                    <div>
                      <p className={
                        labelClass
                      }>
                        Line Total
                      </p>

                      <div className="mt-1.5 flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-[#001F3F]">
                        {formatMoney(
                          lineTotal,
                          currency,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-700 hover:text-red-900 disabled:cursor-not-allowed disabled:text-slate-400"
                      disabled={
                        lines.length ===
                        1
                      }
                      onClick={() =>
                        removeLine(
                          index,
                        )
                      }
                    >
                      Remove Item
                    </button>
                  </div>
                </div>
              );
            },
          )}
        </div>

        <div className="mt-6 ml-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Subtotal
            </span>

            <span className="font-semibold text-slate-900">
              {formatMoney(
                subtotal,
                currency,
              )}
            </span>
          </div>

          <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">
              VAT / Tax
            </span>

            <span className="font-semibold text-slate-900">
              {formatMoney(
                taxTotal,
                currency,
              )}
            </span>
          </div>

          <div className="flex justify-between bg-[#001F3F] px-4 py-4 text-white">
            <span className="font-semibold">
              Draft Total
            </span>

            <span className="text-lg font-bold">
              {formatMoney(
                total,
                currency,
              )}
            </span>
          </div>
        </div>
      </section>

      {/* BILINGUAL TEXT */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#001F3F]">
          Bilingual Invoice
          Text
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          These fields remain
          easy to rewrite before
          the document is
          issued.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextArea
            label="Service Description — English"
            value={
              serviceDescriptionEn
            }
            setValue={
              setServiceDescriptionEn
            }
          />

          <TextArea
            label="Описание на услугата — Български"
            value={
              serviceDescriptionBg
            }
            setValue={
              setServiceDescriptionBg
            }
          />

          <TextArea
            label="VAT Note — English"
            value={vatEn}
            setValue={setVatEn}
          />

          <TextArea
            label="ДДС — Български"
            value={vatBg}
            setValue={setVatBg}
          />

          <TextArea
            label="Payment Reference — English"
            value={paymentEn}
            setValue={
              setPaymentEn
            }
          />

          <TextArea
            label="Основание за плащане — Български"
            value={paymentBg}
            setValue={
              setPaymentBg
            }
          />

          <label
            className={`${labelClass} lg:col-span-2`}
          >
            Additional
            Information /
            Допълнителна
            информация

            <textarea
              className={`${inputClass} min-h-24 py-3`}
              value={
                additionalNotes
              }
              onChange={(
                event,
              ) =>
                setAdditionalNotes(
                  event.target
                    .value,
                )
              }
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            busy ||
            lines.length === 0
          }
          className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Saving..."
            : "Save Draft"}
        </button>
      </div>
    </form>
  );
}

function BillingInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label
      className={labelClass}
    >
      {label}

      <input
        type={type}
        className={inputClass}
        value={value}
        required={required}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (
    value: string,
  ) => void;
}) {
  return (
    <label
      className={labelClass}
    >
      {label}

      <textarea
        className={`${inputClass} min-h-28 py-3`}
        value={value}
        onChange={(event) =>
          setValue(
            event.target.value,
          )
        }
      />
    </label>
  );
}

const labelClass =
  "block text-sm font-semibold text-slate-700";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:bg-slate-100 disabled:text-slate-500";

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";