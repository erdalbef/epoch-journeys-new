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

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#f8f8f8] px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#001F3F]">
            Agent Login
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Access your partner dashboard
          </p>
        </div>

        <AgentLoginForm callbackUrl={callbackUrl} />

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Not registered yet?{" "}
            <a
              href="/request-partnership"
              className="font-medium text-[#8B0000] hover:underline"
            >
              Request Partnership
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}