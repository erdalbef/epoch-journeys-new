"use client";

import { useSearchParams } from "next/navigation";

function decodeAuthError(raw: string | null): string | null {
  if (!raw) return null;

  // NextAuth often uses "CredentialsSignin" for generic failures
  // We'll show a friendly message in that case.
  if (raw === "CredentialsSignin") {
    return "Invalid email or password.";
  }

  // If we threw a custom error in authorize(), NextAuth typically maps it to "CredentialsSignin"
  // in some setups. In others, it may pass the message. We'll handle both.
  // Try to make it readable:
  return raw.replaceAll("+", " ");
}

export function SignInError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const msg = decodeAuthError(error);
  if (!msg) return null;

  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {msg}
    </div>
  );
}
