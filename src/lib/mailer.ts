type SendQuoteEmailInput = {
  to: string;
  subject: string;
  html: string;
  pdfUrl?: string | null;
};

export async function sendQuoteEmail(input: SendQuoteEmailInput) {
  // Replace later with Resend / SES / SendGrid
  console.log("Sending quote email", input);

  return {
    success: true,
  };
}