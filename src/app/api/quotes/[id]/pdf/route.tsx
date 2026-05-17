import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pdf } from "@react-pdf/renderer";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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

    const quotesDir = path.join(process.cwd(), "public", "quotes");
    await mkdir(quotesDir, { recursive: true });

    const safeReference =
      quote.quoteReference?.trim() || `quote-${quote.quoteNumber}`;

    const sanitizedFileName = safeReference
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, "-");

    const fileName = `${sanitizedFileName}-internal.pdf`;
    const filePath = path.join(quotesDir, fileName);

    await writeFile(filePath, pdfBuffer);

    const publicUrl = `/quotes/${fileName}`;

    const updatedQuote = await db.quote.update({
      where: { id: quote.id },
      data: {
        pdfUrl: publicUrl,
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