import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { generateVoucherPDF } from "@/lib/voucher/generateVoucher";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          agentLogoUrl: true,
        },
      },
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const pdfBuffer = await generateVoucherPDF(booking);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=voucher-${booking.bookingReference}.pdf`,
    },
  });
}