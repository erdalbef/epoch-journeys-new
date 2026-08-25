"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

type BillToOption =
  BillToData & {
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

type CreditNoteSource = {
  id: string;
  documentNumber: string;
  issueDate: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  currency: string;

  billTo: BillToData;

  items: Line[];

  serviceDescriptionEn: string;
  serviceDescriptionBg: string;

  vatEn: string;
  vatBg: string;
};

const emptyBillTo: BillToData =
  {
    recipientName: "",
    recipientCompany: "",
    recipientEmail: "",
    recipientEmailSecondary:
      "",
    recipientAddress: "",
    recipientCity: "",
    recipientPostalCode: "",
    recipientCountry: "",
    recipientTaxNumber: "",
    recipientVatNumber: "",
  };

const defaultServiceDescriptionEn =
  "Pilgrimage land arrangements including accommodation, transportation, licensed guides, entrance fees and operational services.";

const defaultServiceDescriptionBg =
  "Поклонническа програма, включваща хотелско настаняване, транспорт, лицензиран екскурзовод, входни такси и организационно обслужване.";

const defaultVatEn =
  "VAT treatment to be confirmed according to the applicable Bulgarian VAT rules.";

const defaultVatBg =
  "ДДС третирането се определя съгласно приложимите правила на българското законодателство по ДДС.";

const defaultPaymentEn =
  "Please include the document number and booking reference in the bank transfer.";

const defaultPaymentBg =
  "Моля, посочете номера на документа и референтния номер на резервацията при банковия превод.";

function formatMoney(
  value: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
        minimumFractionDigits:
          2,
        maximumFractionDigits:
          2,
      },
    ).format(value);
  } catch {
    return `${currency} ${value.toFixed(
      2,
    )}`;
  }
}

