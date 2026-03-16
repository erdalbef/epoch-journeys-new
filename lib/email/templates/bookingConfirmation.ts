export function bookingConfirmationEmail({
  bookingReference,
  tourTitle,
  departureDate,
  guests,
  agency,
  customerName,
}: {
  bookingReference: string
  tourTitle: string
  departureDate: Date | string
  guests: number
  agency?: string | null
  customerName?: string | null
}) {
  const date = new Date(departureDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return {
    subject: `Booking Confirmation – ${bookingReference}`,

    html: `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111;">
      
      <h2 style="color:#001F3F;">Epoch Journeys OOD</h2>
      <p style="font-size:16px;"><strong>Booking Confirmation</strong></p>

      <p>Your booking has been successfully received.</p>

      <table style="border-collapse:collapse; width:100%; max-width:600px;">
        <tr>
          <td style="border:1px solid #ddd;padding:8px;"><strong>Booking Reference</strong></td>
          <td style="border:1px solid #ddd;padding:8px;">${bookingReference}</td>
        </tr>

        <tr>
          <td style="border:1px solid #ddd;padding:8px;"><strong>Tour</strong></td>
          <td style="border:1px solid #ddd;padding:8px;">${tourTitle}</td>
        </tr>

        <tr>
          <td style="border:1px solid #ddd;padding:8px;"><strong>Departure</strong></td>
          <td style="border:1px solid #ddd;padding:8px;">${date}</td>
        </tr>

        <tr>
          <td style="border:1px solid #ddd;padding:8px;"><strong>Guests</strong></td>
          <td style="border:1px solid #ddd;padding:8px;">${guests}</td>
        </tr>

        <tr>
          <td style="border:1px solid #ddd;padding:8px;"><strong>Agency</strong></td>
          <td style="border:1px solid #ddd;padding:8px;">${agency ?? "-"}</td>
        </tr>

        <tr>
          <td style="border:1px solid #ddd;padding:8px;"><strong>Customer</strong></td>
          <td style="border:1px solid #ddd;padding:8px;">${customerName ?? "-"}</td>
        </tr>

      </table>

      <p style="margin-top:20px;">
        Please find your booking voucher attached for your records.
      </p>

      <p style="font-size:12px;color:#666;">
      Epoch Journeys OOD – B2B Travel Platform
      </p>

    </div>
    `,
  }
}