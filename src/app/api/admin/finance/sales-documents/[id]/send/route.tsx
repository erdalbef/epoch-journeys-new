import React from "react";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { Role, SalesDocumentStatus } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildSalesPdfData } from "@/lib/sales-document-pdf-data";
import { SalesDocumentPdf } from "@/lib/pdf/SalesDocumentPdf";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const data = await buildSalesPdfData(id);

  if (!data) {
    return NextResponse.json({ error: "Issue the document first." }, { status: 400 });
  }

  const recipients = [data.recipientEmail, data.recipientEmailSecondary]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .filter((value, index, all) => all.indexOf(value) === index);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Recipient email is missing." }, { status: 400 });
  }

  if (!data.fontRegular || !data.fontBold) {
    return NextResponse.json(
      { error: "Bulgarian PDF font files are missing under public/fonts." },
      { status: 500 },
    );
  }

  const pdf = await renderToBuffer(<SalesDocumentPdf data={data} />);

  const sent = await sendEmail({
    to: recipients,
    subject: `${data.documentNumber} - Epoch Journeys`,
    html: `<p>Dear ${data.recipientName},</p><p>Please find attached ${data.documentNumber} from Epoch Journeys OOD.</p><p>Kind regards,<br/>Epoch Journeys</p>`,
    attachments: [
      {
        filename: `${data.documentNumber}.pdf`,
        content: Buffer.from(pdf),
      },
    ],
  });

  if (!sent) {
    return NextResponse.json({ error: "Email could not be sent." }, { status: 500 });
  }

  await db.salesDocument.update({
    where: { id },
    data: {
      status: SalesDocumentStatus.SENT,
      sentAt: new Date(),
      sentById: session.user.id,
    },
  });

  return NextResponse.json({ ok: true, recipients });
}