export default function SalesDocumentForm({
  bookings,
  billToOptions,
  creditNoteSource = null,
}: {
  bookings: BookingOption[];
  billToOptions: BillToOption[];
  creditNoteSource?: CreditNoteSource | null;
}) {
  const router =
    useRouter();

  const isCreditNote =
    Boolean(
      creditNoteSource,
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    type,
    setType,
  ] =
    useState(
      creditNoteSource
        ? "CREDIT_NOTE"
        : "PROFORMA",
    );

  const [
    bookingId,
    setBookingId,
  ] =
    useState(
      creditNoteSource?.bookingId ??
        "",
    );

  const [
    billToProfileKey,
    setBillToProfileKey,
  ] =
    useState("");

  const [
    saveBillingProfile,
    setSaveBillingProfile,
  ] =
    useState(
      !isCreditNote,
    );

  const [
    billTo,
    setBillTo,
  ] =
    useState<BillToData>(
      creditNoteSource?.billTo ??
        emptyBillTo,
    );

  const [
    amountPaid,
    setAmountPaid,
  ] =
    useState(0);

  const [
    additionalNotes,
    setAdditionalNotes,
  ] =
    useState(
      creditNoteSource
        ? `Credit Note against Invoice ${creditNoteSource.documentNumber}`
        : "",
    );

  const [
    serviceDescriptionEn,
    setServiceDescriptionEn,
  ] =
    useState(
      creditNoteSource?.serviceDescriptionEn ||
        defaultServiceDescriptionEn,
    );

  const [
    serviceDescriptionBg,
    setServiceDescriptionBg,
  ] =
    useState(
      creditNoteSource?.serviceDescriptionBg ||
        defaultServiceDescriptionBg,
    );

  const [
    vatEn,
    setVatEn,
  ] =
    useState(
      creditNoteSource?.vatEn ||
        defaultVatEn,
    );

  const [
    vatBg,
    setVatBg,
  ] =
    useState(
      creditNoteSource?.vatBg ||
        defaultVatBg,
    );

  const [
    paymentEn,
    setPaymentEn,
  ] =
    useState(
      defaultPaymentEn,
    );

  const [
    paymentBg,
    setPaymentBg,
  ] =
    useState(
      defaultPaymentBg,
    );

  const [
    lines,
    setLines,
  ] =
    useState<Line[]>(
      creditNoteSource
        ?.items.length
        ? creditNoteSource.items
        : [
            {
              description:
                "Land arrangements",
              quantity: 1,
              unitPrice: 0,
              taxRate: 0,
            },
          ],
    );

  const selected =
    useMemo(
      () =>
        bookings.find(
          (booking) =>
            booking.id ===
            bookingId,
        ),

      [
        bookings,
        bookingId,
      ],
    );

  const currency =
    creditNoteSource
      ?.currency ||
    selected?.currency ||
    "EUR";

  const subtotal =
    useMemo(
      () =>
        lines.reduce(
          (
            sum,
            line,
          ) =>
            sum +
            line.quantity *
              line.unitPrice,
          0,
        ),

      [lines],
    );

  const taxTotal =
    useMemo(
      () =>
        lines.reduce(
          (
            sum,
            line,
          ) => {
            const lineSubtotal =
              line.quantity *
              line.unitPrice;

            return (
              sum +
              lineSubtotal *
                (line.taxRate /
                  100)
            );
          },
          0,
        ),

      [lines],
    );

  const total =
    subtotal +
    taxTotal;

  const balanceDue =
    Math.max(
      0,
      total -
        amountPaid,
    );

  function applyBillTo(
    data: BillToData,
  ) {
    setBillTo(
      data,
    );
  }

  function selectBillToProfile(
    key: string,
  ) {
    if (
      isCreditNote
    ) {
      return;
    }

    setBillToProfileKey(
      key,
    );

    const profile =
      billToOptions.find(
        (option) =>
          option.key ===
          key,
      );

    if (profile) {
      applyBillTo(
        profile,
      );
    }
  }

  function selectBooking(
    id: string,
  ) {
    if (
      isCreditNote
    ) {
      return;
    }

    setBookingId(
      id,
    );

    const booking =
      bookings.find(
        (option) =>
          option.id ===
          id,
      );

    if (!booking) {
      setAmountPaid(
        0,
      );

      return;
    }

    applyBillTo(
      booking.billTo,
    );

    setAmountPaid(
      booking.amountPaid,
    );

    setLines([
      {
        description:
          `${booking.tourTitleSnapshot} - Land Arrangements`,

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
    if (
      isCreditNote
    ) {
      return;
    }

    setBillTo(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  function updateLine(
    index: number,
    patch: Partial<Line>,
  ) {
    setLines(
      (current) =>
        current.map(
          (
            line,
            currentIndex,
          ) =>
            currentIndex ===
            index
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
    setLines(
      (current) =>
        current.filter(
          (
            _,
            currentIndex,
          ) =>
            currentIndex !==
            index,
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
          line.quantity <=
            0 ||
          line.unitPrice <
            0 ||
          line.taxRate <
            0 ||
          line.taxRate >
            100,
      );

    if (
      invalidLine
    ) {
      setBusy(false);

      setError(
        "Please check the line items. Quantity must be greater than 0, Unit Price cannot be negative, and VAT must be between 0% and 100%.",
      );

      return;
    }

    if (
      isCreditNote &&
      total <= 0
    ) {
      setBusy(false);

      setError(
        "Credit Note amount must be greater than zero.",
      );

      return;
    }

    const form =
      new FormData(
        event.currentTarget,
      );

    const payload = {
      type,

      originalDocumentId:
        creditNoteSource?.id ??
        null,

      bookingId:
        bookingId ||
        null,

      billToProfileKey:
        isCreditNote
          ? null
          : billToProfileKey ||
            null,

      saveBillingProfile:
        isCreditNote
          ? false
          : saveBillingProfile,

      ...billTo,

      amountPaid:
        isCreditNote
          ? 0
          : bookingId
            ? undefined
            : amountPaid,

      dueDate:
        isCreditNote
          ? null
          : form.get(
                "dueDate",
              ) ||
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

      items:
        lines,
    };

    try {
      const response =
        await fetch(
          "/api/admin/finance/sales-documents",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () =>
              null,
          );

      if (
        !response.ok
      ) {
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
      onSubmit={
        submit
      }
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

        {creditNoteSource && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
              Credit Note
              Against Invoice
            </p>

            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-amber-950">
              <div>
                Original
                Invoice:{" "}
                <strong>
                  {
                    creditNoteSource.documentNumber
                  }
                </strong>
              </div>

              {creditNoteSource.bookingReference && (
                <div>
                  Booking:{" "}
                  <strong>
                    {
                      creditNoteSource.bookingReference
                    }
                  </strong>
                </div>
              )}

              <div>
                Currency:{" "}
                <strong>
                  {
                    creditNoteSource.currency
                  }
                </strong>
              </div>

              {creditNoteSource.issueDate && (
                <div>
                  Invoice
                  Date:{" "}
                  <strong>
                    {new Date(
                      creditNoteSource.issueDate,
                    ).toLocaleDateString(
                      "en-GB",
                    )}
                  </strong>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs leading-5 text-amber-800">
              The Credit Note
              will remain
              permanently linked
              to this Invoice.
              Adjust the line
              items below to
              include only the
              amount or services
              being credited.
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label
            className={
              labelClass
            }
          >
            Document Type

            <select
              className={
                inputClass
              }
              value={
                type
              }
              disabled={
                isCreditNote
              }
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

              {isCreditNote && (
                <option value="CREDIT_NOTE">
                  Credit Note
                </option>
              )}
            </select>
          </label>

          <label
            className={
              labelClass
            }
          >
            Select Booking
            (optional)

            <select
              className={
                inputClass
              }
              value={
                bookingId
              }
              disabled={
                isCreditNote
              }
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

          {!isCreditNote && (
            <label
              className={
                labelClass
              }
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
          )}

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {creditNoteSource ? (
              <>
                <strong>
                  Original
                  Invoice{" "}
                  {
                    creditNoteSource.documentNumber
                  }
                </strong>

                <div className="mt-1">
                  Credit Note
                  currency:{" "}
                  {
                    creditNoteSource.currency
                  }
                </div>
              </>
            ) : selected ? (
              <>
                <strong>
                  {
                    selected.bookingReference
                  }
                </strong>

                <div className="mt-1">
                  Booking
                  total:{" "}
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
          {isCreditNote
            ? "Recipient details are inherited from the original Invoice."
            : "Select a registered agent/company or enter the billing details manually."}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {!isCreditNote && (
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
                  Manual / do
                  not use saved
                  profile
                </option>

                {billToOptions.map(
                  (
                    option,
                  ) => (
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
          )}

          <BillingInput
            label="Recipient / Contact Name *"
            value={
              billTo.recipientName
            }
            required
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
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
            disabled={
              isCreditNote
            }
            onChange={(
              value,
            ) =>
              updateBillTo(
                "recipientVatNumber",
                value,
              )
            }
          />

          {!isCreditNote &&
            billToProfileKey && (
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
                      event
                        .target
                        .checked,
                    )
                  }
                />

                Save these Bill
                To details back
                to the selected
                registered
                profile for
                future invoices.
              </label>
            )}
        </div>
      </section>

      {/* PAYMENTS */}

      {!isCreditNote && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Payments
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            When a booking is
            selected, Paid /
            Deposit Received
            comes from the
            booking automatically.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label
              className={
                labelClass
              }
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
                value={
                  amountPaid
                }
                disabled={
                  Boolean(
                    bookingId,
                  )
                }
                onChange={(
                  event,
                ) =>
                  setAmountPaid(
                    Number(
                      event
                        .target
                        .value,
                    ),
                  )
                }
              />
            </label>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current
                Balance Due
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
      )}

      {/* LINE ITEMS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              {isCreditNote
                ? "Credited Items"
                : "Line Items"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isCreditNote
                ? "Adjust the copied Invoice lines so they represent only the services or amount being credited."
                : "Enter the service, number of units or passengers, price per unit and applicable VAT rate."}
            </p>
          </div>

          <button
            type="button"
            className={
              secondaryButton
            }
            onClick={() =>
              setLines(
                (
                  current,
                ) => [
                  ...current,
                  {
                    description:
                      "",
                    quantity:
                      1,
                    unitPrice:
                      0,
                    taxRate:
                      0,
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
            (
              line,
              index,
            ) => {
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
                  key={
                    index
                  }
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
                      <p
                        className={
                          labelClass
                        }
                      >
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
              {isCreditNote
                ? "Credit Amount"
                : "Draft Total"}
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
          Bilingual Document
          Text
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          These fields remain
          editable before the
          document is issued.
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
            value={
              vatEn
            }
            setValue={
              setVatEn
            }
          />

          <TextArea
            label="ДДС — Български"
            value={
              vatBg
            }
            setValue={
              setVatBg
            }
          />

          {!isCreditNote && (
            <>
              <TextArea
                label="Payment Reference — English"
                value={
                  paymentEn
                }
                setValue={
                  setPaymentEn
                }
              />

              <TextArea
                label="Основание за плащане — Български"
                value={
                  paymentBg
                }
                setValue={
                  setPaymentBg
                }
              />
            </>
          )}

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
                  event
                    .target
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
            lines.length ===
              0
          }
          className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Saving..."
            : isCreditNote
              ? "Save Credit Note Draft"
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={
        labelClass
      }
    >
      {label}

      <input
        type={
          type
        }
        className={
          inputClass
        }
        value={
          value
        }
        required={
          required
        }
        disabled={
          disabled
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
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
      className={
        labelClass
      }
    >
      {label}

      <textarea
        className={`${inputClass} min-h-28 py-3`}
        value={
          value
        }
        onChange={(
          event,
        ) =>
          setValue(
            event.target
              .value,
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