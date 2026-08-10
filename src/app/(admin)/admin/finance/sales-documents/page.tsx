import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import DeleteTestSalesDocumentButton from "@/components/admin/finance/DeleteTestSalesDocumentButton";

function money(
  value: unknown,
  currency: string,
) {
  const number = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `${currency} ${number.toFixed(2)}`;
  }
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

export default async function SalesDocumentsPage() {
  const session =
    await getServerSession(authOptions);

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const docs =
    await db.salesDocument.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },

        _count: {
          select: {
            items: true,
          },
        },
      },
    });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Sales Documents
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Proformas, invoices and credit notes with PDF and email
            history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#001F3F] hover:text-[#001F3F]"
          >
            Finance Center
          </Link>

          <Link
            href="/admin/finance/sales-documents/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6f0000]"
          >
            + New Document
          </Link>
        </div>
      </div>

      {/* Test cleanup warning */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <strong>Delete Test Document</strong> is intended only for
        development, duplicate or fake records. Real issued invoices
        and accounting documents should normally remain in the
        financial history.
      </div>

      {/* Documents */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Number
                </th>

                <th className="px-4 py-3">
                  Type
                </th>

                <th className="px-4 py-3">
                  Recipient
                </th>

                <th className="px-4 py-3">
                  Booking
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3 text-right">
                  Total
                </th>

                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {docs.map((document) => {
                const bookingReference =
                  document.booking?.bookingDisplayCode ||
                  document.booking?.bookingReference ||
                  document.bookingReferenceSnapshot ||
                  "-";

                return (
                  <tr
                    key={document.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {document.documentNumber ||
                          "Draft"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {document._count.items} item
                        {document._count.items === 1
                          ? ""
                          : "s"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {label(document.type)}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {document.recipientCompany ||
                          document.recipientName}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {document.recipientEmail ||
                          "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {document.booking ? (
                        <Link
                          href={`/admin/bookings/${document.booking.id}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {bookingReference}
                        </Link>
                      ) : (
                        <span className="text-slate-500">
                          {bookingReference}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {label(document.status)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#001F3F]">
                      {money(
                        document.totalAmount,
                        document.currency,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/finance/sales-documents/${document.id}`}
                          className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#002b57]"
                        >
                          Open
                        </Link>

                        <DeleteTestSalesDocumentButton
                          documentId={
                            document.id
                          }
                          documentNumber={
                            document.documentNumber
                          }
                          documentType={
                            document.type
                          }
                          bookingReference={
                            bookingReference
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {docs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No sales documents yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}