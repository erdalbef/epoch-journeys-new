import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pdf } from "@react-pdf/renderer";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import AgentClientQuotePdfDocument from "@/lib/pdf/AgentClientQuotePdfDocument";
import { buildAgentClientQuotePdfData } from "@/lib/pdf/buildAgentClientQuotePdfData";

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

    let pdfData: ReturnType<typeof buildAgentClientQuotePdfData>;

    try {
      pdfData = buildAgentClientQuotePdfData(quote);
    } catch (error) {
      console.error("AGENT_PDF_DATA_ERROR", error);

      return NextResponse.json(
        { ok: false, error: "Failed to prepare agent PDF data." },
        { status: 500 }
      );
    }

    let pdfBuffer: Buffer;

    try {
      const doc = <AgentClientQuotePdfDocument {...pdfData} />;
      const output = await pdf(doc).toBuffer();

      pdfBuffer =
        output instanceof Buffer
          ? output
          : await streamToBuffer(output as NodeJS.ReadableStream);
    } catch (error) {
      console.error("AGENT_PDF_RENDER_ERROR", error);

      return NextResponse.json(
        { ok: false, error: "Failed to render agent PDF." },
        { status: 500 }
      );
    }

    try {
      const dir = path.join(process.cwd(), "public", "agent-client-quotes");
      await mkdir(dir, { recursive: true });

      const safeReference =
        quote.quoteReference?.trim() || `agent-quote-${quote.quoteNumber}`;

      const sanitizedFileName = safeReference
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
        .replace(/\s+/g, "-");

      const fileName = `${sanitizedFileName}-agent.pdf`;
      const filePath = path.join(dir, fileName);

      await writeFile(filePath, pdfBuffer);

      const publicUrl = `/agent-client-quotes/${fileName}`;

      const updatedQuote = await db.quote.update({
        where: { id: quote.id },
        data: {
          agentClientPdfUrl: publicUrl,
          agentClientPdfGeneratedAt: new Date(),
        },
        select: {
          id: true,
          agentClientPdfUrl: true,
          agentClientPdfGeneratedAt: true,
        },
      });

      return NextResponse.json({
        ok: true,
        quote: updatedQuote,
      });
    } catch (error) {
      console.error("AGENT_PDF_SAVE_ERROR", error);

      return NextResponse.json(
        { ok: false, error: "Failed to save generated agent PDF." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("AGENT_PDF_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate agent PDF." },
      { status: 500 }
    );
  }
}