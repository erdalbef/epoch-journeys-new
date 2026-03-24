import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { generateVoucherPDF } from "@/lib/voucher/generateVoucher";

type RouteContext = {
  params: { id: string };
};

type ReaderResult = {
  done: boolean;
  value?: Uint8Array;
};

type ReaderLike = {
  read(): Promise<ReaderResult>;
};

type WebStreamLike = {
  getReader(): ReaderLike;
};

function hasGetReader(value: unknown): value is WebStreamLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "getReader" in value &&
    typeof (value as { getReader?: unknown }).getReader === "function"
  );
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!hasGetReader(stream)) {
    throw new Error("Voucher PDF did not return a readable web stream.");
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(merged);
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = context.params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        user: true,
        tour: true,
        departureDate: true,
        passengers: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = booking.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const pdfStream = await generateVoucherPDF(booking);
    const pdfBuffer = await streamToBuffer(pdfStream);
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;

    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="voucher-${booking.bookingReference}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("VOUCHER_DOWNLOAD_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to generate voucher." },
      { status: 500 }
    );
  }
}