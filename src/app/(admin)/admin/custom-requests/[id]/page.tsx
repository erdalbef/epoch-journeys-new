import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import UpdateRequestForm from "./update-form";

type Props = {
  params: {
    id: string;
  };
};

export default async function AdminCustomRequestDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const request = await db.customTourRequest.findUnique({
    where: { id: params.id },
    include: { user: true },
  });

  if (!request) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#001F3F]">
          Request {request.requestReference}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/custom-requests"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Back to Requests
          </Link>

          <Link
            href={`/admin/bookings/new?requestId=${request.id}`}
            className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#001633]"
          >
            Convert to Booking
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="grid gap-6 text-sm md:grid-cols-2">
          <div>
            <div className="text-slate-500">Agent</div>
            <div className="font-medium">{request.user?.fullName || "-"}</div>
            <div className="text-xs text-slate-500">
              {request.user?.email || "-"}
            </div>
          </div>

          <div>
            <div className="text-slate-500">Travel Agency</div>
            <div className="font-medium">
              {request.user?.travelAgency || "-"}
            </div>
          </div>

          <div>
            <div className="text-slate-500">Destination</div>
            <div className="font-medium">{request.destination || "-"}</div>
          </div>

          <div>
            <div className="text-slate-500">Estimated Pax</div>
            <div className="font-medium">{request.estimatedPax ?? "-"}</div>
          </div>

          <div>
            <div className="text-slate-500">Status</div>
            <div className="font-medium">{request.status.replaceAll("_", " ")}</div>
          </div>

          <div>
            <div className="text-slate-500">Customer Email</div>
            <div className="font-medium">{request.customerEmail || "-"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-[#001F3F]">Notes</h2>
        <div className="text-sm text-slate-700">
          {request.notes || "No notes"}
        </div>
      </div>

      <UpdateRequestForm
        id={request.id}
        currentStatus={request.status}
        currentReply=""
      />
    </div>
  );
}