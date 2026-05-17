// src/components/shared/form/QuotePdfDownloadButton.tsx
"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import QuotePdf from "@/components/pdf/QuotePdf";

type QuotePdfDetails = {
  quoteTitle: string;
  agentName: string;
  clientName: string;
  destination: string;
  travelDates: string;
  validUntil: string;
  notes: string;
  groupSize: number;
};

type QuotePdfSummary = React.ComponentProps<typeof QuotePdf>["summary"];

type Props = {
  summary: QuotePdfSummary;
  details: QuotePdfDetails;
};

export default function QuotePdfDownloadButton({
  summary,
  details,
}: Props) {
  return (
    <PDFDownloadLink
      document={<QuotePdf summary={summary} details={details} />}
      fileName="quote.pdf"
      className="block rounded-lg bg-black py-2 text-center text-sm text-white hover:bg-gray-800"
    >
      {({ loading }) => (loading ? "Preparing PDF..." : "Download Quote PDF")}
    </PDFDownloadLink>
  );
}