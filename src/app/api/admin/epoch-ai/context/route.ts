import { NextResponse } from "next/server";

import { findEpochAiRecords } from "@/lib/epoch-ai/context";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    if (type !== "supplier" && type !== "quote") {
      return NextResponse.json({ error: "Invalid record type." }, { status: 400 });
    }
    const results = await findEpochAiRecords(type, url.searchParams.get("q") ?? "");
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("EPOCH_AI_CONTEXT_SEARCH_ERROR", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: "Could not search records." }, { status: 500 });
  }
}
