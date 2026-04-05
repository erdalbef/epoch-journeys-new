import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type PartnerConfirmationEmailInput = {
  fullName: string;
  email: string;
};

export async function sendPartnerRequestConfirmationEmail(
  data: PartnerConfirmationEmailInput
) {
  if (!resend) {
    console.error("RESEND_API_KEY is missing");
    return;
  }

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
    <h2 style="color:#001F3F;margin-bottom:12px;">Epoch Journeys</h2>

    <p>Dear ${data.fullName},</p>

    <p>
      Thank you for your interest in partnering with <strong>Epoch Journeys</strong>.
    </p>

    <p>
      We have received your B2B partnership request successfully, and it is now under review by our team.
    </p>

    <p>
      Once your request is approved, you will receive access to our B2B partner platform.
    </p>

    <p>
      If we need any additional information, we will contact you by email.
    </p>

    <p style="margin-top:24px;">
      Best regards,<br />
      Epoch Journeys
    </p>
  </div>
  `;

  const text = `
Epoch Journeys

Dear ${data.fullName},

Thank you for your interest in partnering with Epoch Journeys.

We have received your B2B partnership request successfully, and it is now under review by our team.

Once your request is approved, you will receive access to our B2B partner platform.

If we need any additional information, we will contact you by email.

Best regards,
Epoch Journeys
`;

  try {
    await resend.emails.send({
      from: "Epoch Journeys <noreply@epochjourneys.com>",
      to: data.email,
      subject: "Your partnership request has been received",
      html,
      text,
    });
  } catch (error) {
    console.error("RESEND_PARTNER_CONFIRMATION_EMAIL_ERROR", error);
  }
}