import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString().trim() ?? "";
    const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
    const countryCode = formData.get("countryCode")?.toString().trim() ?? "";
    const phone = formData.get("phone")?.toString().trim() ?? "";
    const agency = formData.get("agency")?.toString().trim() ?? "";
    const country = formData.get("country")?.toString().trim() ?? "";
    const website = formData.get("website")?.toString().trim() ?? "";
    const partnerType = formData.get("partnerType")?.toString().trim() ?? "";
    const membership = formData.get("membership")?.toString().trim() ?? "";
    const message = formData.get("message")?.toString().trim() ?? "";

    if (!name) {
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

    if (!agency) {
      return NextResponse.json(
        { success: false, message: "Travel Agency Name is required." },
        { status: 400 }
      );
    }

    if (!country) {
      return NextResponse.json(
        { success: false, message: "Country is required." },
        { status: 400 }
      );
    }

    if (!partnerType) {
      return NextResponse.json(
        { success: false, message: "Partner type is required." },
        { status: 400 }
      );
    }

    const fullPhone =
      countryCode || phone
        ? `${countryCode}${phone ? ` ${phone}` : ""}`.trim()
        : "-";

    const internalEmailResult = await resend.emails.send({
      from: "Epoch Journeys <info@epochjourneys.com>",
      to: "info@epochjourneys.com",
      replyTo: email,
      subject: `New Partnership Request - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">New Partnership Request Submission</h2>

          <p><strong>Full Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${fullPhone}</p>
          <p><strong>Travel Agency / Company:</strong> ${agency}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Website:</strong> ${website || "-"}</p>
          <p><strong>Partner Type:</strong> ${partnerType}</p>
          <p><strong>Membership:</strong> ${membership || "-"}</p>
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

          <p>Dear ${name},</p>

          <p>
            We have received your partnership request and appreciate your interest
            in working with Epoch Journeys.
          </p>

          <p>
            Our team will review your details and get back to you as soon as possible.
          </p>

          <p>
            If you would like to share additional information about your business,
            please feel free to reply to this email.
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