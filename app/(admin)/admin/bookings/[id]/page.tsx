import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AdminBookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      passengers: true,
      user: {
        select: {
          fullName: true,
          email: true,
          travelAgency: true,
        },
      },
    },
  });

  if (!booking) {
    redirect("/admin/bookings");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#001F3F]">
          Booking {booking.bookingDisplayCode || booking.bookingReference}
        </h1>

        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>Created {formatDate(booking.createdAt)}</p>
          {booking.bookingDisplayCode ? (
            <p>Official Ref: {booking.bookingReference}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">
          Tour Information
        </h2>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Tour</div>
            <div className="font-medium">{booking.tourTitleSnapshot}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Departure</div>
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
        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">
          Status
        </h2>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
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

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">
          Agent
        </h2>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Agent</div>
            <div className="font-medium">{booking.user.fullName || "-"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Agency</div>
            <div className="font-medium">{booking.agencyNameSnapshot || "-"}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Email</div>
            <div className="font-medium">{booking.user.email}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">
          Client / Group
        </h2>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Customer</div>
            <div className="font-medium">{booking.customerName || "-"}</div>
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
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">
          Guests
        </h2>

        <div className="grid md:grid-cols-3 gap-4 text-sm">
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
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">
          Pricing
        </h2>

        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total Price</div>
            <div className="font-semibold">
              {formatCurrency(booking.totalPrice, booking.currency)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Commission</div>
            <div className="font-semibold text-green-700">
              {formatCurrency(booking.commissionAmount, booking.currency)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Net Amount</div>
            <div className="font-semibold">
              {formatCurrency(booking.netAmount, booking.currency)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F] mb-4">
          Passengers
        </h2>

        {booking.passengers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No passenger records.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4">Passenger</th>
                  <th className="pb-3 pr-4">DOB</th>
                  <th className="pb-3 pr-4">Passport</th>
                  <th className="pb-3 pr-4">Nationality</th>
                </tr>
              </thead>

              <tbody>
                {booking.passengers.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-3 pr-4">
                      {p.firstName} {p.lastName}
                    </td>

                    <td className="py-3 pr-4">
                      {p.dateOfBirth ? formatDate(p.dateOfBirth) : "-"}
                    </td>

                    <td className="py-3 pr-4">{p.passportNumber || "-"}</td>

                    <td className="py-3 pr-4">{p.nationality || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}