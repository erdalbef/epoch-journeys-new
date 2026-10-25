import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createElement, type ReactElement } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import QuotePdfDocument from "@/lib/pdf/QuotePdfDocument";

export const dynamic = "force-dynamic";

async function toBuffer(output: Buffer | NodeJS.ReadableStream): Promise<Buffer> {
  if (Buffer.isBuffer(output)) return output;
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    output.on("data", (part: Buffer | string) => {
      chunks.push(Buffer.isBuffer(part) ? part : Buffer.from(part));
    });
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
  });
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 401 });
    }
    const current = await db.user.findUnique({
      where: { id: session.user.id }, select: { role: true, status: true },
    });
    if (!current || current.role !== "ADMIN" || current.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });
    }
    const { id } = await context.params;
    const quote = await db.quote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        tour: { select: { title: true, category: true } },
        departureDate: { select: { date: true, season: true, status: true } },
      },
    });
    if (!quote) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
    const element = createElement(QuotePdfDocument, { quote }) as unknown as ReactElement<DocumentProps>;
    const output = await pdf(element).toBuffer();
    const result = await toBuffer(output);
    return new NextResponse(new Uint8Array(result), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="quote-${quote.quoteNumber}-internal.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PRIVATE_INTERNAL_PDF_ERROR", error);
    return NextResponse.json({ ok: false, error: "Unable to open internal PDF." }, { status: 500 });
  }
}
