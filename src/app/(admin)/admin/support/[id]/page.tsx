import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { describeSupportTicket, getLastSupportReplies } from "@/lib/support/ticketActivity";
import { SupportAdminActions } from "./support-admin-actions";
import { SupportConversation } from "@/components/support/SupportConversation";

type Props = { params: Promise<{ id: string }> };
export default async function SupportTicketDetails({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const currentAdmin = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, status: true },
  });

  if (
    !currentAdmin ||
    currentAdmin.role !== "ADMIN" ||
    currentAdmin.status !== "ACTIVE"
  ) {
    redirect("/admin-login");
  }

  const { id } = await params;
  const ticket = await db.supportMessage.findUnique({ where: { id } });
  if (!ticket) notFound();
  const agent = await db.user.findUnique({ where: { id: ticket.userId }, select: {
    fullName: true, travelAgency: true, email: true,
  }});
  const lastReply = (await getLastSupportReplies([id])).get(id);
  const view = describeSupportTicket(ticket.status, ticket.createdAt, lastReply);
  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href="/admin/support" className="text-sm text-red-800 underline">Back to Support inbox</Link>
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <h1 className="text-2xl font-bold">{ticket.subject}</h1>
      <p className="text-sm text-slate-600">{agent?.travelAgency || agent?.fullName || "Agency"} · {agent?.email || ""}</p>
      <p className="text-sm">Status: <b>{ticket.status.replaceAll("_", " ")}</b> · <strong>{view.label}</strong> · Last activity: {view.lastActivity.toLocaleString("en-GB")}</p>
      {ticket.bookingId && <p className="text-sm">Booking reference: {ticket.bookingId}</p>}
      <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">{ticket.message}</div>
      {ticket.attachmentPath && <a href={`/api/support/attachments/${ticket.id}`} className="text-sm text-red-800 underline">Download attachment: {ticket.attachmentName || "File"}</a>}
    </div>
    <SupportAdminActions id={ticket.id} initialStatus={ticket.status} />
    <SupportConversation ticketId={ticket.id} />
  </div>;
}
