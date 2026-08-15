import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  "Epoch Journeys <no-reply@epochjourneys.com>";

type EmailAttachment = {
  filename: string;
  content: Buffer;
};

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailInput) {
  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return null;
  }

  try {
    const resend = new Resend(
      RESEND_API_KEY
    );

    const response =
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        attachments,
      });

    return response;
  } catch (err) {
    console.error(
      "Email send error:",
      err
    );

    return null;
  }
}