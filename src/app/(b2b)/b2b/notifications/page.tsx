"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AgentAlert = {
  id: string;
  title: string;
  description: string;
  href: string;
  ticketId: string;
  readAt: string | null;
  createdAt: string;
};

export default function AgentNotificationsPage() {
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/b2b/notifications", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Notifications unavailable.");
      }

      setAlerts(data.alerts || []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    try {
      const response = await fetch("/api/b2b/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Could not mark notification as read.");
      }

      await load();
      window.dispatchEvent(new Event("epoch:agent-notifications-updated"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update notification."
      );
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-[#001F3F]">
          Notifications
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Updates from Epoch Journeys, including replies to your
          Support requests.
        </p>
      </div>

      {loading && <p>Loading notifications...</p>}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-5 ${
                alert.readAt ? "bg-white" : "border-amber-300 bg-amber-50"
              }`}
            >
              <div className="flex flex-wrap justify-between gap-3">
                <strong>{alert.title}</strong>

                <span className="text-xs text-slate-500">
                  {new Date(alert.createdAt).toLocaleString("en-GB")}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-700">
                {alert.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-5">
                <Link
                  href={alert.href}
                  className="text-sm font-medium text-red-800 underline"
                >
                  Open Support Request
                </Link>

                {!alert.readAt && (
                  <button
                    type="button"
                    onClick={() => void markRead(alert.id)}
                    className="text-sm text-slate-700 underline"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          ))}

          {alerts.length === 0 && !error && (
            <div className="rounded-xl border bg-white p-6 text-slate-500">
              No notifications yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
