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

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function textValue(
  value: unknown,
) {
  return typeof value === "string"
    ? value
    : "";
}

function dateInputValue(
  value: Date | null | undefined,
) {
  if (!value) {
    return "";
  }

  return value
    .toISOString()
    .slice(0, 10);
}

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
      title: true,
      },
    },

    user: {
      select: {
      fullName: true,
      email: true,
      },
    },

    partnerCompany: {
      select: {
      name: true,
      },
    },

    operationControl: true,
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

  /*
   * ==========================================================
   * AUTO-FILL TOUR MANAGEMENT FROM BOOKING
   * ==========================================================
   *
   * Existing manually entered Tour Management data always wins.
   *
   * Booking data is used only as a default when the corresponding
   * Tour Management field is still empty.
   * ==========================================================
   */

  const existingGroupInfo =
    isObject(
      booking.operationControl?.groupInfo,
    )
      ? booking.operationControl
          ?.groupInfo
      : {};

  const existingGroupLeaderInfo =
    isObject(
      booking.operationControl
        ?.groupLeaderInfo,
    )
      ? booking.operationControl
          ?.groupLeaderInfo
      : {};

  const groupName =
    textValue(
      existingGroupInfo.groupName,
    ) ||
    booking.groupName ||
    booking.agencyNameSnapshot ||
    booking.partnerPackageName ||
    "";

  const groupCode =
    textValue(
      existingGroupInfo.groupCode,
    ) ||
    booking.bookingDisplayCode ||
    booking.bookingReference;

  const numberOfPilgrims =
    textValue(
      existingGroupInfo.numberOfPilgrims,
    ) ||
    String(
      booking.finalPax ??
        booking.estimatedPax ??
        booking.numberOfGuests ??
        0,
    );

  const startDate =
    textValue(
      existingGroupInfo.startDate,
    ) ||
    dateInputValue(
      booking.travelStartDateSnapshot ??
        booking.departureDateSnapshot,
    );

  const endDate =
    textValue(
      existingGroupInfo.endDate,
    ) ||
    dateInputValue(
      booking.travelEndDateSnapshot,
    );

  const groupInfo = {
    groupName,

    groupCode,

    numberOfPilgrims,

    startDate,

    endDate,

    tourCoordinatorName:
      textValue(
        existingGroupInfo.tourCoordinatorName,
      ),

    tourCoordinatorPhone:
      textValue(
        existingGroupInfo.tourCoordinatorPhone,
      ),

    notes:
      textValue(
        existingGroupInfo.notes,
      ),
  };

  const groupLeaderInfo = {
    name:
      textValue(
        existingGroupLeaderInfo.name,
      ) ||
      booking.groupLeaderName ||
      "",

    phone:
      textValue(
        existingGroupLeaderInfo.phone,
      ),

    email:
      textValue(
        existingGroupLeaderInfo.email,
      ),

    company:
      textValue(
        existingGroupLeaderInfo.company,
      ) ||
      booking.agencyNameSnapshot ||
      booking.partnerCompany?.name ||
      "",

    notes:
      textValue(
        existingGroupLeaderInfo.notes,
      ),
  };

  /*
   * Build the complete InitialData object expected by
   * BookingOperationControlForm.
   */

  const initialData = {
    hotelItems:
      booking.operationControl
        ?.hotelItems ??
      [],

    transportItems:
      booking.operationControl
        ?.transportItems ??
      [],

    guideItems:
      booking.operationControl
        ?.guideItems ??
      [],

    restaurantItems:
      booking.operationControl
        ?.restaurantItems ??
      [],

    massItems:
      booking.operationControl
        ?.massItems ??
      [],

    ticketItems:
      booking.operationControl
        ?.ticketItems ??
      [],

    paymentItems:
      booking.operationControl
        ?.paymentItems ??
      [],

    documentItems:
      booking.operationControl
        ?.documentItems ??
      [],

    emergencyItems:
      booking.operationControl
        ?.emergencyItems ??
      [],

    groupInfo,

    tourManagerInfo:
      booking.operationControl
        ?.tourManagerInfo ??
      {},

    spiritualDirectorInfo:
      booking.operationControl
        ?.spiritualDirectorInfo ??
      {},

    groupLeaderInfo,

    flightItems:
      booking.operationControl
        ?.flightItems ??
      [],

    trainItems:
      booking.operationControl
        ?.trainItems ??
      [],

    headsetInfo:
      booking.operationControl
        ?.headsetInfo ??
      {},

    dailyItinerary:
      booking.operationControl
        ?.dailyItinerary ??
      [],

    paymentResponsibilities:
      booking.operationControl
        ?.paymentResponsibilities ??
      [],

    lunchInstructions:
      booking.operationControl
        ?.lunchInstructions ??
      "",

    drivingInstructions:
      booking.operationControl
        ?.drivingInstructions ??
      "",

    generalInstructions:
      booking.operationControl
        ?.generalInstructions ??
      "",

    folderNotes:
      booking.operationControl
        ?.folderNotes ??
      "",

    finalNotes:
      booking.operationControl
        ?.finalNotes ??
      "",
  };

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
          initialData
        }
      />
    </div>
  );
}