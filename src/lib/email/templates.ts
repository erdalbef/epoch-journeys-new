type BaseLayoutInput = {
  title: string;
  subtitle?: string;
  body: string;
};

function emailLayout({ title, subtitle, body }: BaseLayoutInput) {
  return `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#001F3F;padding:20px 24px;border-radius:16px 16px 0 0;">
          <div style="font-size:24px;font-weight:700;color:#ffffff;">
            Epoch Journeys
          </div>
          ${
            subtitle
              ? `<div style="margin-top:6px;font-size:13px;color:#dbeafe;">${subtitle}</div>`
              : ""
          }
        </div>

        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 16px 16px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#001F3F;">
            ${title}
          </h1>

          <div style="font-size:14px;line-height:1.7;color:#334155;">
            ${body}
          </div>

          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            Epoch Journeys<br />
            This is an automated email from the payment system.
          </div>
        </div>
      </div>
    </div>
  `;
}

type AdminPaymentSubmissionTemplateInput = {
  bookingReference: string;
  amount: number;
  currency: string;
  method: string;
  agentName?: string | null;
  agentEmail: string;
  proofUrl?: string | null;
};

export function adminPaymentSubmissionTemplate({
  bookingReference,
  amount,
  currency,
  method,
  agentName,
  agentEmail,
  proofUrl,
}: AdminPaymentSubmissionTemplateInput) {
  return emailLayout({
    title: "New Payment Submission",
    subtitle: "Admin notification",
    body: `
      <p>A new payment submission has been received.</p>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="padding:8px 0;font-weight:700;">Booking</td>
          <td style="padding:8px 0;">${bookingReference}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">Amount</td>
          <td style="padding:8px 0;">${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(amount)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">Method</td>
          <td style="padding:8px 0;">${method}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">Agent</td>
          <td style="padding:8px 0;">${agentName || "-"}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">Agent Email</td>
          <td style="padding:8px 0;">${agentEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">Proof</td>
          <td style="padding:8px 0;">
            ${
              proofUrl
                ? `<a href="${proofUrl}" style="color:#8B0000;text-decoration:none;font-weight:700;">Open uploaded proof</a>`
                : "No proof attached"
            }
          </td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        Please review this submission in the admin payments panel.
      </p>
    `,
  });
}

type AgentPaymentApprovedTemplateInput = {
  bookingReference: string;
  amount: number;
  currency: string;
};

export function agentPaymentApprovedTemplate({
  bookingReference,
  amount,
  currency,
}: AgentPaymentApprovedTemplateInput) {
  return emailLayout({
    title: "Payment Approved",
    subtitle: "Agent notification",
    body: `
      <p>Your payment submission has been approved.</p>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="padding:8px 0;font-weight:700;">Booking</td>
          <td style="padding:8px 0;">${bookingReference}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">Approved Amount</td>
          <td style="padding:8px 0;">${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(amount)}</td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        Thank you. Your booking payment record has been updated.
      </p>
    `,
  });
}

type AgentPaymentRejectedTemplateInput = {
  bookingReference: string;
  amount: number;
  currency: string;
};

export function agentPaymentRejectedTemplate({
  bookingReference,
  amount,
  currency,
}: AgentPaymentRejectedTemplateInput) {
  return emailLayout({
    title: "Payment Submission Rejected",
    subtitle: "Agent notification",
    body: `
      <p>Your payment submission could not be approved.</p>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="padding:8px 0;font-weight:700;">Booking</td>
          <td style="padding:8px 0;">${bookingReference}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:700;">Submitted Amount</td>
          <td style="padding:8px 0;">${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(amount)}</td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        Please review the payment proof and submit again if needed.
      </p>
    `,
  });
}