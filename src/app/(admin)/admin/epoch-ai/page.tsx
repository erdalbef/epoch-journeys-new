import type { Metadata } from "next";

import EpochAiWorkspace from "@/components/admin/epoch-ai/EpochAiWorkspace";

export const metadata: Metadata = {
  title: "Epoch AI | Epoch Journeys Admin",
  robots: { index: false, follow: false },
};

export default function EpochAiPage() {
  return <EpochAiWorkspace />;
}
