import React from "react";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { buildSalesPdfData } from "@/lib/sales-document-pdf-data";
import { SalesDocumentPdf } from "@/lib/pdf/SalesDocumentPdf";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    const data = await buildSalesPdfData(id);

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Issue the document before generating its PDF.",
        },
        {
          status: 400,
        },
      );
    }

    if (!data.fontRegular || !data.fontBold) {
      return NextResponse.json(
        {
          error:
            "Bulgarian PDF font files are missing. Add NotoSans-Regular.ttf and NotoSans-Bold.ttf under public/fonts.",
        },
        {
          status: 500,
        },
      );
    }

    const buffer = await renderToBuffer(
      <SalesDocumentPdf data={data} />,
    );

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${data.documentNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("SALES_DOCUMENT_PDF_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate sales document PDF.",
      },
      {
        status: 500,
      },
    );
  }
}