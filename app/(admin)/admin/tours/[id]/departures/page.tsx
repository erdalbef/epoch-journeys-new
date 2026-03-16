import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DepartureStatus } from "@prisma/client";

import { db } from "@/lib/db";

type PageProps = {
  params: {
    id: string;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: DepartureStatus) {
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

async function createDeparture(tourId: string, formData: FormData) {
  "use server";

  const dateValue = formData.get("date");
  const seasonValue = formData.get("season");
  const priceValue = formData.get("price");
  const capacityValue = formData.get("capacity");
  const bookedSeatsValue = formData.get("bookedSeats");
  const statusValue = formData.get("status");
  const earlyDiscountPercentValue = formData.get("earlyDiscountPercent");
  const earlyDiscountDeadlineValue = formData.get("earlyDiscountDeadline");

  if (
    typeof dateValue !== "string" ||
    typeof seasonValue !== "string" ||
    typeof priceValue !== "string" ||
    typeof capacityValue !== "string" ||
    typeof bookedSeatsValue !== "string" ||
    typeof statusValue !== "string"
  ) {
    return;
  }

  const date = new Date(dateValue);
  const season = seasonValue.trim();
  const price = Number(priceValue);
  const capacity = Number(capacityValue);
  const bookedSeats = Number(bookedSeatsValue);

  if (
    Number.isNaN(date.getTime()) ||
    !season ||
    Number.isNaN(price) ||
    price < 0 ||
    Number.isNaN(capacity) ||
    capacity < 0 ||
    Number.isNaN(bookedSeats) ||
    bookedSeats < 0 ||
    bookedSeats > capacity
  ) {
    return;
  }

  const allowedStatuses: DepartureStatus[] = [
    "EARLY_BOOKING",
    "AVAILABLE",
    "SOLD_OUT",
    "CLOSED",
  ];

  const status: DepartureStatus = allowedStatuses.includes(
    statusValue as DepartureStatus
  )
    ? (statusValue as DepartureStatus)
    : "AVAILABLE";

  const earlyDiscountPercent =
    typeof earlyDiscountPercentValue === "string" &&
    earlyDiscountPercentValue.trim() !== ""
      ? Number(earlyDiscountPercentValue)
      : null;

  const validEarlyDiscountPercent =
    earlyDiscountPercent !== null &&
    !Number.isNaN(earlyDiscountPercent) &&
    earlyDiscountPercent >= 0
      ? earlyDiscountPercent
      : null;

  const earlyDiscountDeadline =
    typeof earlyDiscountDeadlineValue === "string" &&
    earlyDiscountDeadlineValue.trim() !== ""
      ? new Date(earlyDiscountDeadlineValue)
      : null;

  const validEarlyDiscountDeadline =
    earlyDiscountDeadline &&
    !Number.isNaN(earlyDiscountDeadline.getTime())
      ? earlyDiscountDeadline
      : null;

  await db.departureDate.create({
    data: {
      tourId,
      date,
      season,
      price,
      capacity,
      bookedSeats,
      status,
      earlyDiscountPercent: validEarlyDiscountPercent,
      earlyDiscountDeadline: validEarlyDiscountDeadline,
    },
  });

  redirect(`/admin/tours/${tourId}/departures`);
}

export default async function TourDeparturesPage({ params }: PageProps) {
  const { id } = params;

  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      departureDates: {
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!tour) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Departures — {tour.title}</h1>
          <p className="text-sm text-muted-foreground">
            Manage departure dates, pricing, and capacity.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/admin/tours/${tour.id}/edit`}
            className="text-sm underline underline-offset-4"
          >
            Edit Tour
          </Link>

          <Link
            href="/admin/tours"
            className="text-sm underline underline-offset-4"
          >
            Back to Tours
          </Link>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add Departure</h2>
          <p className="text-sm text-muted-foreground">
            Create a new departure date for this tour.
          </p>
        </div>

        <form
          action={createDeparture.bind(null, tour.id)}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <div>
            <label htmlFor="date" className="text-sm font-medium">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label htmlFor="season" className="text-sm font-medium">
              Season
            </label>
            <input
              id="season"
              name="season"
              required
              placeholder="Shoulder"
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label htmlFor="price" className="text-sm font-medium">
              Price
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="2390"
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="AVAILABLE"
              className="mt-1 w-full rounded border p-2"
            >
              <option value="EARLY_BOOKING">Early Booking</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD_OUT">Sold Out</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label htmlFor="capacity" className="text-sm font-medium">
              Capacity
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min="0"
              required
              defaultValue="0"
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label htmlFor="bookedSeats" className="text-sm font-medium">
              Booked Seats
            </label>
            <input
              id="bookedSeats"
              name="bookedSeats"
              type="number"
              min="0"
              required
              defaultValue="0"
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="earlyDiscountPercent"
              className="text-sm font-medium"
            >
              Early Discount %
            </label>
            <input
              id="earlyDiscountPercent"
              name="earlyDiscountPercent"
              type="number"
              min="0"
              step="0.01"
              placeholder="10"
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="earlyDiscountDeadline"
              className="text-sm font-medium"
            >
              Early Discount Deadline
            </label>
            <input
              id="earlyDiscountDeadline"
              name="earlyDiscountDeadline"
              type="date"
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
            >
              Add Departure
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Season</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Capacity</th>
              <th className="p-3 text-left">Booked</th>
              <th className="p-3 text-left">Early Discount</th>
              <th className="p-3 text-left">Deadline</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {tour.departureDates.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No departures created yet.
                </td>
              </tr>
            ) : (
              tour.departureDates.map((departure) => (
                <tr key={departure.id} className="border-b">
                  <td className="p-3">{formatDate(departure.date)}</td>
                  <td className="p-3">{departure.season}</td>
                  <td className="p-3">{formatCurrency(departure.price)}</td>
                  <td className="p-3">{departure.capacity}</td>
                  <td className="p-3">{departure.bookedSeats}</td>
                  <td className="p-3">
                    {departure.earlyDiscountPercent != null
                      ? `${departure.earlyDiscountPercent}%`
                      : "-"}
                  </td>
                  <td className="p-3">
                    {departure.earlyDiscountDeadline
                      ? formatDate(departure.earlyDiscountDeadline)
                      : "-"}
                  </td>
                  <td className="p-3">{getStatusLabel(departure.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}