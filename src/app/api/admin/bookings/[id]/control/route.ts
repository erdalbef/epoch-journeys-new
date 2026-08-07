import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingStatus,
  OperationStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const itemKeys = [
  "hotelItems",
  "transportItems",
  "guideItems",
  "restaurantItems",
  "massItems",
  "ticketItems",
  "paymentItems",
  "documentItems",
  "emergencyItems",
] as const;

type ItemKey = (typeof itemKeys)[number];

type OperationSource = "CRM" | "MANUAL";

type OperationItem = {
  id?: string;
  supplierId?: string;
  serviceId?: string;
  source?: OperationSource;
  supplierType?: string;
  name?: string;
  location?: string;
  date?: string;
  contactName?: string;
  contactInfo?: string;
  notes?: string;
  confirmed?: boolean;
};

function normalizeSource(value: unknown): OperationSource {
  return value === "CRM" ? "CRM" : "MANUAL";
}

function normalizeItems(
  value: unknown,
): OperationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null,
    )
    .map((item): OperationItem => {
      return {
        id:
          typeof item.id === "string"
            ? item.id
            : undefined,

        supplierId:
          typeof item.supplierId ===
            "string" &&
          item.supplierId.trim()
            ? item.supplierId.trim()
            : undefined,

        serviceId:
          typeof item.serviceId ===
            "string" &&
          item.serviceId.trim()
            ? item.serviceId.trim()
            : undefined,

        source: normalizeSource(
          item.source,
        ),

        supplierType:
          typeof item.supplierType ===
            "string" &&
          item.supplierType.trim()
            ? item.supplierType.trim()
            : undefined,

        name:
          typeof item.name === "string"
            ? item.name.trim()
            : "",

        location:
          typeof item.location ===
          "string"
            ? item.location.trim()
            : "",

        date:
          typeof item.date === "string"
            ? item.date.trim()
            : "",

        contactName:
          typeof item.contactName ===
          "string"
            ? item.contactName.trim()
            : "",

        contactInfo:
          typeof item.contactInfo ===
          "string"
            ? item.contactInfo.trim()
            : "",

        notes:
          typeof item.notes === "string"
            ? item.notes.trim()
            : "",

        confirmed: Boolean(
          item.confirmed,
        ),
      };
    })
    .filter(
      (item) =>
        Boolean(item.supplierId) ||
        Boolean(item.name) ||
        Boolean(item.location) ||
        Boolean(item.notes),
    );
}

function deriveOperationStatus(
  sections: Record<
    ItemKey,
    OperationItem[]
  >,
): OperationStatus {
  const items = itemKeys.flatMap(
    (key) => sections[key],
  );

  if (items.length === 0) {
    return OperationStatus.PENDING;
  }

  const confirmed =
    items.filter(
      (item) => item.confirmed,
    ).length;

  if (confirmed === 0) {
    return OperationStatus.PENDING;
  }

  if (confirmed === items.length) {
    return OperationStatus.READY;
  }

  return OperationStatus.IN_PROGRESS;
}

async function requireAdmin() {
  const session =
    await getServerSession(
      authOptions,
    );

  return (
    session?.user?.role === "ADMIN"
  );
}

export async function POST(
  req: Request,
  context: RouteContext,
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id: bookingId } =
      await context.params;

    const body =
      (await req.json()) as Record<
        string,
        unknown
      >;

    const booking =
      await db.booking.findUnique({
        where: {
          id: bookingId,
        },
        select: {
          id: true,
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking not found.",
        },
        {
          status: 404,
        },
      );
    }

    const sections =
      Object.fromEntries(
        itemKeys.map((key) => [
          key,
          normalizeItems(body[key]),
        ]),
      ) as Record<
        ItemKey,
        OperationItem[]
      >;

    const status =
      deriveOperationStatus(
        sections,
      );

    const finalNotes =
      typeof body.finalNotes ===
        "string" &&
      body.finalNotes.trim()
        ? body.finalNotes.trim()
        : null;

    const operationControl =
      await db.bookingOperationControl.upsert(
        {
          where: {
            bookingId,
          },

          create: {
            bookingId,

            hotelItems:
              sections.hotelItems,

            transportItems:
              sections.transportItems,

            guideItems:
              sections.guideItems,

            restaurantItems:
              sections.restaurantItems,

            massItems:
              sections.massItems,

            ticketItems:
              sections.ticketItems,

            paymentItems:
              sections.paymentItems,

            documentItems:
              sections.documentItems,

            emergencyItems:
              sections.emergencyItems,

            status,
            finalNotes,
          },

          update: {
            hotelItems:
              sections.hotelItems,

            transportItems:
              sections.transportItems,

            guideItems:
              sections.guideItems,

            restaurantItems:
              sections.restaurantItems,

            massItems:
              sections.massItems,

            ticketItems:
              sections.ticketItems,

            paymentItems:
              sections.paymentItems,

            documentItems:
              sections.documentItems,

            emergencyItems:
              sections.emergencyItems,

            status,
            finalNotes,
          },
        },
      );

    return NextResponse.json({
      success: true,
      operationControl,
    });
  } catch (error) {
    console.error(
      "SAVE_BOOKING_CONTROL_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save operation control.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _req: Request,
  context: RouteContext,
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } =
      await context.params;

    const booking =
      await db.booking.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          status: true,
          departureDateId: true,
          numberOfGuests: true,
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking not found.",
        },
        {
          status: 404,
        },
      );
    }

    await db.$transaction(
      async (tx) => {
        if (
          booking.status !==
            BookingStatus.CANCELLED &&
          booking.departureDateId &&
          booking.numberOfGuests > 0
        ) {
          const departure =
            await tx.departureDate.findUnique(
              {
                where: {
                  id:
                    booking.departureDateId,
                },
                select: {
                  bookedSeats: true,
                },
              },
            );

          if (departure) {
            await tx.departureDate.update(
              {
                where: {
                  id:
                    booking.departureDateId,
                },

                data: {
                  bookedSeats: Math.max(
                    0,
                    departure.bookedSeats -
                      booking.numberOfGuests,
                  ),
                },
              },
            );
          }
        }

        await tx.booking.delete({
          where: {
            id,
          },
        });
      },
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "DELETE_BOOKING_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete booking.",
      },
      {
        status: 500,
      },
    );
  }
}