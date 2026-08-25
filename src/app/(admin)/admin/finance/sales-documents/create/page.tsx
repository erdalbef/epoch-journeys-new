import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  Role,
  SalesDocumentStatus,
  SalesDocumentType,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import SalesDocumentForm from "../SalesDocumentForm";

type PageProps = {
  searchParams: Promise<{
    creditFrom?: string;
  }>;
};

function splitBilingual(
  value: string | null | undefined,
) {
  if (!value) {
    return {
      en: "",
      bg: "",
    };
  }

  const [en = "", bg = ""] =
    value.split(
      "\n---BG---\n",
    );

  return {
    en,
    bg,
  };
}

export default async function CreateSalesDocumentPage({
  searchParams,
}: PageProps) {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !==
      Role.ADMIN
  ) {
    redirect(
      "/admin-login",
    );
  }

  const query =
    await searchParams;

  const creditFrom =
    typeof query.creditFrom ===
    "string"
      ? query.creditFrom.trim()
      : "";

  const [
    bookings,
    agents,
    partnerCompanies,
    originalInvoice,
  ] =
    await Promise.all([
      db.booking.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: 250,

        select: {
          id: true,
          bookingReference:
            true,
          groupName: true,
          customerName: true,
          customerEmail: true,
          agencyNameSnapshot:
            true,
          currency: true,
          netAmount: true,
          amountPaid: true,
          tourTitleSnapshot:
            true,
          departureDateSnapshot:
            true,

          user: {
            select: {
              id: true,
              fullName:
                true,
              travelAgency:
                true,
              email: true,
              billingContactName:
                true,
              billingCompanyName:
                true,
              billingAddress:
                true,
              billingCity:
                true,
              billingPostalCode:
                true,
              billingCountry:
                true,
              billingTaxNumber:
                true,
              billingVatNumber:
                true,
              billingEmail:
                true,
              billingEmailSecondary:
                true,
            },
          },

          partnerCompany: {
            select: {
              id: true,
              name: true,
              contactName:
                true,
              email: true,
              billingContactName:
                true,
              billingCompanyName:
                true,
              billingAddress:
                true,
              billingCity:
                true,
              billingPostalCode:
                true,
              billingCountry:
                true,
              billingTaxNumber:
                true,
              billingVatNumber:
                true,
              billingEmail:
                true,
              billingEmailSecondary:
                true,
            },
          },
        },
      }),

      db.user.findMany({
        where: {
          role:
            Role.AGENT,
          approved: true,
        },

        orderBy: [
          {
            travelAgency:
              "asc",
          },
          {
            fullName:
              "asc",
          },
        ],

        select: {
          id: true,
          fullName: true,
          travelAgency:
            true,
          email: true,
          billingContactName:
            true,
          billingCompanyName:
            true,
          billingAddress:
            true,
          billingCity:
            true,
          billingPostalCode:
            true,
          billingCountry:
            true,
          billingTaxNumber:
            true,
          billingVatNumber:
            true,
          billingEmail:
            true,
          billingEmailSecondary:
            true,
        },
      }),

      db.partnerCompany.findMany({
        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
          contactName:
            true,
          email: true,
          billingContactName:
            true,
          billingCompanyName:
            true,
          billingAddress:
            true,
          billingCity:
            true,
          billingPostalCode:
            true,
          billingCountry:
            true,
          billingTaxNumber:
            true,
          billingVatNumber:
            true,
          billingEmail:
            true,
          billingEmailSecondary:
            true,
        },
      }),

      creditFrom
        ? db.salesDocument.findUnique({
            where: {
              id:
                creditFrom,
            },

            select: {
              id: true,
              type: true,
              status:
                true,
              documentNumber:
                true,
              issueDate:
                true,

              bookingId:
                true,
              bookingReferenceSnapshot:
                true,

              currency:
                true,

              recipientName:
                true,
              recipientCompany:
                true,
              recipientEmail:
                true,
              recipientEmailSecondary:
                true,
              recipientAddress:
                true,
              recipientCity:
                true,
              recipientPostalCode:
                true,
              recipientCountry:
                true,
              recipientTaxNumber:
                true,
              recipientVatNumber:
                true,

              paymentTerms:
                true,
              footerNotes:
                true,

              items: {
                orderBy: {
                  sortOrder:
                    "asc",
                },

                select: {
                  description:
                    true,
                  quantity:
                    true,
                  unitPrice:
                    true,
                  taxRate:
                    true,
                },
              },
            },
          })
        : Promise.resolve(
            null,
          ),
    ]);

  // ========================================================
  // CREDIT NOTE SOURCE VALIDATION
  // ========================================================

  if (creditFrom) {
    if (
      !originalInvoice
    ) {
      redirect(
        "/admin/finance/sales-documents",
      );
    }

    if (
      originalInvoice.type !==
      SalesDocumentType.INVOICE
    ) {
      redirect(
        `/admin/finance/sales-documents/${originalInvoice.id}`,
      );
    }

    const allowedStatuses: SalesDocumentStatus[] =
      [
        SalesDocumentStatus.ISSUED,
        SalesDocumentStatus.SENT,
        SalesDocumentStatus.PARTIALLY_PAID,
        SalesDocumentStatus.PAID,
      ];

    if (
      !allowedStatuses.includes(
        originalInvoice.status,
      ) ||
      !originalInvoice.documentNumber
    ) {
      redirect(
        `/admin/finance/sales-documents/${originalInvoice.id}`,
      );
    }
  }

  // ========================================================
  // BOOKING OPTIONS
  // ========================================================

  const bookingOptions =
    bookings.map(
      (booking) => {
        const profile =
          booking.partnerCompany ??
          booking.user;

        return {
          id:
            booking.id,

          bookingReference:
            booking.bookingReference,

          groupName:
            booking.groupName,

          customerName:
            booking.customerName,

          customerEmail:
            booking.customerEmail,

          agencyNameSnapshot:
            booking.agencyNameSnapshot,

          currency:
            booking.currency,

          netAmount:
            booking.netAmount,

          amountPaid:
            booking.amountPaid,

          tourTitleSnapshot:
            booking.tourTitleSnapshot,

          departureDateSnapshot:
            booking.departureDateSnapshot
              ? booking.departureDateSnapshot.toISOString()
              : "",

          billTo: {
            recipientName:
              profile.billingContactName ??
              ("contactName" in
              profile
                ? profile.contactName
                : profile.fullName) ??
              booking.customerName ??
              "",

            recipientCompany:
              profile.billingCompanyName ??
              ("name" in
              profile
                ? profile.name
                : profile.travelAgency) ??
              booking.agencyNameSnapshot ??
              "",

            recipientEmail:
              profile.billingEmail ??
              profile.email ??
              booking.customerEmail ??
              "",

            recipientEmailSecondary:
              profile.billingEmailSecondary ??
              "",

            recipientAddress:
              profile.billingAddress ??
              "",

            recipientCity:
              profile.billingCity ??
              "",

            recipientPostalCode:
              profile.billingPostalCode ??
              "",

            recipientCountry:
              profile.billingCountry ??
              "",

            recipientTaxNumber:
              profile.billingTaxNumber ??
              "",

            recipientVatNumber:
              profile.billingVatNumber ??
              "",
          },
        };
      },
    );

  // ========================================================
  // SAVED BILL-TO PROFILES
  // ========================================================

  const billToOptions = [
    ...agents.map(
      (agent) => ({
        key:
          `USER:${agent.id}`,

        label:
          agent.billingCompanyName ||
          agent.travelAgency ||
          agent.fullName ||
          agent.email,

        recipientName:
          agent.billingContactName ||
          agent.fullName ||
          "",

        recipientCompany:
          agent.billingCompanyName ||
          agent.travelAgency ||
          "",

        recipientEmail:
          agent.billingEmail ||
          agent.email,

        recipientEmailSecondary:
          agent.billingEmailSecondary ||
          "",

        recipientAddress:
          agent.billingAddress ||
          "",

        recipientCity:
          agent.billingCity ||
          "",

        recipientPostalCode:
          agent.billingPostalCode ||
          "",

        recipientCountry:
          agent.billingCountry ||
          "",

        recipientTaxNumber:
          agent.billingTaxNumber ||
          "",

        recipientVatNumber:
          agent.billingVatNumber ||
          "",
      }),
    ),

    ...partnerCompanies.map(
      (company) => ({
        key:
          `PARTNER:${company.id}`,

        label:
          company.billingCompanyName ||
          company.name,

        recipientName:
          company.billingContactName ||
          company.contactName ||
          "",

        recipientCompany:
          company.billingCompanyName ||
          company.name,

        recipientEmail:
          company.billingEmail ||
          company.email ||
          "",

        recipientEmailSecondary:
          company.billingEmailSecondary ||
          "",

        recipientAddress:
          company.billingAddress ||
          "",

        recipientCity:
          company.billingCity ||
          "",

        recipientPostalCode:
          company.billingPostalCode ||
          "",

        recipientCountry:
          company.billingCountry ||
          "",

        recipientTaxNumber:
          company.billingTaxNumber ||
          "",

        recipientVatNumber:
          company.billingVatNumber ||
          "",
      }),
    ),
  ];

  // ========================================================
  // CREDIT NOTE PREFILL
  // ========================================================

  const originalService =
    splitBilingual(
      originalInvoice?.paymentTerms,
    );

  const originalVat =
    splitBilingual(
      originalInvoice?.footerNotes,
    );

  const creditNoteSource =
    originalInvoice
      ? {
          id:
            originalInvoice.id,

          documentNumber:
            originalInvoice.documentNumber!,

          issueDate:
            originalInvoice.issueDate
              ? originalInvoice.issueDate.toISOString()
              : null,

          bookingId:
            originalInvoice.bookingId,

          bookingReference:
            originalInvoice.bookingReferenceSnapshot,

          currency:
            originalInvoice.currency,

          billTo: {
            recipientName:
              originalInvoice.recipientName,

            recipientCompany:
              originalInvoice.recipientCompany ??
              "",

            recipientEmail:
              originalInvoice.recipientEmail ??
              "",

            recipientEmailSecondary:
              originalInvoice.recipientEmailSecondary ??
              "",

            recipientAddress:
              originalInvoice.recipientAddress ??
              "",

            recipientCity:
              originalInvoice.recipientCity ??
              "",

            recipientPostalCode:
              originalInvoice.recipientPostalCode ??
              "",

            recipientCountry:
              originalInvoice.recipientCountry ??
              "",

            recipientTaxNumber:
              originalInvoice.recipientTaxNumber ??
              "",

            recipientVatNumber:
              originalInvoice.recipientVatNumber ??
              "",
          },

          items:
            originalInvoice.items.map(
              (item) => ({
                description:
                  item.description,

                quantity:
                  Number(
                    item.quantity,
                  ),

                unitPrice:
                  Number(
                    item.unitPrice,
                  ),

                taxRate:
                  Number(
                    item.taxRate ??
                      0,
                  ),
              }),
            ),

          serviceDescriptionEn:
            originalService.en,

          serviceDescriptionBg:
            originalService.bg,

          vatEn:
            originalVat.en,

          vatBg:
            originalVat.bg,
        }
      : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            {creditNoteSource
              ? "Create Credit Note"
              : "Create Sales Document"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            {creditNoteSource
              ? `Create a Credit Note against Invoice ${creditNoteSource.documentNumber}. Review the credited services and amounts before saving the draft.`
              : "Create a draft Proforma or Invoice. Permanent numbering is assigned only when issued."}
          </p>
        </div>

        <Link
          href={
            creditNoteSource
              ? `/admin/finance/sales-documents/${creditNoteSource.id}`
              : "/admin/finance/sales-documents"
          }
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
        >
          Back
        </Link>
      </div>

      <SalesDocumentForm
        bookings={
          bookingOptions
        }
        billToOptions={
          billToOptions
        }
        creditNoteSource={
          creditNoteSource
        }
      />
    </div>
  );
}