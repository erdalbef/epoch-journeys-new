import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type ContactBody = {
  fullName?: string;
  email?: string;
  company?: string;
  subject?: string;
  message?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactBody;

    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const company = body.company?.trim() ?? "";
    const subject = body.subject?.trim() ?? "Contact Request";
    const message = body.message?.trim() ?? "";

    if (!fullName) {
      return NextResponse.json(
        { success: false, message: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Valid email is required." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Message is required." },
        { status: 400 }
      );
    }

    // 1️⃣ Send to you
    const internal = await resend.emails.send({
      from: "Epoch Journeys <info@epochjourneys.com>",
      to: "info@epochjourneys.com",
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial; line-height:1.6;">
          <h2>New Contact Message</h2>

          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company || "-"}</p>
          <p><strong>Subject:</strong> ${subject}</p>

          <p><strong>Message:</strong><br/>
          ${message.replace(/\n/g, "<br/>")}</p>
        </div>
      `,
    });

    if (internal.error) {
      console.error("CONTACT_INTERNAL_ERROR", internal.error);

      return NextResponse.json(
        { success: false, message: "Failed to send message." },
        { status: 500 }
      );
    }

    // 2️⃣ Auto-reply to sender
    const confirmation = await resend.emails.send({
      from: "Epoch Journeys <info@epochjourneys.com>",
      to: email,
      subject: "We received your message",
      html: `
        <div style="font-family: Arial; line-height:1.6;">
          <h2>Thank you for contacting Epoch Journeys</h2>

          <p>Dear ${fullName},</p>

          <p>
            We have received your message and will get back to you shortly.
          </p>

          <p>
            If your request is urgent, please feel free to reply directly to this email.
          </p>

          <p style="margin-top:20px;">
            Kind regards,<br/>
            Epoch Journeys
          </p>
        </div>
      `,
    });

    if (confirmation.error) {
      console.error("CONTACT_CONFIRMATION_ERROR", confirmation.error);
      // do NOT fail — message still sent to you
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully.",
    });
  } catch (error) {
    console.error("CONTACT_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}