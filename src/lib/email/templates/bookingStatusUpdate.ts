type BookingStatusUpdateEmailProps = {
  agentName?: string | null;
  bookingReference: string;
  bookingStatus: string;
  paymentStatus?: string | null;
  tourTitle: string;
  departureDate: Date | string;
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function bookingStatusUpdateTemplate({
  agentName,
  bookingReference,
  bookingStatus,
  paymentStatus,
  tourTitle,
  departureDate,
}: BookingStatusUpdateEmailProps) {
  const safeName = agentName?.trim() || "Partner";

  const subject =
    bookingStatus === "CONFIRMED"
      ? `Booking Confirmed - ${bookingReference}`
      : bookingStatus === "CANCELLED"
      ? `Booking Cancelled - ${bookingReference}`
      : `Booking Update - ${bookingReference}`;

  const intro =
    bookingStatus === "CONFIRMED"
      ? "We are pleased to inform you that your booking is now confirmed."
      : bookingStatus === "CANCELLED"
      ? "Please note that your booking has been cancelled."
      : "Please note that the status of your booking has been updated.";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6;">
      <div style="max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #001F3F; color: white; padding: 20px 24px;">
          <h1 style="margin: 0; font-size: 22px;">Epoch Journeys</h1>
          <p style="margin: 6px 0 0; font-size: 14px;">Booking Status Update</p>
        </div>

        <div style="padding: 24px;">
          <p style="margin-top: 0;">Dear ${safeName},</p>

          <p>${intro}</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; width: 180px;"><strong>Reference</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${bookingReference}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Tour</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${tourTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Departure</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${formatDate(departureDate)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Booking Status</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${bookingStatus}</td>
            </tr>
            ${
              paymentStatus
                ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Payment Status</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${paymentStatus}</td>
            </tr>
            `
                : ""
            }
          </table>

          <p>If you have any questions, please contact us.</p>

          <p style="margin-bottom: 0;">
            Kind regards,<br />
            <strong>Epoch Journeys</strong>
          </p>
        </div>
      </div>
    </div>
  `;

  return {
    subject,
    html,
  };
}