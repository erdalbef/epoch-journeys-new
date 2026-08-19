"use client";

import { useEffect, useRef } from "react";

type Props = {
  startDate?: string;
  paymentValue: string;
  cancellationValue: string;
  onSelect: (payment: string, cancellation: string) => void;
};

const STANDARD_CANCELLATION = `All cancellations must be submitted to Epoch Journeys in writing.

Cancellation charges will be determined according to the cancellation conditions of the hotels, transportation companies, cruise lines, airlines, ferries, restaurants, local service providers, and other suppliers confirmed for the program.

Any non-refundable deposits, prepayments, cancellation charges, or contractual commitments already incurred by Epoch Journeys on behalf of the group will apply.

Certain services may become non-refundable immediately upon confirmation, ticketing, cabin allocation, room commitment, passenger-name submission, rooming-list submission, or another supplier-defined milestone.

Because supplier conditions vary by destination, travel date, service, and group, the tour-specific cancellation conditions applicable to the confirmed program will be communicated with the Tour Proposal / Confirmation and related correspondence.

The earliest applicable supplier deadline or restriction may determine when part of the tour becomes non-refundable.

Cancellations received close to departure may result in charges up to 100% of the total tour cost, depending on supplier commitments already made.

No refund is provided for no-shows or voluntarily unused services after travel has commenced unless otherwise expressly agreed in writing.

Comprehensive travel insurance, including trip cancellation and interruption coverage, is strongly recommended for all travelers.`;

function parseLocalDate(value?: string): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function buildEpochPaymentPolicy(startDate?: string) {
  const departure = parseLocalDate(startDate);

  if (!departure) {
    return `25% INITIAL DEPOSIT
Due upon written confirmation and acceptance of the proposal.

35% SECOND DEPOSIT
Due 90 days prior to departure.

40% FINAL BALANCE
Due 30 days prior to departure.

If the quotation is confirmed after a scheduled payment date has passed, the applicable outstanding installment becomes due immediately.

Reservations and services remain subject to availability until the required payment is received.

All bank transfer charges and correspondent bank fees are the responsibility of the sender.`;
  }

  const today = startOfToday();
  const secondDate = subtractDays(departure, 90);
  const finalDate = subtractDays(departure, 30);

  if (finalDate <= today) {
    return `100% FULL PAYMENT
Due upon written confirmation and acceptance of the proposal.

As this booking is being confirmed within 30 days of departure, full payment is required at confirmation.

Reservations and services remain subject to availability until payment is received and supplier confirmations are secured.

All bank transfer charges and correspondent bank fees are the responsibility of the sender.`;
  }

  if (secondDate <= today) {
    return `60% INITIAL PAYMENT
Due upon written confirmation and acceptance of the proposal.

This amount combines the standard 25% initial deposit and 35% second deposit because the normal 90-day payment deadline has already passed.

40% FINAL BALANCE
Due ${formatDate(finalDate)} (30 days prior to departure).

Reservations and services remain subject to availability until the required payment is received.

All bank transfer charges and correspondent bank fees are the responsibility of the sender.`;
  }

  return `25% INITIAL DEPOSIT
Due upon written confirmation and acceptance of the proposal.

35% SECOND DEPOSIT
Due ${formatDate(secondDate)} (90 days prior to departure).

40% FINAL BALANCE
Due ${formatDate(finalDate)} (30 days prior to departure).

Reservations and services remain subject to availability until the initial deposit is received.

Payments must be received by the stated due dates in order to maintain confirmed arrangements and contracted rates.

All bank transfer charges and correspondent bank fees are the responsibility of the sender.`;
}

function isOldGenericPayment(value: string) {
  const text = value.trim();

  if (!text) return true;

  return (
    /Due 90 days prior to departure\./i.test(text) ||
    /Due 30 days prior to departure\./i.test(text) ||
    /A second payment of 30% is due 60 days prior/i.test(text) ||
    /The remaining balance must be paid 60 days prior/i.test(text)
  );
}

function isOldGenericCancellation(value: string) {
  const text = value.trim();

  if (!text) return true;

  return (
    /More than 90 days prior to departure/i.test(text) ||
    /90.?61 days prior to departure/i.test(text) ||
    /60.?31 days prior to departure/i.test(text) ||
    /30 days or less prior to departure/i.test(text)
  );
}

export default function PolicySelector({
  startDate,
  paymentValue,
  cancellationValue,
  onSelect,
}: Props) {
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!startDate) return;

    const refreshPayment = isOldGenericPayment(paymentValue);
    const refreshCancellation = isOldGenericCancellation(cancellationValue);

    if (!refreshPayment && !refreshCancellation) return;

    onSelectRef.current(
      refreshPayment
        ? buildEpochPaymentPolicy(startDate)
        : paymentValue,
      refreshCancellation
        ? STANDARD_CANCELLATION
        : cancellationValue
    );
  }, [startDate, paymentValue, cancellationValue]);

  return (
    <div className="space-y-4 rounded-xl border bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-[#001F3F]">
          Epoch Payment & Cancellation Policy
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Payment dates are calculated automatically from the tour start date.
          Supplier-specific cancellation conditions can still be edited for each quotation.
        </p>
      </div>

      {!startDate ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Enter the tour start date to calculate exact payment due dates.
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          onSelect(
            buildEpochPaymentPolicy(startDate),
            STANDARD_CANCELLATION
          )
        }
        className="rounded-md bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A2B50]"
      >
        Recalculate Epoch Standard
      </button>
    </div>
  );
}
