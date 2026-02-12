"use client";

import { useSearchParams } from "next/navigation";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/dashboard";

  return <AdminLoginForm callbackUrl={callbackUrl} />;
}
