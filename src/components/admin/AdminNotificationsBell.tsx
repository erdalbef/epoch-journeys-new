"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, AlertTriangle } from "lucide-react";

export function AdminNotificationsBell() {
  const [unread, setUnread] = useState(0);
  const [emailIssues, setEmailIssues] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(
          "/api/admin/notifications",
          { cache: "no-store" }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (active) {
          setUnread(Number(data.unread || 0));
          setEmailIssues(Number(data.emailIssues || 0));
        }
      } catch {
        // Preserve the last known counts.
      }
    };

    void load();

    const interval = setInterval(load, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative inline-flex items-center">
      <Link
        href="/admin/notifications"
        title="Admin notifications"
        aria-label={`Admin notifications: ${unread} unread`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
      >
        <Bell className="h-[18px] w-[18px]" />

        {unread > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-800 px-1.5 text-[10px] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>

      {emailIssues > 0 && (
        <Link
          href="/admin/email-delivery"
          title={`${emailIssues} email notification(s) require attention`}
          aria-label={`${emailIssues} email delivery issues. Open Email Delivery Monitor`}
          className="absolute -bottom-2 -right-3 flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-900 shadow-sm"
        >
          <AlertTriangle className="h-3 w-3" />
          {emailIssues > 99 ? "99+" : emailIssues}
        </Link>
      )}
    </div>
  );
}
