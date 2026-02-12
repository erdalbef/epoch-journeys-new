import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;

export async function sendAgentApprovedEmail(email: string) {
  if (!RESEND_API_KEY || !RESEND_FROM) return; // don’t crash the API if env missing

  const resend = new Resend(RESEND_API_KEY);

  await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    subject: "Your agent account has been approved",
    html: `
      <div style="font-family:Arial,sans-serif; line-height:1.6">
        <h2>Epoch Journeys</h2>
        <p>Your agent account has been approved.</p>
        <p>You may now sign in and access the B2B dashboard.</p>
        <p style="margin-top:24px">— Epoch Journeys Team</p>
      </div>
    `,
  });
}

export async function sendAgentUnapprovedEmail(email: string) {
  if (!RESEND_API_KEY || !RESEND_FROM) return;

  const resend = new Resend(RESEND_API_KEY);

  await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    subject: "Your agent access has been disabled",
    html: `
      <div style="font-family:Arial,sans-serif; line-height:1.6">
        <h2>Epoch Journeys</h2>
        <p>Your agent access has been disabled.</p>
        <p>If you believe this is a mistake, please contact us.</p>
        <p style="margin-top:24px">— Epoch Journeys Team</p>
      </div>
    `,
  });
}
