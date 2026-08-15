import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import BookingOperationControlForm from "./BookingOperationControlForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookingOperationControlPage({
  params,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      tour: {
        select: {
          title: true,
        },
      },
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      operationControl: true,
    },
  });

  if (!booking) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <p className="text-sm text-gray-500">Admin / Bookings / Control</p>

        <h1 className="mt-2 text-3xl font-bold text-[#001F3F]">
          Booking Operation Control
        </h1>

        <p className="mt-1 text-gray-600">
          {booking.bookingReference} —{" "}
          {booking.tour?.title || booking.tourTitleSnapshot || "Tour"}
        </p>

        <p className="mt-1 text-sm text-gray-500">
          {booking.user?.fullName || booking.user?.email || "No customer"}
        </p>
      </div>

      <BookingOperationControlForm
        bookingId={booking.id}
        initialData={booking.operationControl}
      />
    </div>
  );
}