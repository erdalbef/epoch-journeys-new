import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pdf } from "@react-pdf/renderer";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import ClientQuotePdfDocument from "@/lib/pdf/ClientQuotePdfDocument";
import { buildClientQuotePdfData } from "@/lib/pdf/buildClientQuotePdfData";

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
        tour: true,
        departureDate: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    let pdfData: ReturnType<typeof buildClientQuotePdfData>;

    try {
      pdfData = buildClientQuotePdfData(quote);
    } catch (error) {
      console.error("CLIENT_PDF_DATA_ERROR", error);

      return NextResponse.json(
        { ok: false, error: "Failed to prepare client PDF data." },
        { status: 500 }
      );
    }

    let pdfBuffer: Buffer;

    try {
      const doc = <ClientQuotePdfDocument {...pdfData} />;
      const output = await pdf(doc).toBuffer();

      pdfBuffer =
        output instanceof Buffer
          ? output
          : await streamToBuffer(output as NodeJS.ReadableStream);
    } catch (error) {
      console.error("CLIENT_PDF_RENDER_ERROR", error);

      return NextResponse.json(
        { ok: false, error: "Failed to render client PDF." },
        { status: 500 }
      );
    }

    try {
      const quotesDir = path.join(process.cwd(), "public", "client-quotes");
      await mkdir(quotesDir, { recursive: true });

      const safeReference =
        quote.quoteReference?.trim() || `client-quote-${quote.quoteNumber}`;

      const sanitizedFileName = safeReference
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
        .replace(/\s+/g, "-");

      const fileName = `${sanitizedFileName}-client.pdf`;
      const filePath = path.join(quotesDir, fileName);

      await writeFile(filePath, pdfBuffer);

      const publicUrl = `/client-quotes/${fileName}`;

      const updatedQuote = await db.quote.update({
        where: { id: quote.id },
        data: {
          clientPdfUrl: publicUrl,
          clientPdfGeneratedAt: new Date(),
        },
        select: {
          id: true,
          clientPdfUrl: true,
          clientPdfGeneratedAt: true,
        },
      });

      return NextResponse.json({
        ok: true,
        quote: updatedQuote,
      });
    } catch (error) {
      console.error("CLIENT_PDF_SAVE_ERROR", error);

      return NextResponse.json(
        { ok: false, error: "Failed to save generated client PDF." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("CLIENT_PDF_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate client PDF." },
      { status: 500 }
    );
  }
}