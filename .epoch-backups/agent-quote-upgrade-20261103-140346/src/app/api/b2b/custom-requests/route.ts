import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingType,
  CustomRequestStatus,
  CustomRequestType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";

type RequestInputSource =
  | FormData
  | Record<string, unknown>;

// ============================================================
// VALUE HELPERS
// ============================================================

function getValue(
  source: RequestInputSource,
  key: string,
):
  | FormDataEntryValue
  | string
  | number
  | boolean
  | null
  | undefined {
  if (source instanceof FormData) {
    return source.get(key);
  }

  return source[key] as
    | FormDataEntryValue
    | string
    | number
    | boolean
    | null
    | undefined;
}

function toStringValue(
  source: RequestInputSource,
  key: string,
): string | null {
  const value =
    getValue(source, key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function toIntValue(
  source: RequestInputSource,
  key: string,
  fallback = 0,
): number {
  const value =
    getValue(source, key);

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const parsed =
    parseInt(value, 10);

  return Number.isNaN(parsed)
    ? fallback
    : parsed;
}

function toOptionalIntValue(
  source: RequestInputSource,
  key: string,
): number | null {
  const value =
    getValue(source, key);

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed =
    parseInt(value, 10);

  return Number.isNaN(parsed)
    ? null
    : parsed;
}

function toFloatValue(
  source: RequestInputSource,
  key: string,
): number | null {
  const value =
    getValue(source, key);

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed =
    parseFloat(value);

  return Number.isNaN(parsed)
    ? null
    : parsed;
}

function toBooleanValue(
  source: RequestInputSource,
  key: string,
  fallback = false,
): boolean {
  const value =
    getValue(source, key);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    ["true", "1", "yes", "on"].includes(
      normalized,
    )
  ) {
    return true;
  }

  if (
    ["false", "0", "no", "off"].includes(
      normalized,
    )
  ) {
    return false;
  }

  return fallback;
}

function toDateValue(
  source: RequestInputSource,
  key: string,
): Date | null {
  const value =
    getValue(source, key);

  if (typeof value !== "string") {
    return null;
  }

  if (!value.trim()) {
    return null;
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? null
    : parsed;
}

// ============================================================
// REQUEST HELPERS
// ============================================================

function makeRequestReference() {
  const random =
    Math.floor(
      1000 +
        Math.random() *
          9000,
    );

  return `CR-${Date.now()}-${random}`;
}

function parseCustomRequestType(
  value: string | null,
): CustomRequestType {
  if (!value) {
    return CustomRequestType.TAILOR_MADE;
  }

  const normalized =
    value
      .trim()
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        "_",
      );

  if (
    normalized ===
    "BESPOKE_GROUP"
  ) {
    return CustomRequestType.BESPOKE_GROUP;
  }

  if (
    normalized ===
    "QUOTE_ONLY"
  ) {
    return CustomRequestType.QUOTE_ONLY;
  }

  return CustomRequestType.TAILOR_MADE;
}

async function parseRequestBody(
  req: Request,
): Promise<RequestInputSource> {
  const contentType =
    req.headers
      .get("content-type")
      ?.toLowerCase() || "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    return (await req.json()) as Record<
      string,
      unknown
    >;
  }

  if (
    contentType.includes(
      "multipart/form-data",
    ) ||
    contentType.includes(
      "application/x-www-form-urlencoded",
    )
  ) {
    return await req.formData();
  }

  try {
    return (await req.json()) as Record<
      string,
      unknown
    >;
  } catch {
    return await req.formData();
  }
}

// ============================================================
// POST
// ============================================================

