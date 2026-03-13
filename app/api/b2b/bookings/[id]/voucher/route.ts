import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function drawLabelValue(
  page: import("pdf-lib").PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  font: import("pdf-lib").PDFFont,
  boldFont: import("pdf-lib").PDFFont
) {
  page.drawText(`${label}:`, {
    x,
    y,
    size: 10,
    font: boldFont,
    color: rgb(0.15, 0.15, 0.15),
  });

  page.drawText(value || "-", {
    x: x + 110,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: 320,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        approved: true,
        status: true,
        fullName: true,
        travelAgency: true,
        email: true,
        phone: true,
        agentLogoUrl: true,
      },
    });

    if (
      !user ||
      user.role !== "AGENT" ||
      !user.approved ||
      user.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const booking = await db.booking.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let agentLogoImage: import("pdf-lib").PDFImage | null = null;

    if (user.agentLogoUrl) {
      try {
        const response = await fetch(user.agentLogoUrl);
        const logoBytes = await response.arrayBuffer();

        if (user.agentLogoUrl.toLowerCase().endsWith(".png")) {
          agentLogoImage = await pdfDoc.embedPng(logoBytes);
        } else {
          agentLogoImage = await pdfDoc.embedJpg(logoBytes);
        }
      } catch (err) {
        console.error("AGENT_LOGO_LOAD_FAILED", err);
      }
    }

    const { width, height } = page.getSize();

    const agencyName =
      booking.agencyNameSnapshot || user.travelAgency || "Epoch Journeys";

    const agentName = booking.agentNameSnapshot || user.fullName || "Agent";

    const agentEmail = booking.agentEmailSnapshot || user.email || "-";

    const agentPhone = booking.agentPhoneSnapshot || user.phone || "-";

    page.drawRectangle({
      x: 0,
      y: height - 110,
      width,
      height: 110,
      color: rgb(0.0, 0.12, 0.25),
    });

    if (agentLogoImage) {
      const maxLogoWidth = 120;
      const maxLogoHeight = 50;

      const original = agentLogoImage.scale(1);
      const widthRatio = maxLogoWidth / original.width;
      const heightRatio = maxLogoHeight / original.height;
      const scale = Math.min(widthRatio, heightRatio, 1);

      page.drawImage(agentLogoImage, {
        x: width - original.width * scale - 40,
        y: height - 85,
        width: original.width * scale,
        height: original.height * scale,
      });
    }

    page.drawText(agencyName, {
      x: 40,
      y: height - 42,
      size: 22,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText("Booking Voucher", {
      x: 40,
      y: height - 66,
      size: 12,
      font,
      color: rgb(0.92, 0.92, 0.92),
    });

    page.drawText(`Agent: ${agentName}`, {
      x: 40,
      y: height - 84,
      size: 10,
      font,
      color: rgb(0.92, 0.92, 0.92),
    });

    page.drawText(`Email: ${agentEmail}`, {
      x: 220,
      y: height - 84,
      size: 10,
      font,
      color: rgb(0.92, 0.92, 0.92),
    });

    page.drawText(`Phone: ${agentPhone}`, {
      x: 40,
      y: height - 98,
      size: 10,
      font,
      color: rgb(0.92, 0.92, 0.92),
    });

    let y = height - 145;

    page.drawText("Voucher Summary", {
      x: 40,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.0, 0.12, 0.25),
    });

    y -= 28;

    drawLabelValue(
      page,
      "Reference",
      booking.bookingReference,
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Tour",
      booking.tourTitleSnapshot,
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Departure",
      formatDate(booking.departureDateSnapshot),
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Season",
      booking.seasonSnapshot || "-",
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Booked On",
      formatDate(booking.createdAt),
      40,
      y,
      font,
      boldFont
    );

    y -= 34;

    page.drawText("Booking Details", {
      x: 40,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.0, 0.12, 0.25),
    });

    y -= 28;

    drawLabelValue(
      page,
      "Guests",
      String(booking.numberOfGuests),
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Adults",
      String(booking.adults),
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Children",
      String(booking.children),
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Infants",
      String(booking.infants),
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Amount",
      formatCurrency(booking.grossAmount),
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Status",
      formatEnum(booking.status),
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Payment",
      formatEnum(booking.paymentStatus),
      40,
      y,
      font,
      boldFont
    );

    y -= 34;

    page.drawText("Customer Information", {
      x: 40,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.0, 0.12, 0.25),
    });

    y -= 28;

    drawLabelValue(
      page,
      "Customer Name",
      booking.customerName || "-",
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Customer Email",
      booking.customerEmail || "-",
      40,
      y,
      font,
      boldFont
    );
    y -= 18;

    drawLabelValue(
      page,
      "Customer Phone",
      booking.customerPhone || "-",
      40,
      y,
      font,
      boldFont
    );

    y -= 34;

    page.drawText("Agency Information", {
      x: 40,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.0, 0.12, 0.25),
    });

    y -= 28;

    drawLabelValue(page, "Agency", agencyName, 40, y, font, boldFont);
    y -= 18;

    drawLabelValue(page, "Agent", agentName, 40, y, font, boldFont);
    y -= 18;

    drawLabelValue(page, "Agent Email", agentEmail, 40, y, font, boldFont);
    y -= 18;

    drawLabelValue(page, "Agent Phone", agentPhone, 40, y, font, boldFont);

    y -= 34;

    page.drawText("Notes", {
      x: 40,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.0, 0.12, 0.25),
    });

    y -= 24;

    const notesText = booking.notes?.trim() || "No notes provided.";
    page.drawText(notesText.slice(0, 500), {
      x: 40,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: width - 80,
      lineHeight: 14,
    });

    page.drawLine({
      start: { x: 40, y: 55 },
      end: { x: width - 40, y: 55 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    page.drawText("Operated by Epoch Journeys", {
      x: 40,
      y: 36,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    page.drawText(`Generated: ${formatDate(new Date())}`, {
      x: width - 170,
      y: 36,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="voucher-${booking.bookingReference}.pdf"`,
      },
    });
  } catch (error) {
    console.error("B2B_BOOKING_VOUCHER_ERROR", error);

    return NextResponse.json(
      { error: "Failed to generate voucher." },
      { status: 500 }
    );
  }
}