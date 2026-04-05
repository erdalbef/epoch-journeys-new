import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import PassengerForm from "@/components/b2b/PassengerForm";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export default async function EditPassengerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const { id } = await params;

  const passenger = await db.passenger.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          id: true,
          userId: true,
          bookingType: true,
        },
      },
    },
  });

  if (!passenger || passenger.booking.userId !== session.user.id) {
    redirect("/b2b/bookings");
  }

  const backHref =
    passenger.booking.bookingType === "GROUP"
      ? `/b2b/groups/${passenger.booking.id}`
      : `/b2b/bookings/${passenger.booking.id}`;

  return (
    <PassengerForm
      mode="edit"
      bookingId={passenger.booking.id}
      passengerId={passenger.id}
      cancelHref={backHref}
      afterSaveHref={backHref}
      initialValues={{
        title: passenger.title ?? "",
        firstName: passenger.firstName,
        middleName: passenger.middleName ?? "",
        lastName: passenger.lastName,
        gender: passenger.gender ?? "",
        dateOfBirth: passenger.dateOfBirth
          ? passenger.dateOfBirth.toISOString()
          : "",
        nationality: passenger.nationality ?? "",
        email: passenger.email ?? "",
        phone: passenger.phone ?? "",
        passportNumber: passenger.passportNumber ?? "",
        passportExpiry: passenger.passportExpiry
          ? passenger.passportExpiry.toISOString()
          : "",
        passportIssueDate: passenger.passportIssueDate
          ? passenger.passportIssueDate.toISOString()
          : "",
        passportCountry: passenger.passportCountry ?? "",
        roomType: passenger.roomType ?? "",
        isLeadPassenger: passenger.isLeadPassenger,
        specialRequests: passenger.specialRequests ?? "",
        emergencyContactName: passenger.emergencyContactName ?? "",
        emergencyContactPhone: passenger.emergencyContactPhone ?? "",
        notes: passenger.notes ?? "",
      }}
    />
  );
}