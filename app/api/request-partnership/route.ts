import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type RequestPartnershipBody = {
  fullName?: string;
  email?: string;
  agency?: string;
  country?: string;
  message?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestPartnershipBody;

    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const agency = body.agency?.trim() ?? "";
    const country = body.country?.trim() ?? "";
    const message = body.message?.trim() ?? "";

    if (!fullName) {
      return NextResponse.json(
        { success: false, message: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    const internalEmailResult = await resend.emails.send({
      from: "Epoch Journeys <info@epochjourneys.com>",
      to: "info@epochjourneys.com",
      replyTo: email,
      subject: `New Partnership Request - ${fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">New Request Partnership Submission</h2>

          <p><strong>Full Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Travel Agency / Company:</strong> ${agency || "-"}</p>
          <p><strong>Country:</strong> ${country || "-"}</p>
          <p><strong>Message:</strong><br/>${
            message ? message.replace(/\n/g, "<br/>") : "-"
          }</p>
        </div>
      `,
    });

    if (internalEmailResult.error) {
      console.error("RESEND_INTERNAL_ERROR", internalEmailResult.error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to send request email. Please try again.",
        },
        { status: 500 }
      );
    }

    const confirmationEmailResult = await resend.emails.send({
      from: "Epoch Journeys <info@epochjourneys.com>",
      to: email,
      subject: "Thank you for your interest in Epoch Journeys",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">Thank you for your interest in Epoch Journeys</h2>

          <p>Dear ${fullName},</p>

          <p>
            We have received your partnership request and appreciate your interest
            in working with Epoch Journeys.
          </p>

          <p>
            Our B2B platform is currently in its final preparation phase. We will
            review your details and contact you as soon as partner access becomes
            available.
          </p>

          <p>
            In the meantime, please feel free to reply to this email if you would
            like to share additional information about your business or areas of
            interest.
          </p>

          <p style="margin-top: 24px;">
            Kind regards,<br/>
            Epoch Journeys
          </p>
        </div>
      `,
    });

    if (confirmationEmailResult.error) {
      console.error(
        "RESEND_CONFIRMATION_ERROR",
        confirmationEmailResult.error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Your request was received, but the confirmation email could not be sent.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Request submitted successfully.",
    });
  } catch (error) {
    console.error("REQUEST_PARTNERSHIP_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit request. Please try again.",
      },
      { status: 500 }
    );
  }
}