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
  const today = new Date();

  const [booking, suppliers] = await Promise.all([
    db.booking.findUnique({
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
    }),

    db.supplier.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [
        { preferred: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        preferred: true,
        country: true,
        city: true,
        address: true,
        email: true,
        phone: true,
        emergencyPhone: true,
        contacts: {
          where: {
            OR: [
              { isPrimary: true },
              { isEmergency: true },
            ],
          },
          orderBy: [
            { isPrimary: "desc" },
            { isEmergency: "desc" },
          ],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            email: true,
            phone: true,
            mobile: true,
            isPrimary: true,
            isEmergency: true,
          },
        },
        services: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            type: true,
            name: true,
            city: true,
            country: true,
          },
        },
        rates: {
          where: {
            isActive: true,
            validFrom: { lte: today },
            validTo: { gte: today },
          },
          take: 6,
          orderBy: [
            { validTo: "asc" },
            { name: "asc" },
          ],
          select: {
            id: true,
            serviceId: true,
            name: true,
            currency: true,
            amount: true,
            unit: true,
            roomType: true,
            mealBasis: true,
            validFrom: true,
            validTo: true,
          },
        },
      },
    }),
  ]);

  if (!booking) {
    notFound();
  }

  const supplierOptions = suppliers.map((supplier) => {
    const primaryContact =
      supplier.contacts.find((contact) => contact.isPrimary) ??
      supplier.contacts[0] ??
      null;

    return {
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      type: supplier.type,
      preferred: supplier.preferred,
      country: supplier.country,
      city: supplier.city,
      address: supplier.address,
      email: supplier.email,
      phone: supplier.phone,
      emergencyPhone: supplier.emergencyPhone,
      primaryContact: primaryContact
        ? {
            id: primaryContact.id,
            name: [primaryContact.firstName, primaryContact.lastName]
              .filter(Boolean)
              .join(" "),
            jobTitle: primaryContact.jobTitle,
            email: primaryContact.email,
            phone: primaryContact.mobile || primaryContact.phone,
          }
        : null,
      services: supplier.services,
      rates: supplier.rates.map((rate) => ({
        ...rate,
        amount: rate.amount.toString(),
      })),
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-sm text-slate-500">
          Admin / Bookings / Operation Control
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#001F3F]">
          Booking Operation Control
        </h1>

        <p className="mt-1 text-slate-600">
          {booking.bookingReference} —{" "}
          {booking.tour?.title || booking.tourTitleSnapshot || "Tour"}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {booking.user?.fullName || booking.user?.email || "No customer"}
        </p>
      </div>

      <BookingOperationControlForm
        bookingId={booking.id}
        initialData={booking.operationControl}
        suppliers={supplierOptions}
      />
    </div>
  );
}
