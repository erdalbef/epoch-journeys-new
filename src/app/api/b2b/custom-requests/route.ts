import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  CustomRequestStatus,
  CustomRequestType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RequestInputSource = FormData | Record<string, unknown>;

function getValue(
  source: RequestInputSource,
  key: string
): FormDataEntryValue | string | number | boolean | null | undefined {
  if (source instanceof FormData) {
    return source.get(key);
  }

  return source[key] as FormDataEntryValue | string | number | boolean | null | undefined;
}

function toStringValue(
  source: RequestInputSource,
  key: string
): string | null {
  const value = getValue(source, key);

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed || null;
}

function toIntValue(
  source: RequestInputSource,
  key: string,
  fallback = 0
): number {
  const value = getValue(source, key);

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") return fallback;

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toFloatValue(
  source: RequestInputSource,
  key: string
): number | null {
  const value = getValue(source, key);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") return null;

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toBooleanValue(
  source: RequestInputSource,
  key: string,
  fallback = false
): boolean {
  const value = getValue(source, key);

  if (typeof value === "boolean") return value;

  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  return fallback;
}

function toDateValue(
  source: RequestInputSource,
  key: string
): Date | null {
  const value = getValue(source, key);

  if (typeof value !== "string") return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function makeRequestReference() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CR-${Date.now()}-${random}`;
}

function parseCustomRequestType(
  value: string | null
): CustomRequestType {
  if (!value) {
    return CustomRequestType.TAILOR_MADE;
  }

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (normalized === "BESPOKE_GROUP") {
    return CustomRequestType.BESPOKE_GROUP;
  }

  return CustomRequestType.TAILOR_MADE;
}

async function parseRequestBody(req: Request): Promise<RequestInputSource> {
  const contentType = req.headers.get("content-type")?.toLowerCase() || "";

  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>;
    return json;
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    return await req.formData();
  }

  // Fallback: try JSON first, then FormData
  try {
    const json = (await req.json()) as Record<string, unknown>;
    return json;
  } catch {
    return await req.formData();
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.AGENT) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await parseRequestBody(req);

    const requestType = parseCustomRequestType(
      toStringValue(body, "requestType")
    );

    const title =
      toStringValue(body, "workingTitle") ?? toStringValue(body, "title");

    const destination =
      toStringValue(body, "mainDestination") ??
      toStringValue(body, "destination");

    const destinationsRaw =
      toStringValue(body, "destinations") ??
      toStringValue(body, "multipleDestinations");

    const startDate =
      toDateValue(body, "startDate") ??
      toDateValue(body, "preferredStartDate");

    const endDate =
      toDateValue(body, "endDate") ??
      toDateValue(body, "preferredEndDate");

    const durationDays =
      toIntValue(body, "durationDays") || toIntValue(body, "duration");

    const estimatedPax = toIntValue(body, "estimatedPax");
    const adults = toIntValue(body, "adults");
    const children = toIntValue(body, "children");

    const budgetPerPerson = toFloatValue(body, "budgetPerPerson");
    const currency = toStringValue(body, "currency") ?? "EUR";
    const accommodationLevel = toStringValue(body, "accommodationLevel");
    const roomPreference = toStringValue(body, "roomPreference");

    const needsFlights = toBooleanValue(body, "needsFlights", false);
    const landOnly = toBooleanValue(body, "landOnly", true);

    const groupName = toStringValue(body, "groupName");
    const groupLeaderName = toStringValue(body, "groupLeaderName");
    const customerName = toStringValue(body, "customerName");
    const customerEmail = toStringValue(body, "customerEmail");
    const customerPhone = toStringValue(body, "customerPhone");
    const notes = toStringValue(body, "notes");

    if (!destination) {
      return new NextResponse("Destination is required.", { status: 400 });
    }

    const destinations = destinationsRaw
      ? destinationsRaw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const customRequest = await db.customTourRequest.create({
      data: {
        userId: session.user.id,
        requestReference: makeRequestReference(),
        status: CustomRequestStatus.NEW,
        requestType,
        title,
        destination,
        destinations,
        startDate,
        endDate,
        durationDays: durationDays || null,
        estimatedPax: estimatedPax || null,
        adults: adults || null,
        children: children || null,
        budgetPerPerson,
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
        notes,
      },
      select: {
        id: true,
        requestReference: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      request: customRequest,
    });
  } catch (error) {
    console.error("CUSTOM_REQUEST_SUBMIT_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}