import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/b2b/ProfileForm";

function labelEnum(
  value: string | null,
) {
  if (!value) {
    return "";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export default async function B2BProfilePage() {
  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user?.id) {
    redirect("/agent-signin");
  }

  const user =
    await db.user.findUnique({
      where: {
        id: session.user.id,
      },

      select: {
        role: true,
        approved: true,
        status: true,

        fullName: true,
        email: true,
        phone: true,
        travelAgency: true,
        website: true,
        membership: true,
        agentLogoUrl: true,

        partnerType: true,
        agentCode: true,

        billingCompanyName:
          true,
        billingCompanyRegNo:
          true,
        billingTaxNumber:
          true,
        billingVatNumber:
          true,
        billingAddress: true,
        billingCity: true,
        billingState: true,
        billingPostalCode:
          true,
        billingCountry: true,
        billingContactName:
          true,
        billingEmail: true,
        billingEmailSecondary:
          true,
        billingPhone: true,
      },
    });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    redirect("/agent-signin");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
          Agent Workspace
        </p>

        <h1 className="mt-1 text-2xl font-bold text-[#001F3F]">
          Profile Settings
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Keep your contact,
          company and billing
          information current.
          These details help
          Epoch Journeys prepare
          commercial documents
          accurately.
        </p>
      </div>

      <ProfileForm
        initialData={{
          fullName:
            user.fullName ?? "",

          email:
            user.email ?? "",

          phone:
            user.phone ?? "",

          travelAgency:
            user.travelAgency ??
            "",

          website:
            user.website ?? "",

          membership:
            user.membership ??
            "",

          agentLogoUrl:
            user.agentLogoUrl ??
            "",

          partnerType:
            labelEnum(
              user.partnerType,
            ),

          agentCode:
            user.agentCode ?? "",

          billingCompanyName:
            user.billingCompanyName ??
            "",

          billingCompanyRegNo:
            user.billingCompanyRegNo ??
            "",

          billingTaxNumber:
            user.billingTaxNumber ??
            "",

          billingVatNumber:
            user.billingVatNumber ??
            "",

          billingAddress:
            user.billingAddress ??
            "",

          billingCity:
            user.billingCity ??
            "",

          billingState:
            user.billingState ??
            "",

          billingPostalCode:
            user.billingPostalCode ??
            "",

          billingCountry:
            user.billingCountry ??
            "",

          billingContactName:
            user.billingContactName ??
            "",

          billingEmail:
            user.billingEmail ??
            "",

          billingEmailSecondary:
            user.billingEmailSecondary ??
            "",

          billingPhone:
            user.billingPhone ?? "",
        }}
      />
    </div>
  );
}
