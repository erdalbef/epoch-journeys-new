"use client";

import { useSearchParams } from "next/navigation";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginClient() {
  const searchParams = useSearchParams();

  const rawCallback = searchParams.get("callbackUrl");

  const callbackUrl =
    rawCallback && rawCallback.startsWith("/")
      ? rawCallback
      : "/admin/dashboard";

  return <AdminLoginForm callbackUrl={callbackUrl} />;
}