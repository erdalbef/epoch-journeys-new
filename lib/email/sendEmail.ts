import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailAttachment = {
  filename: string;
  content: Buffer;
};

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailArgs) {
  const from =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "onboarding@resend.dev";

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
    })),
  });

  if (result.error) {
    console.error("RESEND_SEND_EMAIL_ERROR", result.error);
    throw new Error(
      typeof result.error === "object" && result.error !== null && "message" in result.error
        ? String(result.error.message)
        : "Failed to send email."
    );
  }

  console.log("RESEND_EMAIL_SENT", {
    id: result.data?.id,
    to,
    subject,
  });

  return result;
}