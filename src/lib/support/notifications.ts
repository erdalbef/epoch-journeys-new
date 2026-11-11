import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";

const ADMIN_EMAIL =
  process.env.EPOCH_ADMIN_NOTIFY_EMAIL ||
  "erdal@epochjourneys.com";

export function supportAdminEmail() {
  return ADMIN_EMAIL;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] || c));
}

export async function createAdminAlert(
  eventKey: string,
  title: string,
  description: string,
  href: string
) {
  try {
    await db.$executeRaw`
      INSERT INTO "EpochAdminAlert"
      ("id","eventKey","title","description","href","createdAt")
      VALUES
      (${randomUUID()},${eventKey},${title},${description},${href},NOW())
      ON CONFLICT ("eventKey") DO NOTHING
    `;
    return true;
  } catch (e) {
    console.error("Admin alert could not be persisted", e);
    return false;
  }
}

export function supportEmailHtml(
  body: string,
  url: string
) {
  const safeBody = escapeHtml(body)
    .replace(/\r\n|\r|\n/g, "<br>");

  const ticketUrl = new URL(url);

  if (
    !["https:", "http:"].includes(ticketUrl.protocol) ||
    ticketUrl.username ||
    ticketUrl.password
  ) {
    throw new Error("Invalid support email URL");
  }

  const safeUrl = escapeHtml(ticketUrl.toString());

  const logoUrl = escapeHtml(
    new URL(
      "/epoch-compass-logo.png",
      ticketUrl.origin
    ).toString()
  );

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin:0;padding:24px 12px;background:#f3f5f8;
      font-family:Arial,Helvetica,sans-serif;color:#263447;">
      <table role="presentation" cellpadding="0" cellspacing="0"
        style="width:100%;max-width:600px;margin:auto;
        background:#ffffff;border-collapse:collapse;">
        <tr>
          <td align="center" style="background:#001F3F;
            padding:28px 20px;color:#ffffff;">
            <img src="${logoUrl}" alt="Epoch Journeys"
              width="100" style="display:block;width:100px;
              height:auto;background:#ffffff;border:0;">
            <div style="font-size:23px;font-weight:bold;
              margin-top:15px;letter-spacing:1px;">
              EPOCH JOURNEYS
            </div>
            <div style="font-size:12px;margin-top:8px;
              color:#dce6f2;">
              Thoughtfully Planned. Faithfully Delivered.
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px;">
            <h2 style="font-size:20px;color:#001F3F;
              margin:0 0 20px;">
              Support Notification
            </h2>
            <div style="font-size:15px;line-height:1.7;
              overflow-wrap:anywhere;">
              ${safeBody}
            </div>
            <table role="presentation" cellpadding="0"
              cellspacing="0" style="margin-top:28px;">
              <tr>
                <td bgcolor="#001F3F"
                  style="padding:13px 22px;">
                  <a href="${safeUrl}"
                    style="color:#ffffff;
                    text-decoration:none;
                    font-weight:bold;font-size:14px;">
                    Open Support Ticket
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px;
            background:#f4f6f9;color:#667085;font-size:12px;">
            Epoch Journeys<br>
            Automated Support Notification
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function notifyEmail(
  to: string,
  subject: string,
  body: string,
  url: string
) {
  try {
    const result = await sendEmail({
      to,
      subject,
      html: supportEmailHtml(body, url),
    });

    return !!result &&
      !("error" in result && result.error) &&
      !!("data" in result && result.data?.id);
  } catch (e) {
    console.error("Support email delivery error", e);
    return false;
  }
}

export function absoluteAdminUrl(path: string) {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";

  try {
    const u = new URL(raw);

    if (!["https:", "http:"].includes(u.protocol)) {
      return "";
    }

    if (u.username || u.password) {
      return "";
    }

    return new URL(path, u).toString();
  } catch {
    return "";
  }
}
