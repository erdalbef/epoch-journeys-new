"use client";

import { useSearchParams } from "next/navigation";
import { AgentLoginForm } from "@/components/auth/AgentLoginForm";

export default function AgentLoginClient() {
  const searchParams = useSearchParams();

  const rawCallback = searchParams.get("callbackUrl");

  const callbackUrl =
    typeof rawCallback === "string" && rawCallback.startsWith("/")
      ? rawCallback
      : "/b2b/dashboard";

  return <AgentLoginForm callbackUrl={callbackUrl} />;
}