import { NextResponse } from "next/server";

/**
 * Deprecated two-step upload route.
 * Previously it stored receipts under public/uploads/payments and allowed
 * direct, unauthenticated downloads. Payment files are now uploaded with the
 * booking submission through /api/b2b/payments/submit.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been retired. Please submit the receipt with your payment." },
    { status: 410 },
  );
}
