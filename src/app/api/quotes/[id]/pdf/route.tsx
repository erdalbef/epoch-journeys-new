import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pdf } from "@react-pdf/renderer";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import QuotePdfDocument from "@/lib/pdf/QuotePdfDocument";

async function streamToBuffer(
  stream: NodeJS.ReadableStream
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const quote = await db.quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        tour: {
          select: {
            title: true,
            category: true,
          },
        },
        departureDate: {
          select: {
            date: true,
            season: true,
            status: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    const doc = <QuotePdfDocument quote={quote} />;
    const output = await pdf(doc).toBuffer();

    const pdfBuffer =
      output instanceof Buffer
        ? output
        : await streamToBuffer(output as NodeJS.ReadableStream);
    if (!pdfBuffer.length) throw new Error("Empty PDF generated");

    // Internal costing is confidential: never write it under /public.
    // The PDF is served on demand from an authenticated Admin-only endpoint.
    const privateUrl = `/api/quotes/${quote.id}/internal-pdf`;
    const updatedQuote = await db.quote.update({
      where: { id: quote.id },
      data: {
        pdfUrl: privateUrl,
        pdfGeneratedAt: new Date(),
      },
      select: {
        id: true,
        pdfUrl: true,
        pdfGeneratedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      quote: updatedQuote,
    });
  } catch (error) {
    console.error("INTERNAL_PDF_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate internal PDF." },
      { status: 500 }
    );
  }
}