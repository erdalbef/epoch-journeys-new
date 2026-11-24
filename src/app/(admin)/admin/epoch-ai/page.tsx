import type { Metadata } from "next";

import EpochAiSuite from "@/components/admin/epoch-ai/EpochAiSuite";

export const metadata: Metadata = {
  title: "Epoch AI | Epoch Journeys Admin",
  robots: { index: false, follow: false },
};

export default function EpochAiPage() {
  return <EpochAiSuite />;
}
