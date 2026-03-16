import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getDisplayReference(
  bookingDisplayCode: string | null,
  bookingReference: string
) {
  return bookingDisplayCode || bookingReference;
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          fullName: true,
          travelAgency: true,
          email: true,
        },
      },
      departureDate: {
        select: {
          date: true,
          season: true,
        },
      },
      passengers: {
        orderBy: [
          { isLeadPassenger: "desc" },
          { lastName: "asc" },
          { firstName: "asc" },
        ],
      },
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    redirect("/b2b/bookings");
  }

  const displayReference = getDisplayReference(
    booking.bookingDisplayCode,
    booking.bookingReference
  );

  const clientName =
    booking.customerName ||
    `${booking.leadFirstName ?? ""} ${booking.leadLastName ?? ""}`.trim() ||
    "-";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#001F3F]">
              Booking {displayReference}
            </h1>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>Created {formatDate(booking.createdAt)}</p>
              {booking.bookingDisplayCode ? (
                <p>Official Ref: {booking.bookingReference}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/api/b2b/bookings/${booking.id}/voucher`}
              className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Download Voucher
            </Link>

            <Link
              href="/b2b/bookings"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Back to Bookings
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Tour Information
        </h2>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Tour</div>
            <div className="font-medium">{booking.tourTitleSnapshot}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Departure Date</div>
            <div className="font-medium">
              {formatDate(booking.departureDateSnapshot)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Season</div>
            <div className="font-medium">{booking.seasonSnapshot}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Booking Type</div>
            <div className="font-medium">{booking.bookingType}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Client / Group
        </h2>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Customer / Lead</div>
            <div className="font-medium">{clientName}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Group Name</div>
            <div className="font-medium">{booking.groupName || "-"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Customer Email</div>
            <div className="font-medium">{booking.customerEmail || "-"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Customer Phone</div>
            <div className="font-medium">{booking.customerPhone || "-"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Agency</div>
            <div className="font-medium">{booking.agencyNameSnapshot || "-"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Agent</div>
            <div className="font-medium">
              {booking.agentNameSnapshot || booking.user.fullName || "-"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">Guests</h2>

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Adults</div>
            <div className="font-medium">{booking.adults}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Children</div>
            <div className="font-medium">{booking.children}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Infants</div>
            <div className="font-medium">{booking.infants}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Single Rooms</div>
            <div className="font-medium">{booking.singleRooms}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Double Rooms</div>
            <div className="font-medium">{booking.doubleRooms}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Twin Rooms</div>
            <div className="font-medium">{booking.twinRooms}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Passenger List
        </h2>

        {booking.passengers.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No passenger records have been added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Passenger</th>
                  <th className="pb-3 pr-4 font-medium">Lead</th>
                  <th className="pb-3 pr-4 font-medium">Gender</th>
                  <th className="pb-3 pr-4 font-medium">Date of Birth</th>
                  <th className="pb-3 pr-4 font-medium">Nationality</th>
                  <th className="pb-3 pr-4 font-medium">Passport No.</th>
                  <th className="pb-3 pr-4 font-medium">Passport Expiry</th>
                  <th className="pb-3 pr-4 font-medium">Room Type</th>
                  <th className="pb-3 pr-4 font-medium">Special Requests</th>
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((passenger) => (
                  <tr key={passenger.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-800">
                        {passenger.firstName} {passenger.lastName}
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      {passenger.isLeadPassenger ? (
                        <span className="rounded-full bg-[#001F3F]/10 px-2 py-1 text-xs font-medium text-[#001F3F]">
                          Lead
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.gender || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(passenger.dateOfBirth)}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.nationality || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.passportNumber || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(passenger.passportExpiry)}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.roomType || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.specialRequests || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">Pricing</h2>

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Total Price</div>
            <div className="font-semibold text-[#001F3F]">
              {formatCurrency(booking.totalPrice)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Commission</div>
            <div className="font-semibold text-green-700">
              {formatCurrency(booking.commissionAmount)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Net Amount</div>
            <div className="font-semibold">{formatCurrency(booking.netAmount)}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Booking Status
        </h2>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Booking Status</div>
            <div className="font-medium">{booking.status}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Payment Status</div>
            <div className="font-medium">{booking.paymentStatus}</div>
          </div>
        </div>
      </section>

      {(booking.notes || booking.specialRequests) && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
            Notes & Requests
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <div className="text-muted-foreground">Notes</div>
              <div className="font-medium">{booking.notes || "-"}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Special Requests</div>
              <div className="font-medium">{booking.specialRequests || "-"}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}