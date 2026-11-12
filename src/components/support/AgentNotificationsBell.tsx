"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function AgentNotificationsBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/b2b/notifications", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (active) {
          setUnread(Number(data.unread || 0));
        }
      } catch {
        // Keep the last known count.
      }
    }

    void load();

    const interval = setInterval(load, 60000);

    const onNotificationsUpdated = () => {
      void load();
    };

    window.addEventListener(
      "epoch:agent-notifications-updated",
      onNotificationsUpdated
    );

    return () => {
      active = false;
      clearInterval(interval);

      window.removeEventListener(
        "epoch:agent-notifications-updated",
        onNotificationsUpdated
      );
    };
  }, []);

  return (
    <Link
      href="/b2b/notifications"
      title="Agent notifications"
      aria-label={`Agent notifications: ${unread} unread`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
    >
      <Bell className="h-[18px] w-[18px]" />

      {unread > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-800 px-1.5 text-[10px] font-semibold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
