import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import BookingDetailView from "@/components/b2b/BookingDetailView";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) {
    redirect("/b2b/bookings");
  }

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      travelAgency: true,
      partnerType: true,
    },
  });

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          fullName: true,
          travelAgency: true,
        },
      },
      passengers: {
        orderBy: [
          { isLeadPassenger: "desc" },
          { lastName: "asc" },
          { firstName: "asc" },
        ],
      },
      payments: {
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        include: {
          allocations: {
            orderBy: {
              allocatedAt: "asc",
            },
            include: {
              paymentSchedule: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  dueDate: true,
                  amount: true,
                  amountPaid: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      paymentSubmissions: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
      paymentSchedules: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    redirect("/b2b/bookings");
  }

  return (
    <BookingDetailView
      booking={booking}
      currentUser={currentUser}
      backHref="/b2b/bookings"
      backLabel="Back to Bookings"
    />
  );
}