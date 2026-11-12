"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SupportConversation } from "@/components/support/SupportConversation";
import { SupportArchiveButton } from "@/components/support/SupportArchiveButton";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  message: string;
  attachmentName: string | null;
  agentArchivedAt: string | null;
  label?: string;
  lastActivity?: string;
};

export function AgentTicketHistory() {
  const [archived, setArchived] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Open the requested ticket when arriving from a notification.
  useEffect(() => {
    const ticketId = new URLSearchParams(
      window.location.search
    ).get("ticketId");

    if (!ticketId) return;

    setArchived(false);
    setExpanded(ticketId);
  }, []); // epoch:notification-deeplink


  const markTicketNotificationsRead = useCallback(
    async (ticketId: string) => {
      try {
        const response = await fetch("/api/b2b/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId }),
        });

        if (!response.ok) {
          return;
        }

        window.dispatchEvent(
          new Event("epoch:agent-notifications-updated")
        );
      } catch (error) {
        console.error(
          "Unable to mark Support notifications as read",
          error
        );
      }
    },
    []
  );

  const onConversationLoaded = useCallback(
    (ticketId: string) => {
      void markTicketNotificationsRead(ticketId);
    },
    [markTicketNotificationsRead]
  );

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("epoch:support-created", refresh);
    return () => {
      window.removeEventListener("epoch:support-created", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/b2b/support?archived=${archived ? "1" : "0"}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load requests.");
        }

        if (active) {
          setTickets(data.tickets || []);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error ? error.message : "Request failed."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [archived, refreshKey]);

  // epoch:archived-notification-lookup
  // Try Archived once if a linked ticket is absent from Active.
  const checkedArchivedRef = useRef(false);

  useEffect(() => {
    if (loading || archived || checkedArchivedRef.current) return;

    const ticketId = new URLSearchParams(
      window.location.search
    ).get("ticketId");

    if (!ticketId) return;

    if (tickets.some((ticket) => ticket.id === ticketId)) {
      checkedArchivedRef.current = true;
      return;
    }

    checkedArchivedRef.current = true;
    setArchived(true);
  }, [loading, archived, tickets]);

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        My Support Requests
      </h2>

      <p className="mt-1 text-sm text-slate-600">
        Manage your support conversations. Archived requests can be restored.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setArchived(false);
            setExpanded(null);
          }}
          className={`rounded-lg border px-4 py-2 text-sm ${
            !archived ? "bg-slate-900 text-white" : "bg-white"
          }`}
        >
          Active
        </button>

        <button
          type="button"
          onClick={() => {
            setArchived(true);
            setExpanded(null);
          }}
          className={`rounded-lg border px-4 py-2 text-sm ${
            archived ? "bg-slate-900 text-white" : "bg-white"
          }`}
        >
          Archived
        </button>

        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-4 text-sm text-slate-500">Loading requests...</p>
      )}

      {!loading && !error && (
        <div className="mt-4 space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <b>{ticket.subject}</b>
                <span className="text-xs font-medium">
                  {ticket.status.replaceAll("_", " ")} - {ticket.label}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Last activity:{" "}
                {new Date(
                  ticket.lastActivity || ticket.createdAt
                ).toLocaleString("en-GB")}
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm">
                {ticket.message}
              </p>

              {ticket.attachmentName && (
                <a
                  className="mt-2 block text-sm text-red-800 underline"
                  href={`/api/support/attachments/${ticket.id}`}
                >
                  Download attachment
                </a>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 text-sm"
                  onClick={() =>
                    setExpanded(
                      expanded === ticket.id ? null : ticket.id
                    )
                  }
                >
                  {expanded === ticket.id
                    ? "Hide Conversation"
                    : "View Conversation / Reply"}
                </button>

                <SupportArchiveButton
                  ticketId={ticket.id}
                  archived={Boolean(ticket.agentArchivedAt)}
                  onSuccess={refresh}
                />
              </div>

              {expanded === ticket.id && (
                <div className="mt-4">
                  <SupportConversation
                    ticketId={ticket.id}
                    onConversationLoaded={() =>
                      onConversationLoaded(ticket.id)
                    }
                  />
                </div>
              )}
            </div>
          ))}

          {tickets.length === 0 && (
            <p className="text-sm text-slate-500">
              {archived
                ? "No archived support requests."
                : "No active support requests."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
