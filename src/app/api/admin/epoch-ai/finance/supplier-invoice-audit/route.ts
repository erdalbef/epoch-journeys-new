import { NextResponse } from "next/server";

import { auditSupplierInvoice } from "@/lib/epoch-ai/finance/supplierInvoiceAudit";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;

  try {
    const url = new URL(request.url);

    const payableId = url.searchParams.get("payableId");

    if (!payableId || payableId.length > 128) {
      return NextResponse.json(
        { error: "A valid supplier payable ID is required." },
        { status: 400 },
      );
    }

    const result = await auditSupplierInvoice(payableId);

    return NextResponse.json(
      { result },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Supplier payable not found."
    ) {
      return NextResponse.json(
        { error: "Supplier payable not found." },
        { status: 404 },
      );
    }

    console.error(
      "EPOCH_AI_SUPPLIER_AUDIT_ERROR",
      error instanceof Error ? error.name : "Unknown",
    );

    return NextResponse.json(
      { error: "Unable to complete supplier invoice audit." },
      { status: 500 },
    );
  }
}
