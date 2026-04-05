import { NextRequest, NextResponse } from "next/server";
import { createQuote } from "@/lib/quote-service";
import { QuotePurpose } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const quote = await createQuote({
      requestId: body.requestId ?? null,
      tourId: body.tourId ?? null,
      departureDateId: body.departureDateId ?? null,
      purpose: body.purpose as QuotePurpose,
      title: body.title,
      clientMessage: body.clientMessage,
      internalNotes: body.internalNotes,
      termsAndNotes: body.termsAndNotes,
      validityNotes: body.validityNotes,
      recipientName: body.recipientName,
      recipientEmail: body.recipientEmail,
      recipientType: body.recipientType ?? null,
      currency: body.currency || "EUR",
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      items: body.items || [],
      actorId: body.actorId ?? null,
    });

    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create quote.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}