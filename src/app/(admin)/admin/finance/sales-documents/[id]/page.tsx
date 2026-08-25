import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import {
  getServerSession,
} from "next-auth";

import {
  Role,
  SalesDocumentType,
} from "@prisma/client";

import {
  authOptions,
} from "@/lib/authOptions";
import {
  db,
} from "@/lib/db";

import DocumentActions from "./DocumentActions";

function money(
  value: unknown,
  currency: string,
) {
  const number =
    Number(value || 0);

  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
      },
    ).format(number);
  } catch {
    return `${currency} ${number.toFixed(
      2,
    )}`;
  }
}

function date(
  value: Date | null,
) {
  return value
    ? value.toLocaleDateString(
        "en-GB",
      )
    : "-";
}

function label(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function extraNotes(
  notes: string | null,
) {
  if (!notes) {
    return "";
  }

  return notes
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith(
          "PAYMENT_EN:",
        ) &&
        !line.startsWith(
          "PAYMENT_BG:",
        ) &&
        !line.startsWith(
          "ORIGINAL_INVOICE:",
        ),
    )
    .join("\n")
    .trim();
}

export default async function Page({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
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

  const { id } =
    await params;

  const document =
    await db.salesDocument.findUnique({
      where: {
        id,
      },

      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        booking: {
          select: {
            bookingReference:
              true,
          },
        },

        originalDocument: {
          select: {
            id: true,
            documentNumber:
              true,
            issueDate:
              true,
            totalAmount:
              true,
            currency:
              true,
            status:
              true,
          },
        },

        creditNotes: {
          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            documentNumber:
              true,
            status:
              true,
            totalAmount:
              true,
            currency:
              true,
            createdAt:
              true,
          },
        },
      },
    });

  if (!document) {
    notFound();
  }

  const notes =
    extraNotes(
      document.notes,
    );

  const isCreditNote =
    document.type ===
    SalesDocumentType.CREDIT_NOTE;

  const totalCredited =
    document.creditNotes.reduce(
      (
        sum,
        creditNote,
      ) =>
        sum +
        Number(
          creditNote.totalAmount,
        ),
      0,
    );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            {label(
              document.type,
            )}
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            {document.documentNumber ||
              "Draft Sales Document"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Status:{" "}
            {label(
              document.status,
            )}{" "}
            · Created{" "}
            {date(
              document.createdAt,
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/sales-documents"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            Back
          </Link>

          <DocumentActions
            id={
              document.id
            }
            type={
              document.type
            }
            status={
              document.status
            }
            email={
              document.recipientEmail
            }
          />
        </div>
      </div>

      {/* ORIGINAL INVOICE LINK */}

      {isCreditNote &&
        document.originalDocument && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              Credit Note Reference
            </p>

            <h2 className="mt-1 text-lg font-bold text-amber-950">
              Original Invoice{" "}
              {
                document
                  .originalDocument
                  .documentNumber
              }
            </h2>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-amber-900">
              <span>
                Invoice date:{" "}
                {date(
                  document
                    .originalDocument
                    .issueDate,
                )}
              </span>

              <span>
                Original total:{" "}
                {money(
                  document
                    .originalDocument
                    .totalAmount,
                  document
                    .originalDocument
                    .currency,
                )}
              </span>

              <span>
                Status:{" "}
                {label(
                  document
                    .originalDocument
                    .status,
                )}
              </span>
            </div>

            <Link
              href={`/admin/finance/sales-documents/${document.originalDocument.id}`}
              className="mt-4 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Open Original Invoice
            </Link>
          </section>
        )}

      {/* BILLING + DETAILS */}

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Bill To / Получател">
          <p className="font-bold">
            {document.recipientCompany ||
              document.recipientName}
          </p>

          {document.recipientCompany ? (
            <p>
              Contact:{" "}
              {
                document.recipientName
              }
            </p>
          ) : null}

          <p>
            {document.recipientEmail ||
              "-"}
          </p>

          {document.recipientEmailSecondary ? (
            <p>
              CC:{" "}
              {
                document.recipientEmailSecondary
              }
            </p>
          ) : null}

          <p>
            {[
              document.recipientAddress,
              document.recipientCity,
              document.recipientPostalCode,
              document.recipientCountry,
            ]
              .filter(Boolean)
              .join(", ") ||
              "-"}
          </p>

          <p>
            Tax ID:{" "}
            {document.recipientTaxNumber ||
              "-"}{" "}
            · VAT:{" "}
            {document.recipientVatNumber ||
              "-"}
          </p>
        </Card>

        <Card title="Document Details / Данни за документа">
          <p>
            Number:{" "}
            <b>
              {document.documentNumber ||
                "Assigned when issued"}
            </b>
          </p>

          <p>
            Issue date:{" "}
            {date(
              document.issueDate,
            )}
          </p>

          <p>
            Due date:{" "}
            {date(
              document.dueDate,
            )}
          </p>

          <p>
            Booking:{" "}
            {document.booking
              ?.bookingReference ||
              document.bookingReferenceSnapshot ||
              "-"}
          </p>

          {isCreditNote &&
            document.originalDocument && (
              <p>
                Original Invoice:{" "}
                <Link
                  href={`/admin/finance/sales-documents/${document.originalDocument.id}`}
                  className="font-semibold text-amber-700 hover:underline"
                >
                  {
                    document
                      .originalDocument
                      .documentNumber
                  }
                </Link>
              </p>
            )}
        </Card>
      </section>

      {/* ITEMS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-[#001F3F]">
          {isCreditNote
            ? "Credited Items"
            : "Items"}
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">
                  Description
                </th>

                <th>
                  Qty
                </th>

                <th>
                  Unit
                </th>

                <th>
                  VAT
                </th>

                <th className="text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {document.items.map(
                (item) => (
                  <tr
                    key={
                      item.id
                    }
                    className="border-b border-slate-100"
                  >
                    <td className="py-3">
                      {
                        item.description
                      }
                    </td>

                    <td>
                      {Number(
                        item.quantity,
                      )}
                    </td>

                    <td>
                      {money(
                        item.unitPrice,
                        document.currency,
                      )}
                    </td>

                    <td>
                      {item.taxRate
                        ? `${Number(
                            item.taxRate,
                          )}%`
                        : "0%"}
                    </td>

                    <td className="text-right font-semibold">
                      {money(
                        item.grossAmount,
                        document.currency,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 ml-auto max-w-sm space-y-2 text-sm">
          <Row
            k="Subtotal"
            v={money(
              document.subtotal,
              document.currency,
            )}
          />

          <Row
            k="VAT"
            v={money(
              document.taxTotal,
              document.currency,
            )}
          />

          <Row
            k={
              isCreditNote
                ? "CREDIT AMOUNT"
                : "TOTAL"
            }
            v={money(
              document.totalAmount,
              document.currency,
            )}
            bold
          />

          {!isCreditNote && (
            <>
              <Row
                k="Paid / Deposit"
                v={money(
                  document.amountPaid,
                  document.currency,
                )}
              />

              <Row
                k="BALANCE DUE"
                v={money(
                  document.balance,
                  document.currency,
                )}
                bold
              />
            </>
          )}
        </div>
      </section>

      {/* LINKED CREDIT NOTES */}

      {!isCreditNote &&
        document.creditNotes.length >
          0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  Credit Notes
                </p>

                <h2 className="mt-1 text-lg font-bold text-amber-950">
                  Adjustments to this Invoice
                </h2>
              </div>

              <div className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-amber-900">
                Total credited:{" "}
                {money(
                  totalCredited,
                  document.currency,
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {document.creditNotes.map(
                (
                  creditNote,
                ) => (
                  <Link
                    key={
                      creditNote.id
                    }
                    href={`/admin/finance/sales-documents/${creditNote.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4 transition hover:border-amber-400 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {creditNote.documentNumber ||
                          "Draft Credit Note"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {label(
                          creditNote.status,
                        )}{" "}
                        · Created{" "}
                        {date(
                          creditNote.createdAt,
                        )}
                      </p>
                    </div>

                    <p className="font-bold text-amber-800">
                      {money(
                        creditNote.totalAmount,
                        creditNote.currency,
                      )}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </section>
        )}

      {/* BILINGUAL INFO */}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Service Description / Описание на услугата">
          <p className="whitespace-pre-wrap">
            {document.paymentTerms?.split(
              "\n---BG---\n",
            )[0] ||
              "-"}
          </p>

          <p className="mt-3 whitespace-pre-wrap text-slate-600">
            {document.paymentTerms?.split(
              "\n---BG---\n",
            )[1] ||
              "-"}
          </p>
        </Card>

        <Card title="VAT Note / ДДС">
          <p className="whitespace-pre-wrap">
            {document.footerNotes?.split(
              "\n---BG---\n",
            )[0] ||
              "-"}
          </p>

          <p className="mt-3 whitespace-pre-wrap text-slate-600">
            {document.footerNotes?.split(
              "\n---BG---\n",
            )[1] ||
              "-"}
          </p>
        </Card>
      </section>

      {notes ? (
        <Card title="Additional Information / Допълнителна информация">
          <p className="whitespace-pre-wrap">
            {notes}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 shadow-sm">
      <h2 className="mb-3 font-bold text-[#001F3F]">
        {title}
      </h2>

      {children}
    </section>
  );
}

function Row({
  k,
  v,
  bold = false,
}: {
  k: string;
  v: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        bold
          ? "border-t pt-2 text-base font-bold text-[#001F3F]"
          : ""
      }`}
    >
      <span>
        {k}
      </span>

      <span>
        {v}
      </span>
    </div>
  );
}