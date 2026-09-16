import { getServerSession } from "next-auth";
import {
  notFound,
  redirect,
} from "next/navigation";

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
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !==
      "ADMIN"
  ) {
    redirect(
      "/admin-login",
    );
  }

  const { id } =
    await params;

  const booking =
    await db.booking.findUnique({
      where: {
        id,
      },

      include: {
        tour: {
          select: {
            title:
              true,
          },
        },

        user: {
          select: {
            fullName:
              true,

            email:
              true,
          },
        },

        operationControl:
          true,
      },
    });

  if (!booking) {
    notFound();
  }

  const tourTitle =
    booking.tour?.title ||
    booking.tourTitleSnapshot ||
    "Tour";

  const customerName =
    booking.groupName ||
    booking.agencyNameSnapshot ||
    booking.user?.fullName ||
    booking.user?.email ||
    "No customer";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Admin / Bookings /
          Operations Control
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#001F3F]">
          Booking Operations
          & Tour Management
        </h1>

        <p className="mt-2 text-lg font-medium text-slate-700">
          {
            booking.bookingReference
          }{" "}
          — {tourTitle}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {customerName}
        </p>

        {booking.groupLeaderName && (
          <p className="mt-1 text-sm text-slate-500">
            Group Leader:{" "}
            {
              booking.groupLeaderName
            }
          </p>
        )}
      </div>

      <BookingOperationControlForm
        bookingId={
          booking.id
        }
        initialData={
          booking.operationControl
        }
      />
    </div>
  );
}