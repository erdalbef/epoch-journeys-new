"use client";

import { useCallback, useEffect, useState } from "react";

type Communication = {
  id: string;
  type: string;
  subject: string | null;
  message: string;
  createdAt: string;
};

type Props = {
  agentId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AgentCommunicationsCard({ agentId }: Props) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [communications, setCommunications] = useState<Communication[]>([]);

  const loadCommunications = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/agents/${agentId}/communications`);
      const data = await res.json();

      if (data.ok) {
        setCommunications(data.communications || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  async function handleAddNote() {
    if (!message.trim()) return;

    try {
      const res = await fetch(`/api/admin/agents/${agentId}/communications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "NOTE",
          message,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setMessage("");
        await loadCommunications();
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    void loadCommunications();
  }, [loadCommunications]);

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Communications & Notes</h2>
          <p className="text-sm text-slate-500">
            Internal communication history for this agent
          </p>
        </div>
      </div>

      <div className="mb-6">
        <textarea
          className="min-h-30 w-full rounded-xl border p-3"
          placeholder="Add internal note..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleAddNote}
            className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-medium text-white"
          >
            Save Note
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : communications.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-sm text-slate-500">
            No communications yet.
          </div>
        ) : (
          communications.map((item) => (
            <div key={item.id} className="rounded-xl border bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-[#001F3F] px-2 py-1 text-xs text-white">
                  {item.type}
                </span>

                <span className="text-xs text-slate-500">
                  {formatDate(item.createdAt)}
                </span>
              </div>

              {item.subject && (
                <div className="mb-2 font-medium">{item.subject}</div>
              )}

              <div className="whitespace-pre-wrap text-sm text-slate-700">
                {item.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}