import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import BookingDetailView from "@/components/b2b/BookingDetailView";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const { id } = await params;

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
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    redirect("/b2b/groups");
  }

  if (booking.bookingType !== "GROUP") {
    redirect("/b2b/groups");
  }

  return (
    <BookingDetailView
      booking={booking}
      currentUser={currentUser}
      backHref="/b2b/groups"
      backLabel="Back to Groups"
    />
  );
}