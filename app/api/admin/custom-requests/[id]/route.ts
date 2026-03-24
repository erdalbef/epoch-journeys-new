import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { CustomRequestStatus, Role } from "@prisma/client";
import { Resend } from "resend";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatStatus(status: CustomRequestStatus) {
  return status.replaceAll("_", " ");
}

function buildCustomRequestUpdateEmail(params: {
  fullName?: string | null;
  requestReference: string;
  status: CustomRequestStatus;
  adminReply?: string | null;
  requestId: string;
}) {
  const greetingName = params.fullName?.trim() || "Partner";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const viewLink = `${appUrl}/b2b/custom-requests/${params.requestId}`;

  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:32px; color:#0f172a;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
        
        <div style="background:#001F3F; padding:24px 32px;">
          <h1 style="margin:0; font-size:22px; color:#ffffff;">
            Custom Request Update
          </h1>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 16px 0;">
            Dear ${greetingName},
          </p>

          <p style="margin:0 0 16px 0;">
            Your custom tour request 
            <strong>${params.requestReference}</strong> 
            has been updated.
          </p>

          <div style="margin:20px 0; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
            <p style="margin:0; font-size:14px; color:#475569;">
              Status
            </p>
            <p style="margin:4px 0 0 0; font-size:16px; font-weight:700; color:#001F3F;">
              ${formatStatus(params.status)}
            </p>
          </div>

          ${
            params.adminReply?.trim()
              ? `
                <div style="margin:20px 0; padding:16px; background:#fff7ed; border:1px solid #fed7aa; border-radius:12px;">
                  <p style="margin:0 0 6px 0; font-size:14px; color:#9a3412;">
                    Admin Reply
                  </p>
                  <p style="margin:0; font-size:15px; line-height:1.6; white-space:pre-line; color:#431407;">
                    ${params.adminReply}
                  </p>
                </div>
              `
              : ""
          }

          <div style="margin-top:24px;">
            <a href="${viewLink}" 
               style="display:inline-block; background:#8B0000; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">
              View Request
            </a>
          </div>

          <p style="margin-top:20px; font-size:13px; color:#64748b;">
            If the button doesn't work, copy this link:<br/>
            ${viewLink}
          </p>
        </div>

        <div style="padding:20px 32px; background:#f8fafc; border-top:1px solid #e2e8f0;">
          <p style="margin:0; font-size:12px; color:#64748b;">
            Christian Pilgrimage Tours
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id } = params;

    const existingRequest = await db.customTourRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingRequest) {
      return new NextResponse("Request not found", { status: 404 });
    }

    const nextStatus = body.status as CustomRequestStatus;
    const nextReply =
      typeof body.adminReply === "string" ? body.adminReply.trim() : "";

    const updated = await db.customTourRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        adminReply: nextReply || null,
      },
      include: {
        user: true,
      },
    });

    const statusChanged = existingRequest.status !== updated.status;
    const replyChanged =
      (existingRequest.adminReply || "").trim() !==
      (updated.adminReply || "").trim();

    if ((statusChanged || replyChanged) && updated.user?.email) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: updated.user.email,
        subject: `Update on your custom request ${updated.requestReference}`,
        html: buildCustomRequestUpdateEmail({
          fullName: updated.user.fullName,
          requestReference: updated.requestReference,
          status: updated.status,
          adminReply: updated.adminReply,
          requestId: updated.id,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    console.error("CUSTOM_REQUEST_UPDATE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}