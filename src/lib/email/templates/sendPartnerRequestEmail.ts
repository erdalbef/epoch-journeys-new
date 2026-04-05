import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type PartnerEmailInput = {
  fullName: string;
  email: string;
  partnerType: string;
  travelAgency?: string | null;
  phone: string;
  website?: string | null;
  membership: string;
};

export async function sendPartnerRequestEmail(data: PartnerEmailInput) {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error("ADMIN_EMAIL is missing");
    return;
  }

  if (!resend) {
    console.error("RESEND_API_KEY is missing");
    return;
  }

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6">

    <h2 style="color:#001F3F;">New Partnership Request</h2>

    <p>A new partner application has been submitted.</p>

    <table style="border-collapse:collapse;margin-top:10px;">
      <tr>
        <td style="padding:6px 10px;font-weight:bold;">Name:</td>
        <td>${data.fullName}</td>
      </tr>

      <tr>
        <td style="padding:6px 10px;font-weight:bold;">Email:</td>
        <td>${data.email}</td>
      </tr>

      <tr>
        <td style="padding:6px 10px;font-weight:bold;">Partner Type:</td>
        <td>${data.partnerType}</td>
      </tr>

      <tr>
        <td style="padding:6px 10px;font-weight:bold;">Travel Agency:</td>
        <td>${data.travelAgency ?? "-"}</td>
      </tr>

      <tr>
        <td style="padding:6px 10px;font-weight:bold;">Phone:</td>
        <td>${data.phone}</td>
      </tr>

      <tr>
        <td style="padding:6px 10px;font-weight:bold;">Website:</td>
        <td>${data.website ?? "-"}</td>
      </tr>

      <tr>
        <td style="padding:6px 10px;font-weight:bold;">Membership:</td>
        <td>${data.membership}</td>
      </tr>
    </table>

    <p style="margin-top:20px;">
      Please review this request in the admin panel.
    </p>

  </div>
  `;

  const text = `
New B2B Partnership Request

Name: ${data.fullName}
Email: ${data.email}
Partner Type: ${data.partnerType}
Travel Agency: ${data.travelAgency ?? "-"}
Phone: ${data.phone}
Website: ${data.website ?? "-"}
Membership: ${data.membership}

Please review this request in the admin panel.
`;

  try {
    await resend.emails.send({
      from: "Epoch Journeys <noreply@epochjourneys.com>",
      to: adminEmail,
      subject: "New B2B Partnership Request",
      html,
      text,
    });
  } catch (error) {
    console.error("RESEND_PARTNER_EMAIL_ERROR", error);
  }
}