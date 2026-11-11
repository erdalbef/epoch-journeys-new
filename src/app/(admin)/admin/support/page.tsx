import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  describeSupportTicket,
  getLastSupportReplies,
} from "@/lib/support/ticketActivity";
import { SupportArchiveButton } from "@/components/support/SupportArchiveButton";

type Props = {
  searchParams: Promise<{ archived?: string }>;
};

export default async function AdminSupportInbox({
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const currentAdmin = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, status: true },
  });

  if (!currentAdmin || currentAdmin.role !== "ADMIN" ||
      currentAdmin.status !== "ACTIVE") {
    redirect("/admin-login");
  }

  const params = await searchParams;
  const archived = params.archived === "1";

  const tickets = await db.supportMessage.findMany({
    where: {
      adminArchivedAt: archived ? { not: null } : null,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      subject: true,
      status: true,
      createdAt: true,
      requestType: true,
      adminArchivedAt: true,
    },
  });

  const lastReplies = await getLastSupportReplies(
    tickets.map((ticket) => ticket.id)
  );

  const ordered = tickets
    .map((ticket) => ({
      ticket,
      view: describeSupportTicket(
        ticket.status,
        ticket.createdAt,
        lastReplies.get(ticket.id)
      ),
    }))
    .sort(
      (a, b) =>
        b.view.lastActivity.getTime() -
        a.view.lastActivity.getTime()
    );

  const awaitingAdmin = ordered.filter(
    (item) => item.view.waitingFor === "ADMIN"
  ).length;

  const agents = await db.user.findMany({
    where: {
      id: { in: [...new Set(tickets.map((t) => t.userId))] },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      travelAgency: true,
    },
  });

  const agentMap = new Map(agents.map((agent) => [agent.id, agent]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Agent Support Center
        </h1>

        <p className="mt-2 text-slate-600">
          Manage agent requests and support conversations.
        </p>

        {!archived && (
          <p className="mt-3 text-sm font-semibold text-amber-800">
            {awaitingAdmin} ticket
            {awaitingAdmin === 1 ? "" : "s"} awaiting Admin attention
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/support"
          className={`rounded-lg border px-4 py-2 text-sm ${
            !archived
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700"
          }`}
        >
          Active
        </Link>

        <Link
          href="/admin/support?archived=1"
          className={`rounded-lg border px-4 py-2 text-sm ${
            archived
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700"
          }`}
        >
          Archived
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4">Last Activity</th>
              <th className="p-4">Travel Agency</th>
              <th className="p-4">Subject</th>
              <th className="p-4">Status</th>
              <th className="p-4">Needs Reply</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {ordered.map(({ ticket, view }) => {
              const agent = agentMap.get(ticket.userId);

              return (
                <tr key={ticket.id} className="border-t">
                  <td className="p-4 whitespace-nowrap">
                    {view.lastActivity.toLocaleString("en-GB")}
                  </td>

                  <td className="p-4">
                    {agent?.travelAgency ||
                      agent?.fullName ||
                      agent?.email ||
                      "Unknown agency"}
                  </td>

                  <td className="p-4">{ticket.subject}</td>

                  <td className="p-4">
                    {ticket.status.replaceAll("_", " ")}
                  </td>

                  <td className="p-4">
                    <span
                      className={
                        view.waitingFor === "ADMIN"
                          ? "rounded-full bg-amber-100 px-2 py-1 text-sm font-medium text-amber-900"
                          : view.waitingFor === "AGENT"
                            ? "rounded-full bg-blue-50 px-2 py-1 text-sm font-medium text-blue-800"
                            : "rounded-full bg-green-50 px-2 py-1 text-sm font-medium text-green-800"
                      }
                    >
                      {view.label}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/admin/support/${ticket.id}`}
                        className="font-medium text-red-800 underline"
                      >
                        Review
                      </Link>

                      <SupportArchiveButton
                        ticketId={ticket.id}
                        archived={Boolean(ticket.adminArchivedAt)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {tickets.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-slate-500"
                >
                  {archived
                    ? "No archived support requests."
                    : "No active support requests."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
