"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

export default function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        // Do not track this browser if Epoch owner tracking is disabled
        if (localStorage.getItem("epoch_disable_analytics") === "true") {
          return null;
        }

        return event;
      }}
    />
  );
}