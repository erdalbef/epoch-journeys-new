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

export function BookingForm({
  tourId,
  departures,
  selectedDepartureId,
}: BookingFormProps) {
  const router = useRouter();

  const [departureDateId, setDepartureDateId] = useState(
    selectedDepartureId && departures.some((d) => d.id === selectedDepartureId)
      ? selectedDepartureId
      : departures[0]?.id ?? ""
  );

  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDeparture = useMemo(() => {
    return departures.find((item) => item.id === departureDateId) ?? null;
  }, [departures, departureDateId]);

  const availableSeats = selectedDeparture
    ? selectedDeparture.capacity - selectedDeparture.bookedSeats
    : 0;

  const totalPrice = selectedDeparture
    ? selectedDeparture.price * numberOfGuests
    : 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedDeparture) {
      alert("Please select a departure.");
      return;
    }

    if (numberOfGuests < 1) {
      alert("Number of guests must be at least 1.");
      return;
    }

    if (numberOfGuests > availableSeats) {
      alert("Not enough seats available.");
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
          adults: numberOfGuests,
          children: 0,
          infants: 0,
          customerName,
          customerEmail,
          customerPhone,
          notes,
          landOnly: true,
          needsFlights: false,
          singleRooms: 0,
          doubleRooms: 0,
          twinRooms: 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Booking failed.");
        return;
      }

      alert(
        `Booking created successfully. Reference: ${data.bookingReference}`
      );
      router.push("/b2b/bookings");
      router.refresh();
    } catch (error) {
      console.error("BOOKING_FORM_ERROR", error);
      alert("Booking failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="departureDateId" className="text-sm font-medium">
          Departure
        </label>
        <select
          id="departureDateId"
          value={departureDateId}
          onChange={(e) => setDepartureDateId(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          required
        >
          {departures.length === 0 && (
            <option value="">No departures available</option>
          )}

          {departures.map((departure) => {
            const seatsLeft = departure.capacity - departure.bookedSeats;

            return (
              <option key={departure.id} value={departure.id}>
                {formatDate(departure.date)} | {departure.season} |{" "}
                {formatCurrency(departure.price)} | {departure.status} | Seats Left:{" "}
                {seatsLeft}
              </option>
            );
          })}
        </select>
      </div>

      {selectedDeparture && (
        <div className="grid gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-4">
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
        </div>
      )}

      <div>
        <label htmlFor="numberOfGuests" className="text-sm font-medium">
          Number of Guests
        </label>
        <input
          id="numberOfGuests"
          type="number"
          min={1}
          value={numberOfGuests}
          onChange={(e) => setNumberOfGuests(Number(e.target.value))}
          className="mt-1 w-full rounded border p-2"
          required
        />
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
            className="mt-1 w-full rounded border p-2"
            placeholder="St. Mary Parish Group"
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
            className="mt-1 w-full rounded border p-2"
            placeholder="group@example.com"
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
            className="mt-1 w-full rounded border p-2"
            placeholder="+1 555 123 4567"
          />
        </div>
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
          className="mt-1 w-full rounded border p-2"
          placeholder="Special requests, rooming notes, or booking comments..."
        />
      </div>

      <div className="rounded-lg border bg-gray-50 p-4">
        <div className="text-sm text-muted-foreground">Estimated Total</div>
        <div className="text-xl font-semibold">
          {formatCurrency(totalPrice)}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || departures.length === 0}
        className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating Booking..." : "Create Booking"}
      </button>
    </form>
  );
}