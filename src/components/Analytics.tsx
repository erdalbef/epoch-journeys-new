"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

export default function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        // 1. Do not track this browser
        if (
          typeof window !== "undefined" &&
          localStorage.getItem("epoch_disable_analytics") === "true"
        ) {
          return null;
        }

        // 2. Do not track Epoch internal pages
        if (typeof window !== "undefined") {
          const path = window.location.pathname;

          const internalPaths = ["/admin", "/b2b", "/staff"];

          const isInternal = internalPaths.some(
            (internalPath) =>
              path === internalPath ||
              path.startsWith(`${internalPath}/`)
          );

          if (isInternal) {
            return null;
          }
        }

        // Track genuine public website traffic
        return event;
      }}
    />
  );
}