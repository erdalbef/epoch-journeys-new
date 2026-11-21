import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pdf } from "@react-pdf/renderer";
import { readFile } from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getApprovedFlexiblePricing } from "@/lib/quotes/flexibleGroupPricing";
import AgentClientQuotePdfDocument from "@/lib/pdf/AgentClientQuotePdfDocument";
import { buildAgentClientQuotePdfData } from "@/lib/pdf/buildAgentClientQuotePdfData";
import { savePrivateAgentQuotePdf, readPrivateAgentQuotePdf } from "@/lib/storage/agentQuotePdfStorage";
import { isServiceTermsConfirmed, reviewServiceTerms } from "@/lib/quotes/serviceTermsReview";

export const runtime = "nodejs";

function resolvePdfWebsiteOrigin(request: NextRequest): string | null {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (url.protocol === "https:" || (isLocalhost && url.protocol === "http:")) {
        return url.origin;
      }
    } catch {
      // Ignore invalid optional configuration.
    }
  }

  // Localhost links support testing with npm run dev AND npm run start.
  // Do not use arbitrary request Host values for production PDF links.
  const url = request.nextUrl;
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      (url.protocol === "http:" || url.protocol === "https:")) {
    return url.origin;
  }
  return null;
}

/**
 * @react-pdf/renderer renders on the server. A browser-relative /images URL
 * does not reliably resolve there, so embed the existing project logo as a
 * data URI. The configured logo must be a static file in public/images.
 * Support src/public/images as a legacy fallback; do not create a new logo.
 */
async function embedProjectLogo(configuredUrl: string): Promise<string | null> {
  const match = /^\/images\/([a-zA-Z0-9._-]+\.(?:png|jpe?g))$/i.exec(configuredUrl);
  if (!match) {
    console.warn("AGENT_PDF_LOGO_PATH_INVALID", configuredUrl);
    return null;
  }

  const fileName = match[1];
  const mime = /\.png$/i.test(fileName) ? "image/png" : "image/jpeg";
  // The Admin navigation uses /epoch-compass-logo.png at public/ root;
  // older PDF configuration uses /images/epoch-compass-logo.png.
  const folders = [
    path.join(process.cwd(), "public", "images"),
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "src", "public", "images"),
    path.join(process.cwd(), "src", "public"),
  ];

  for (const folder of folders) {
    try {
      const bytes = await readFile(path.join(folder, fileName));
      if (bytes.length > 0) {
        return `data:${mime};base64,${bytes.toString("base64")}`;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.warn("AGENT_PDF_LOGO_READ_ERROR", fileName, error);
      }
    }
  }

  console.warn("AGENT_PDF_LOGO_NOT_FOUND", fileName);
  return null;
}

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

    if (!isServiceTermsConfirmed(quote.quoteBuilderSummary, quote.clientIncludes, quote.clientExcludes)) {
      const review = reviewServiceTerms(quote.clientIncludes, quote.clientExcludes);
      return NextResponse.json({
        ok: false,
        error: review.errors.length
          ? `Please review Rates Include / Exclude in the quotation form: ${review.errors.join(" | ")}`
          : "Confirm Rates Include / Exclude in the quotation form and save before generating the Agent PDF.",
      }, { status: 409 });
    }

    // An approval belongs to one exact quotation cost basis. Do not silently
    // generate or send a proposal without alternatives if that basis changed.
    const rawSummary = quote.quoteBuilderSummary;
    const flexible = rawSummary && typeof rawSummary === "object" && !Array.isArray(rawSummary)
      ? (rawSummary as Record<string, unknown>).flexibleGroupPricing : null;
    if (flexible && typeof flexible === "object" && !Array.isArray(flexible) &&
        (flexible as Record<string, unknown>).enabled === true && !getApprovedFlexiblePricing(quote)) {
      return NextResponse.json({
        ok: false,
        error: "Flexible Group Pricing approval is no longer valid for the saved quotation. Review and reapprove the alternatives before generating or sending the Agent PDF.",
      }, { status: 409 });
    }

    let pdfData: ReturnType<typeof buildAgentClientQuotePdfData>;

    try {
      pdfData = buildAgentClientQuotePdfData(quote, { publicBaseUrl: resolvePdfWebsiteOrigin(_req) });
      // Keep the existing PDF text fallback if the logo file is missing.
      pdfData.logoUrl = (await embedProjectLogo(pdfData.logoUrl)) || "";
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
      // Persist a private PDF snapshot. The stored Blob URL must never be
      // opened directly; use the authenticated GET handler below instead.
      const storedPath = await savePrivateAgentQuotePdf(quote.id, pdfBuffer);
      const updatedQuote = await db.quote.update({
        where: { id: quote.id },
        data: {
          agentClientPdfUrl: storedPath,
          agentClientPdfGeneratedAt: new Date(),
        },
        select: {
          id: true,
          agentClientPdfGeneratedAt: true,
        },
      });

      return NextResponse.json({
        ok: true,
        quote: {
          ...updatedQuote,
          agentClientPdfUrl: `/api/quotes/${quote.id}/agent-client-pdf?v=${updatedQuote.agentClientPdfGeneratedAt?.getTime() || Date.now()}`,
        },
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
/** Authenticated retrieval of the SAVED proposal (not a regenerated draft). */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const quote = await db.quote.findUnique({
      where: { id },
      select: { agentClientPdfUrl: true },
    });
    if (!quote?.agentClientPdfUrl) {
      return NextResponse.json({ ok: false, error: "No saved Agent PDF." }, { status: 404 });
    }
    const bytes = await readPrivateAgentQuotePdf(quote.agentClientPdfUrl, id);
    if (!bytes) {
      return NextResponse.json({ ok: false, error: "Stored Agent PDF could not be loaded. Regenerate from the quote." }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="epoch-agent-proposal.pdf"',
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("AGENT_PDF_READ_ERROR", error);
    return NextResponse.json({ ok: false, error: "Unable to read saved Agent PDF." }, { status: 500 });
  }
}
