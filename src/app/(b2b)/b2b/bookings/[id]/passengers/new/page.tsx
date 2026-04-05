import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import PassengerForm from "@/components/b2b/PassengerForm";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export default async function NewPassengerPage({
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
    select: {
      id: true,
      userId: true,
      bookingType: true,
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    redirect("/b2b/bookings");
  }

  return (
    <PassengerForm
      mode="create"
      bookingId={booking.id}
      cancelHref={
        booking.bookingType === "GROUP"
          ? `/b2b/groups/${booking.id}`
          : `/b2b/bookings/${booking.id}`
      }
      afterSaveHref={
        booking.bookingType === "GROUP"
          ? `/b2b/groups/${booking.id}`
          : `/b2b/bookings/${booking.id}`
      }
    />
  );
}