export async function POST(
  req: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
      session.user.role !==
        Role.AGENT
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await parseRequestBody(
        req,
      );

    // ========================================================
    // SELECTED JOURNEY
    // ========================================================

    const tourId =
      toStringValue(
        body,
        "tourId",
      );

    const selectedTour =
      tourId
        ? await db.tour.findFirst({
            where: {
              id: tourId,
              isPublished: true,
            },

            select: {
              id: true,
              title: true,
              destinations: true,
              duration: true,
              arrivalCity: true,
              departureCity: true,
              startingPrice: true,
              currency: true,
            },
          })
        : null;

    if (
      tourId &&
      !selectedTour
    ) {
      return NextResponse.json(
        {
          error:
            "Selected journey was not found or is not available.",
        },
        {
          status: 404,
        },
      );
    }

    // ========================================================
    // REQUEST TYPE
    // ========================================================

    const requestType =
      selectedTour
        ? CustomRequestType.BESPOKE_GROUP
        : parseCustomRequestType(
            toStringValue(
              body,
              "requestType",
            ),
          );

    // ========================================================
    // BASIC REQUEST DATA
    // ========================================================

    const title =
      selectedTour?.title ??
      toStringValue(
        body,
        "workingTitle",
      ) ??
      toStringValue(
        body,
        "title",
      );

    const destinationFromForm =
      toStringValue(
        body,
        "mainDestination",
      ) ??
      toStringValue(
        body,
        "destination",
      );

    const destinationsRaw =
      toStringValue(
        body,
        "destinations",
      ) ??
      toStringValue(
        body,
        "multipleDestinations",
      );

    const destinations =
      selectedTour
        ? selectedTour.destinations
        : destinationsRaw
          ? destinationsRaw
              .split(",")
              .map((item) =>
                item.trim(),
              )
              .filter(Boolean)
          : [];

    const destination =
      selectedTour
        ? selectedTour.destinations[0] ??
          destinationFromForm
        : destinationFromForm;

    if (!destination) {
      return NextResponse.json(
        {
          error:
            "Destination is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // TRAVEL DATES
    // ========================================================

    const startDate =
      toDateValue(
        body,
        "startDate",
      ) ??
      toDateValue(
        body,
        "preferredStartDate",
      );

    const alternativeStartDate =
      toDateValue(
        body,
        "alternativeStartDate",
      );

    const endDate =
      toDateValue(
        body,
        "endDate",
      ) ??
      toDateValue(
        body,
        "preferredEndDate",
      );

    const datesFlexible =
      toBooleanValue(
        body,
        "datesFlexible",
        false,
      );

    const durationDays =
      toOptionalIntValue(
        body,
        "durationDays",
      ) ??
      toOptionalIntValue(
        body,
        "duration",
      ) ??
      selectedTour?.duration ??
      null;

    // ========================================================
    // GROUP DETAILS
    // ========================================================

    const estimatedPax =
      toOptionalIntValue(
        body,
        "estimatedPax",
      );

    const adults =
      toOptionalIntValue(
        body,
        "adults",
      );

    const children =
      toOptionalIntValue(
        body,
        "children",
      );

    const infants =
      toOptionalIntValue(
        body,
        "infants",
      );

    const complimentaryPlaces =
      toOptionalIntValue(
        body,
        "complimentaryPlaces",
      );

    const groupName =
      toStringValue(
        body,
        "groupName",
      );

    const groupLeaderName =
      toStringValue(
        body,
        "groupLeaderName",
      );

    // ========================================================
    // ROOM REQUIREMENTS
    // ========================================================

    const singleRooms =
      toOptionalIntValue(
        body,
        "singleRooms",
      );

    const doubleRooms =
      toOptionalIntValue(
        body,
        "doubleRooms",
      );

    const twinRooms =
      toOptionalIntValue(
        body,
        "twinRooms",
      );

    const tripleRooms =
      toOptionalIntValue(
        body,
        "tripleRooms",
      );

    const roomPreference =
      toStringValue(
        body,
        "roomPreference",
      );

    // ========================================================
    // PILGRIMAGE REQUIREMENTS
    // ========================================================

    const priestTraveling =
      toBooleanValue(
        body,
        "priestTraveling",
        false,
      );

    const dailyMassRequested =
      toBooleanValue(
        body,
        "dailyMassRequested",
        true,
      );

    const specialChurchRequests =
      toStringValue(
        body,
        "specialChurchRequests",
      );

    const guideLanguage =
      toStringValue(
        body,
        "guideLanguage",
      );

    const extensionRequest =
      toStringValue(
        body,
        "extensionRequest",
      );

    // ========================================================
    // COMMERCIAL / SERVICE DATA
    // ========================================================

    const budgetPerPerson =
      toFloatValue(
        body,
        "budgetPerPerson",
      );

    const totalBudget =
      toFloatValue(
        body,
        "totalBudget",
      );

    const currency =
      toStringValue(
        body,
        "currency",
      ) ??
      selectedTour?.currency ??
      "EUR";

    const accommodationLevel =
      toStringValue(
        body,
        "accommodationLevel",
      );

    const needsFlights =
      toBooleanValue(
        body,
        "needsFlights",
        false,
      );

    const landOnly =
      toBooleanValue(
        body,
        "landOnly",
        !needsFlights,
      );

    // ========================================================
    // CONTACT
    // ========================================================

    const customerName =
      toStringValue(
        body,
        "customerName",
      );

    const customerEmail =
      toStringValue(
        body,
        "customerEmail",
      );

    const customerPhone =
      toStringValue(
        body,
        "customerPhone",
      );

    const companyName =
      toStringValue(
        body,
        "companyName",
      );

    // ========================================================
    // NOTES
    // ========================================================

    const notes =
      toStringValue(
        body,
        "notes",
      );

    const specialRequests =
      toStringValue(
        body,
        "specialRequests",
      );

    // ========================================================
    // CREATE REQUEST
    // ========================================================

    const customRequest =
      await db.customTourRequest.create({
        data: {
          userId:
            session.user.id,

          tourId:
            selectedTour?.id ??
            null,

          requestReference:
            makeRequestReference(),

          status:
            CustomRequestStatus.NEW,

          requestType,

          /*
           * Journey-based requests are always
           * group pilgrimage requests.
           *
           * General custom requests may still
           * use the wider model elsewhere.
           */
          bookingType:
            selectedTour
              ? BookingType.GROUP
              : BookingType.GROUP,

          title,
          destination,
          destinations,

          startDate,
          alternativeStartDate,
          endDate,
          datesFlexible,
          durationDays,

          estimatedPax,
          adults,
          children,
          infants,

          singleRooms,
          doubleRooms,
          twinRooms,
          tripleRooms,

          complimentaryPlaces,

          priestTraveling,
          dailyMassRequested,
          specialChurchRequests,
          guideLanguage,
          extensionRequest,

          budgetPerPerson,
          totalBudget,
          currency,

          accommodationLevel,
          roomPreference,

          needsFlights,
          landOnly,

          groupName,
          groupLeaderName,

          customerName,
          customerEmail,
          customerPhone,

          companyName,

          notes,
          specialRequests,
        },

        select: {
          id: true,
          requestReference: true,
          status: true,
          createdAt: true,

          tour: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

    // Email delivery is best-effort; the saved request must remain intact.
    // Each recipient is attempted independently and Resend responses are logged.
    try {
      const agent = await db.user.findUnique({
        where: { id: session.user.id },
        select: { fullName: true, email: true, travelAgency: true },
      });
      const agentEmail = agent?.email || session.user.email;
      const adminEmail = (
        process.env.QUOTE_REQUEST_ADMIN_EMAIL ||
        process.env.ADMIN_NOTIFICATION_EMAIL ||
        "quotes@epochjourneys.com"
      ).trim();
      const esc = (v: unknown) => String(v ?? "-").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
      const summary = `<p><strong>Reference:</strong> ${esc(customRequest.requestReference)}</p><p><strong>Tour:</strong> ${esc(title)}</p><p><strong>Agency:</strong> ${esc(agent?.travelAgency)}</p><p><strong>Agent:</strong> ${esc(agent?.fullName)}</p><p><strong>Agent email:</strong> ${esc(agentEmail)}</p><p><strong>Paying passengers:</strong> ${esc(estimatedPax)}</p><p><strong>Preferred dates:</strong> ${esc(startDate?.toISOString().slice(0,10))} – ${esc(endDate?.toISOString().slice(0,10))}</p><p><strong>Notes:</strong> ${esc(notes).replace(/\n/g,"<br/>")}</p>`;
      const notify = async (kind: "AGENT" | "ADMIN", recipient: string, subject: string, intro: string) => {
        try {
          const result = await sendEmail({
            to: recipient,
            subject,
            html: `<p>${intro}</p>${summary}`,
          });
          if (!result || result.error) {
            console.error("QUOTE_REQUEST_EMAIL_FAILED", {
              kind,
              reference: customRequest.requestReference,
              recipient,
              error: result?.error ?? "No response from email provider",
            });
          } else {
            console.info("QUOTE_REQUEST_EMAIL_ACCEPTED", {
              kind,
              reference: customRequest.requestReference,
              recipient,
              messageId: result.data?.id ?? null,
            });
          }
        } catch (error) {
          console.error("QUOTE_REQUEST_EMAIL_EXCEPTION", {
            kind,
            reference: customRequest.requestReference,
            recipient,
            error,
          });
        }
      };
      if (agentEmail) {
        await notify("AGENT", agentEmail,
          `Epoch Journeys — Request Received ${customRequest.requestReference}`,
          "Thank you for your request. Our team will review it and contact you.");
      }
      if (adminEmail) {
        await notify("ADMIN", adminEmail,
          `New Quote Request — ${customRequest.requestReference}`,
          "A new agent quote request has been submitted.");
      } else {
        console.error("QUOTE_REQUEST_ADMIN_EMAIL_NOT_CONFIGURED");
      }
    } catch (emailError) {
      console.error("QUOTE_REQUEST_NOTIFICATION_ERROR", emailError);
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        id:
          customRequest.id,

        requestReference:
          customRequest.requestReference,

        status:
          customRequest.status,

        createdAt:
          customRequest.createdAt,

        request:
          customRequest,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "CUSTOM_REQUEST_SUBMIT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Internal Server Error",
      },
      {
        status: 500,
      },
    );
  }
}