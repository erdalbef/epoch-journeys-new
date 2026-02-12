import { db } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const pendingAgentsCount = await db.user.count({
    where: { role: "AGENT", approved: false },
  });

  const approvedAgentsCount = await db.user.count({
    where: { role: "AGENT", approved: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview & quick actions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Pending Agents</div>
          <div className="mt-1 text-3xl font-semibold">{pendingAgentsCount}</div>
          <Link
            href="/admin/agents"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            Review pending agents
          </Link>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Approved Agents</div>
          <div className="mt-1 text-3xl font-semibold">{approvedAgentsCount}</div>
          <Link
            href="/admin/agents"
            className="mt-3 inline-block text-sm underline underline-offset-4"
          >
            View all agents
          </Link>
        </div>
      </div>
    </div>
  );
}
