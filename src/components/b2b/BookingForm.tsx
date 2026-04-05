"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingType, RoomType } from "@prisma/client";
import { PhoneInput } from "@/components/shared/form/phoneInput";
import { calculateTourPrice } from "@/lib/pricing/calculateTourPrice";

type DepartureItem = {
  id: string;
  date: string;
  season: string;
  price: number;
  capacity: number;
  bookedSeats: number;
  status: string;
};

type PricingTierItem = {
  label?: string | null;
  minPax: number | null;
  maxPax: number | null;
  roomType: RoomType | null;
  pricePerPerson: number;
  currency?: string | null;
  isActive?: boolean | null;
};

type BookingFormProps = {
  tourId: string;
  pricingType: PricingType;
  pricingTiers: PricingTierItem[];
  commissionRate: number;
  departures: DepartureItem[];
  selectedDepartureId?: string;
};

type BookingApiResponse = {
  success: boolean;
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    paymentStatus: string;
    numberOfGuests: number;
    totalPrice: number;
    tourTitleSnapshot: string;
    departureDateSnapshot: string;
  };
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "EARLY_BOOKING":
      return "bg-blue-100 text-blue-700";
    case "AVAILABLE":
      return "bg-green-100 text-green-700";
    case "SOLD_OUT":
      return "bg-red-100 text-red-700";
    case "CLOSED":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "EARLY_BOOKING":
      return "Early Booking";
    case "AVAILABLE":
      return "Available";
    case "SOLD_OUT":
      return "Sold Out";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

