import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/b2b/ProfileForm";

export default async function B2BProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      approved: true,
      status: true,
      fullName: true,
      email: true,
      phone: true,
      travelAgency: true,
      agentLogoUrl: true,
    },
  });

  if (!user || user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
    redirect("/agent-signin");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#001F3F]">Profile Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Update your agency information. Your logo will be used on client-facing
          vouchers once uploaded.
        </p>
      </div>

      <ProfileForm
        initialData={{
          fullName: user.fullName ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
          travelAgency: user.travelAgency ?? "",
          agentLogoUrl: user.agentLogoUrl ?? "",
        }}
      />
    </div>
  );
}