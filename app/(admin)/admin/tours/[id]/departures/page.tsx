import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DepartureStatus } from "@prisma/client";

import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

function formatDateInput(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getStatusBadgeClass(status: DepartureStatus) {
  switch (status) {
    case "EARLY_BOOKING":
      return "bg-amber-100 text-amber-800";
    case "AVAILABLE":
      return "bg-green-100 text-green-800";
    case "SOLD_OUT":
      return "bg-red-100 text-red-800";
    case "CLOSED":
      return "bg-gray-200 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function parseStatus(value: string): DepartureStatus {
  const allowedStatuses: DepartureStatus[] = [
    "EARLY_BOOKING",
    "AVAILABLE",
    "SOLD_OUT",
    "CLOSED",
  ];

  return allowedStatuses.includes(value as DepartureStatus)
    ? (value as DepartureStatus)
    : "AVAILABLE";
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

  const status = parseStatus(statusValue);

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

async function updateDeparture(tourId: string, departureId: string, formData: FormData) {
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

  let status = parseStatus(statusValue);

  if (bookedSeats >= capacity && capacity > 0) {
    status = "SOLD_OUT";
  }

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

  await db.departureDate.update({
    where: { id: departureId },
    data: {
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
  const { id } = await params;

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
          <h1 className="text-2xl font-semibold">Departures - {tour.title}</h1>
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

      <div className="space-y-4">
        {tour.departureDates.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-gray-500">
            No departures created yet.
          </div>
        ) : (
          tour.departureDates.map((departure) => {
            const remainingSeats = Math.max(
              0,
              departure.capacity - departure.bookedSeats
            );

            return (
              <div key={departure.id} className="rounded-lg border bg-white p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {formatDate(departure.date)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {departure.season} · {formatCurrency(Number(departure.price))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                        departure.status
                      )}`}
                    >
                      {getStatusLabel(departure.status)}
                    </span>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                      Remaining Seats: {remainingSeats}
                    </span>
                  </div>
                </div>

                <form
                  action={updateDeparture.bind(null, tour.id, departure.id)}
                  className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  <div>
                    <label
                      htmlFor={`date-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Date
                    </label>
                    <input
                      id={`date-${departure.id}`}
                      name="date"
                      type="date"
                      required
                      defaultValue={formatDateInput(departure.date)}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`season-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Season
                    </label>
                    <input
                      id={`season-${departure.id}`}
                      name="season"
                      required
                      defaultValue={departure.season}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`price-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Price
                    </label>
                    <input
                      id={`price-${departure.id}`}
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={departure.price}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`status-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Status
                    </label>
                    <select
                      id={`status-${departure.id}`}
                      name="status"
                      defaultValue={departure.status}
                      className="mt-1 w-full rounded border p-2"
                    >
                      <option value="EARLY_BOOKING">Early Booking</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="SOLD_OUT">Sold Out</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`capacity-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Capacity
                    </label>
                    <input
                      id={`capacity-${departure.id}`}
                      name="capacity"
                      type="number"
                      min="0"
                      required
                      defaultValue={departure.capacity}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`bookedSeats-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Booked Seats
                    </label>
                    <input
                      id={`bookedSeats-${departure.id}`}
                      name="bookedSeats"
                      type="number"
                      min="0"
                      required
                      defaultValue={departure.bookedSeats}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`earlyDiscountPercent-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Early Discount %
                    </label>
                    <input
                      id={`earlyDiscountPercent-${departure.id}`}
                      name="earlyDiscountPercent"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={departure.earlyDiscountPercent ?? ""}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`earlyDiscountDeadline-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Early Discount Deadline
                    </label>
                    <input
                      id={`earlyDiscountDeadline-${departure.id}`}
                      name="earlyDiscountDeadline"
                      type="date"
                      defaultValue={formatDateInput(
                        departure.earlyDiscountDeadline
                      )}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div className="md:col-span-2 xl:col-span-4">
                    <button
                      type="submit"
                      className="rounded bg-navy-700 bg-[#001F3F] px-4 py-2 text-white hover:bg-[#001733]"
                    >
                      Update Departure
                    </button>
                  </div>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}