export default function BookingForm({
  tourId,
  pricingType,
  pricingTiers,
  commissionRate,
  departures,
  selectedDepartureId,
}: BookingFormProps) {
  const router = useRouter();

  const initialDepartureId =
    selectedDepartureId && departures.some((d) => d.id === selectedDepartureId)
      ? selectedDepartureId
      : departures.find((d) => {
          const seatsLeft = d.capacity - d.bookedSeats;
          return (
            d.status !== "SOLD_OUT" &&
            d.status !== "CLOSED" &&
            seatsLeft > 0
          );
        })?.id ?? departures[0]?.id ?? "";

  const [departureDateId, setDepartureDateId] = useState(initialDepartureId);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhoneCode, setCustomerPhoneCode] = useState("+90");
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState("");

  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhoneCode, setLeadPhoneCode] = useState("+90");
  const [leadPhoneNumber, setLeadPhoneNumber] = useState("");

  const [singleRooms, setSingleRooms] = useState(0);
  const [doubleRooms, setDoubleRooms] = useState(0);
  const [twinRooms, setTwinRooms] = useState(0);
  const [tripleRooms, setTripleRooms] = useState(0);

  const [landOnly, setLandOnly] = useState(true);
  const [needsFlights, setNeedsFlights] = useState(false);

  const [notes, setNotes] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDeparture = useMemo(() => {
    return departures.find((item) => item.id === departureDateId) ?? null;
  }, [departures, departureDateId]);

  const passengerCount = adults + children + infants;

  const roomingGuestCount =
    singleRooms + (doubleRooms + twinRooms) * 2 + tripleRooms * 3;

  const availableSeats = selectedDeparture
    ? Math.max(selectedDeparture.capacity - selectedDeparture.bookedSeats, 0)
    : 0;

  const departureBookable =
    !!selectedDeparture &&
    selectedDeparture.status !== "SOLD_OUT" &&
    selectedDeparture.status !== "CLOSED" &&
    availableSeats > 0;

  const pricingResult = useMemo(() => {
    if (!selectedDeparture) {
      return {
        ok: false as const,
        message: "Please select a departure.",
      };
    }

    try {
      const result = calculateTourPrice({
        pricingType,
        basePrice: selectedDeparture.price,
        pricingTiers,
        singleRooms,
        doubleRooms,
        twinRooms,
        tripleRooms,
        commissionRate,
      });

      return {
        ok: true as const,
        value: result,
      };
    } catch (err) {
      return {
        ok: false as const,
        message:
          err instanceof Error ? err.message : "Unable to calculate price.",
      };
    }
  }, [
    selectedDeparture,
    pricingType,
    pricingTiers,
    singleRooms,
    doubleRooms,
    twinRooms,
    tripleRooms,
    commissionRate,
  ]);

  const hasAnyRooms =
    singleRooms + doubleRooms + twinRooms + tripleRooms > 0;

  const roomingMatchesPassengers =
    !hasAnyRooms || passengerCount === roomingGuestCount;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (!selectedDeparture) {
      setError("Please select a departure.");
      return;
    }

    if (!departureBookable) {
      setError("The selected departure is not available for booking.");
      return;
    }

    if (adults < 1) {
      setError("At least 1 adult is required.");
      return;
    }

    if (passengerCount < 1) {
      setError("Total number of guests must be at least 1.");
      return;
    }

    if (passengerCount > availableSeats) {
      setError("Not enough seats available for this departure.");
      return;
    }

    if (!customerName.trim()) {
      setError("Client / Group Name is required.");
      return;
    }

    if (!customerEmail.trim()) {
      setError("Client Email is required.");
      return;
    }

    if (!customerPhoneNumber.trim()) {
      setError("Main Contact Phone is required.");
      return;
    }

    if (!hasAnyRooms) {
      setError("Please enter at least one room.");
      return;
    }

    if (!roomingMatchesPassengers) {
      setError(
        `Passenger count (${passengerCount}) must match rooming count (${roomingGuestCount}).`
      );
      return;
    }

    if (!pricingResult.ok) {
      setError(pricingResult.message);
      return;
    }

    const customerPhone = `${customerPhoneCode} ${customerPhoneNumber}`.trim();
    const leadPhone = leadPhoneNumber.trim()
      ? `${leadPhoneCode} ${leadPhoneNumber}`.trim()
      : null;

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/b2b/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tourId,
          departureDateId,
          bookingType: "FIT",
          adults,
          children,
          infants,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone,
          leadFirstName: leadFirstName.trim() || null,
          leadLastName: leadLastName.trim() || null,
          leadEmail: leadEmail.trim() || null,
          leadPhone,
          notes: notes.trim() || null,
          specialRequests: specialRequests.trim() || null,
          landOnly,
          needsFlights,
          singleRooms,
          doubleRooms,
          twinRooms,
          tripleRooms,
          numberOfGuests: pricingResult.value.totalPax,
          totalPrice: pricingResult.value.grossAmount,
          commissionAmount: pricingResult.value.commissionAmount,
          netAmount: pricingResult.value.netAmount,
          calculatedPricePerPerson: pricingResult.value.pricePerPerson,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | BookingApiResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        setError(
          (data && "error" in data && data.error) || "Booking failed."
        );
        return;
      }

      if (!data || !("booking" in data) || !data.booking?.id) {
        setError("Booking was created, but the response was incomplete.");
        return;
      }

      setSuccessMessage(
        `Booking created successfully. Reference: ${data.booking.bookingReference}`
      );

      router.push(`/b2b/bookings/${data.booking.id}`);
      router.refresh();
    } catch (submitError) {
      console.error("BOOKING_FORM_ERROR", submitError);
      setError("Booking failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#001F3F]">Departure</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the departure you want to book.
          </p>
        </div>

        <div>
          <label htmlFor="departureDateId" className="text-sm font-medium">
            Departure
          </label>
          <select
            id="departureDateId"
            value={departureDateId}
            onChange={(e) => {
              setDepartureDateId(e.target.value);
              setError(null);
            }}
            className="mt-1 w-full rounded-md border p-2"
            required
          >
            {departures.length === 0 ? (
              <option value="">No departures available</option>
            ) : (
              departures.map((departure) => {
                const seatsLeft = Math.max(
                  departure.capacity - departure.bookedSeats,
                  0
                );

                return (
                  <option key={departure.id} value={departure.id}>
                    {formatDate(departure.date)} | {departure.season} |{" "}
                    {formatCurrency(departure.price)} |{" "}
                    {getStatusLabel(departure.status)} | Seats Left: {seatsLeft}
                  </option>
                );
              })
            )}
          </select>
        </div>

        {selectedDeparture ? (
          <div className="grid gap-4 rounded-xl border bg-gray-50 p-4 md:grid-cols-5">
            <div>
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="text-sm font-medium">
                {formatCurrency(selectedDeparture.price)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Capacity</div>
              <div className="text-sm font-medium">
                {selectedDeparture.capacity}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Booked</div>
              <div className="text-sm font-medium">
                {selectedDeparture.bookedSeats}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Available</div>
              <div className="text-sm font-medium">{availableSeats}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                  selectedDeparture.status
                )}`}
              >
                {getStatusLabel(selectedDeparture.status)}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#001F3F]">Passengers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the passenger breakdown for this booking.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="adults" className="text-sm font-medium">
              Adults
            </label>
            <input
              id="adults"
              type="number"
              min={1}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border p-2"
              required
            />
          </div>

          <div>
            <label htmlFor="children" className="text-sm font-medium">
              Children
            </label>
            <input
              id="children"
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="infants" className="text-sm font-medium">
              Infants
            </label>
            <input
              id="infants"
              type="number"
              min={0}
              value={infants}
              onChange={(e) => setInfants(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Client / Group Information
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="customerName" className="text-sm font-medium">
              Client / Group Name
            </label>
            <input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              placeholder="St. Mary Parish Group"
              required
            />
          </div>

          <div>
            <label htmlFor="customerEmail" className="text-sm font-medium">
              Client Email
            </label>
            <input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              placeholder="group@example.com"
              required
            />
          </div>
        </div>

        <PhoneInput
          label="Main Contact Phone"
          codeValue={customerPhoneCode}
          numberValue={customerPhoneNumber}
          onCodeChange={setCustomerPhoneCode}
          onNumberChange={setCustomerPhoneNumber}
          required
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Lead Traveler
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional, but recommended.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="leadFirstName" className="text-sm font-medium">
              First Name
            </label>
            <input
              id="leadFirstName"
              value={leadFirstName}
              onChange={(e) => setLeadFirstName(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="leadLastName" className="text-sm font-medium">
              Last Name
            </label>
            <input
              id="leadLastName"
              value={leadLastName}
              onChange={(e) => setLeadLastName(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="leadEmail" className="text-sm font-medium">
              Email
            </label>
            <input
              id="leadEmail"
              type="email"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>
        </div>

        <PhoneInput
          label="Lead Traveler Phone"
          codeValue={leadPhoneCode}
          numberValue={leadPhoneNumber}
          onCodeChange={setLeadPhoneCode}
          onNumberChange={setLeadPhoneNumber}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Rooming & Services
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter room counts. Pricing is calculated from the room setup below.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="singleRooms" className="text-sm font-medium">
              Single Rooms
            </label>
            <input
              id="singleRooms"
              type="number"
              min={0}
              value={singleRooms}
              onChange={(e) => setSingleRooms(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="doubleRooms" className="text-sm font-medium">
              Double Rooms
            </label>
            <input
              id="doubleRooms"
              type="number"
              min={0}
              value={doubleRooms}
              onChange={(e) => setDoubleRooms(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="twinRooms" className="text-sm font-medium">
              Twin Rooms
            </label>
            <input
              id="twinRooms"
              type="number"
              min={0}
              value={twinRooms}
              onChange={(e) => setTwinRooms(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="tripleRooms" className="text-sm font-medium">
              Triple Rooms
            </label>
            <input
              id="tripleRooms"
              type="number"
              min={0}
              value={tripleRooms}
              onChange={(e) => setTripleRooms(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              checked={landOnly}
              onChange={(e) => setLandOnly(e.target.checked)}
            />
            Land only
          </label>

          <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              checked={needsFlights}
              onChange={(e) => setNeedsFlights(e.target.checked)}
            />
            Needs flights
          </label>
        </div>

        <div className="rounded-xl border bg-slate-50 p-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">
                Passenger Count
              </div>
              <div className="text-sm font-medium">{passengerCount}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">
                Rooming Guest Count
              </div>
              <div className="text-sm font-medium">{roomingGuestCount}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">
                Match Status
              </div>
              <div
                className={`text-sm font-medium ${
                  roomingMatchesPassengers
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {roomingMatchesPassengers ? "Matched" : "Mismatch"}
              </div>
            </div>
          </div>

          {!roomingMatchesPassengers && hasAnyRooms ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Passenger count and rooming count must match before booking.
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#001F3F]">Notes</h2>
        </div>

        <div>
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="General booking notes..."
          />
        </div>

        <div>
          <label htmlFor="specialRequests" className="text-sm font-medium">
            Special Requests
          </label>
          <textarea
            id="specialRequests"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="Special rooming, dietary, mobility, or service requests..."
          />
        </div>
      </section>

      <section className="rounded-xl border bg-gray-50 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Live Pricing Summary
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pricing updates automatically based on departure, rooming, and the
            tour’s pricing model.
          </p>
        </div>

        {!pricingResult.ok ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {pricingResult.message}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <div className="text-xs text-muted-foreground">Guests</div>
              <div className="text-sm font-medium">
                {pricingResult.value.totalPax}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Gross</div>
              <div className="text-sm font-medium">
                {formatCurrency(pricingResult.value.grossAmount)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Commission</div>
              <div className="text-sm font-medium text-green-700">
                {formatCurrency(pricingResult.value.commissionAmount)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Net</div>
              <div className="text-sm font-medium">
                {formatCurrency(pricingResult.value.netAmount)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">
                Price Per Person
              </div>
              <div className="text-xl font-semibold text-[#001F3F]">
                {formatCurrency(pricingResult.value.pricePerPerson)}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Seats Available</div>
            <div className="text-sm font-medium">{availableSeats}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Pricing Type</div>
            <div className="text-sm font-medium">{pricingType}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Commission Rate</div>
            <div className="text-sm font-medium">{commissionRate}%</div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          departures.length === 0 ||
          !departureBookable ||
          !hasAnyRooms ||
          !roomingMatchesPassengers ||
          !pricingResult.ok
        }
        className="rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating Booking..." : "Create Booking"}
      </button>
    </form>
  );
}