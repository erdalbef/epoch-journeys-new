export function quoteEmailTemplate({
  recipientName,
  quoteReference,
  pdfUrl,
}: {
  recipientName?: string | null
  quoteReference: string
  pdfUrl: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 16px;">Christian Pilgrimage Tours</h2>

      <p>Hello ${recipientName || "Partner"},</p>

      <p>
        Your quote is ready for review.
      </p>

      <p>
        <strong>Quote Reference:</strong> ${quoteReference}
      </p>

      <p>
        You can preview or download the PDF here:
      </p>

      <p>
        <a href="${pdfUrl}" style="color: #8B0000; font-weight: 600;">
          View Quote PDF
        </a>
      </p>

      <p>
        Please let us know if you need any revisions.
      </p>

      <p style="margin-top: 24px;">
        Best regards,<br />
        Christian Pilgrimage Tours
      </p>
    </div>
  `
}