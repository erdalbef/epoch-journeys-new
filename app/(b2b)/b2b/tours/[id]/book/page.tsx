import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { BookingForm } from "./BookingForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    departureId?: string;
  }>;
};

export default async function BookTourPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      approved: true,
      status: true,
    },
  });

  if (!user || user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
    redirect("/agent-login");
  }

  const { id } = await params;
  const { departureId } = await searchParams;

  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      departureDates: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!tour) {
    redirect("/b2b/tours");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#001F3F]">Book Tour</h1>
        <p className="text-sm text-muted-foreground">
          Complete the booking form for this tour.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <BookingForm
          tourId={tour.id}
          departures={tour.departureDates.map((departure) => ({
            id: departure.id,
            date: departure.date.toISOString(),
            season: departure.season,
            price: departure.price,
            capacity: departure.capacity,
            bookedSeats: departure.bookedSeats,
            status: String(departure.status),
          }))}
          selectedDepartureId={departureId}
        />
      </div>
    </div>
  );
}