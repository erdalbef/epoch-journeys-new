import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CreateQuoteButton from "@/components/admin/quote-requests/CreateQuoteButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function QuoteRequestDetailPage({ params }: PageProps) {
  // ✅ IMPORTANT FIX
  const { id } = await params;

  console.log("PARAM ID:", id);

  // ✅ DEBUG: list IDs
  const allIds = await db.customTourRequest.findMany({
    select: {
      id: true,
      requestReference: true,
    },
    take: 20,
  });

  console.log("ALL IDS IN DB:", allIds);

  // ✅ SAFETY
  if (!id) {
    console.log("❌ ID IS UNDEFINED");
    notFound();
  }

  const request = await db.customTourRequest.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  console.log("DB RESULT:", request);

  if (!request) {
    console.log("❌ NOT FOUND TRIGGERED FOR ID:", id);
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quote Request</h1>
          <p className="text-sm text-gray-500">
            ID: {request.id}
          </p>
        </div>

        <CreateQuoteButton requestId={request.id} />
      </div>

      {/* Basic Info */}
      <div className="rounded-lg border p-4 space-y-2">
        <p>
          <strong>Client Name:</strong>{" "}
          {request.customerName ?? request.user?.fullName ?? "—"}
        </p>

        <p>
          <strong>Email:</strong>{" "}
          {request.customerEmail ?? request.user?.email ?? "—"}
        </p>

        <p>
          <strong>Status:</strong> {request.status ?? "—"}
        </p>

        <p>
          <strong>Created:</strong> {formatDate(request.createdAt)}
        </p>

        <p>
          <strong>Reference:</strong>{" "}
          {request.requestReference ?? "—"}
        </p>
      </div>

      {/* Notes */}
      {request.notes ? (
        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium">Notes</h2>
          <p>{request.notes}</p>
        </div>
      ) : null}

      {/* Back */}
      <div>
        <Link href="/admin/quote-requests" className="text-sm underline">
          ← Back to list
        </Link>
      </div>
    </div>
  );
}