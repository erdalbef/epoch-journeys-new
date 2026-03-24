import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailInput) {
  await resend.emails.send({
    from: "Epoch Journeys <no-reply@epochjourneys.com>",
    to,
    subject,
    html,
  });
}