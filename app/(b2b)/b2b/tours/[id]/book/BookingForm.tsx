"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DepartureItem = {
  id: string;
  date: string;
  season: string;
  price: number;
  capacity: number;
  bookedSeats: number;
  status: string;
};

type BookingFormProps = {
  tourId: string;
  departures: DepartureItem[];
  selectedDepartureId?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
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

export function BookingForm({
  tourId,
  departures,
  selectedDepartureId,
}: BookingFormProps) {
  const router = useRouter();

  const initialDepartureId =
    selectedDepartureId && departures.some((d) => d.id === selectedDepartureId)
      ? selectedDepartureId
      : departures.find((d) => {
          const seatsLeft = d.capacity - d.bookedSeats;
          return d.status !== "SOLD_OUT" && d.status !== "CLOSED" && seatsLeft > 0;
        })?.id ?? departures[0]?.id ?? "";

  const [departureDateId, setDepartureDateId] = useState(initialDepartureId);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");

  const [singleRooms, setSingleRooms] = useState(0);
  const [doubleRooms, setDoubleRooms] = useState(0);
  const [twinRooms, setTwinRooms] = useState(0);

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

  const numberOfGuests = adults + children + infants;

  const availableSeats = selectedDeparture
    ? Math.max(selectedDeparture.capacity - selectedDeparture.bookedSeats, 0)
    : 0;

  const totalPrice = selectedDeparture
    ? selectedDeparture.price * numberOfGuests
    : 0;

  const departureBookable =
    !!selectedDeparture &&
    selectedDeparture.status !== "SOLD_OUT" &&
    selectedDeparture.status !== "CLOSED" &&
    availableSeats > 0;

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

    if (numberOfGuests < 1) {
      setError("Total number of guests must be at least 1.");
      return;
    }

    if (numberOfGuests > availableSeats) {
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

    if (!customerPhone.trim()) {
      setError("Client Phone is required.");
      return;
    }

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
          adults,
          children,
          infants,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          leadFirstName: leadFirstName.trim() || null,
          leadLastName: leadLastName.trim() || null,
          leadEmail: leadEmail.trim() || null,
          leadPhone: leadPhone.trim() || null,
          notes: notes.trim() || null,
          specialRequests: specialRequests.trim() || null,
          landOnly,
          needsFlights,
          singleRooms,
          doubleRooms,
          twinRooms,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Booking failed.");
        return;
      }

      setSuccessMessage(
        `Booking created successfully. Reference: ${data.bookingReference}`
      );

      router.push("/b2b/bookings");
      router.refresh();
    } catch (error) {
      console.error("BOOKING_FORM_ERROR", error);
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
              <div className="text-sm font-medium">{selectedDeparture.capacity}</div>
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
              onChange={(e) => setAdults(Number(e.target.value))}
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
              onChange={(e) => setChildren(Number(e.target.value))}
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
              onChange={(e) => setInfants(Number(e.target.value))}
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

          <div>
            <label htmlFor="customerPhone" className="text-sm font-medium">
              Client Phone
            </label>
            <input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              placeholder="+1 555 123 4567"
              required
            />
          </div>
        </div>
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

          <div>
            <label htmlFor="leadPhone" className="text-sm font-medium">
              Phone
            </label>
            <input
              id="leadPhone"
              value={leadPhone}
              onChange={(e) => setLeadPhone(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Rooming & Services
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="singleRooms" className="text-sm font-medium">
              Single Rooms
            </label>
            <input
              id="singleRooms"
              type="number"
              min={0}
              value={singleRooms}
              onChange={(e) => setSingleRooms(Number(e.target.value))}
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
              onChange={(e) => setDoubleRooms(Number(e.target.value))}
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
              onChange={(e) => setTwinRooms(Number(e.target.value))}
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
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Guests</div>
            <div className="text-sm font-medium">{numberOfGuests}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Price Per Person</div>
            <div className="text-sm font-medium">
              {selectedDeparture
                ? formatCurrency(selectedDeparture.price)
                : formatCurrency(0)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Seats Available</div>
            <div className="text-sm font-medium">{availableSeats}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Estimated Total</div>
            <div className="text-xl font-semibold text-[#001F3F]">
              {formatCurrency(totalPrice)}
            </div>
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
        disabled={isSubmitting || departures.length === 0 || !departureBookable}
        className="rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating Booking..." : "Create Booking"}
      </button>
    </form>
  );
}