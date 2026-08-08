import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  FinanceDocumentType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import FinanceDocumentManager from "./FinanceDocumentManager";

export default async function FinanceDocumentsPage() {
  const session =
    await getServerSession(authOptions);

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const [
    documents,
    expenses,
    supplierPayables,
    supplierPayablePayments,
    refunds,
    bookings,
    tours,
    departures,
    suppliers,
    bankTransactions,
  ] = await Promise.all([
    db.financeDocument.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 250,

      select: {
        id: true,
        type: true,
        title: true,
        description: true,

        originalFileName: true,
        mimeType: true,
        fileSize: true,

        documentDate: true,
        referenceNumber: true,
        notes: true,

        createdAt: true,

        expense: {
          select: {
            id: true,
            title: true,
          },
        },

        supplierPayable: {
          select: {
            id: true,
            title: true,
            supplierNameSnapshot: true,
          },
        },

        supplierPayablePayment: {
          select: {
            id: true,

            payable: {
              select: {
                title: true,
                supplierNameSnapshot: true,
              },
            },
          },
        },

        refund: {
          select: {
            id: true,
            amount: true,
            currency: true,

            booking: {
              select: {
                bookingReference: true,
                bookingDisplayCode: true,
              },
            },
          },
        },

        bankTransaction: {
          select: {
            id: true,
            description: true,
            reference: true,
          },
        },

        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },

        tour: {
          select: {
            id: true,
            title: true,
          },
        },

        departureDate: {
          select: {
            id: true,
            date: true,

            tour: {
              select: {
                title: true,
              },
            },
          },
        },

        supplier: {
          select: {
            id: true,
            name: true,
          },
        },

        uploadedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    }),

    db.expense.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 150,

      select: {
        id: true,
        title: true,
        vendorName: true,
        expenseDate: true,
      },
    }),

    db.supplierPayable.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 150,

      select: {
        id: true,
        title: true,
        supplierNameSnapshot: true,
        supplierInvoiceNumber: true,
      },
    }),

    db.supplierPayablePayment.findMany({
      orderBy: {
        paymentDate: "desc",
      },

      take: 150,

      select: {
        id: true,
        paymentDate: true,
        reference: true,

        payable: {
          select: {
            title: true,
            supplierNameSnapshot: true,
          },
        },
      },
    }),

    db.refund.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 150,

      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,

        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
      },
    }),

    db.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 200,

      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        tourTitleSnapshot: true,
      },
    }),

    db.tour.findMany({
      orderBy: {
        title: "asc",
      },

      select: {
        id: true,
        title: true,
        tourCode: true,
      },
    }),

    db.departureDate.findMany({
      orderBy: {
        date: "desc",
      },

      take: 200,

      select: {
        id: true,
        date: true,

        tour: {
          select: {
            title: true,
          },
        },
      },
    }),

    db.supplier.findMany({
      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
        type: true,
      },
    }),

    db.bankTransaction.findMany({
      orderBy: {
        transactionDate: "desc",
      },

      take: 200,

      select: {
        id: true,
        type: true,
        reference: true,
        description: true,
        transactionDate: true,
      },
    }),
  ]);

  return (
    <FinanceDocumentManager
      documentTypes={Object.values(
        FinanceDocumentType,
      )}
      documents={documents.map(
        (document) => ({
          ...document,

          documentDate:
            document.documentDate
              ? document.documentDate.toISOString()
              : null,

          createdAt:
            document.createdAt.toISOString(),

          departureDate:
            document.departureDate
              ? {
                  ...document.departureDate,

                  date:
                    document.departureDate.date.toISOString(),
                }
              : null,

          refund:
            document.refund
              ? {
                  ...document.refund,

                  amount: Number(
                    document.refund.amount,
                  ),
                }
              : null,
        }),
      )}
      expenses={expenses.map(
        (expense) => ({
          ...expense,

          expenseDate:
            expense.expenseDate.toISOString(),
        }),
      )}
      supplierPayables={
        supplierPayables
      }
      supplierPayablePayments={supplierPayablePayments.map(
        (payment) => ({
          ...payment,

          paymentDate:
            payment.paymentDate.toISOString(),
        }),
      )}
      refunds={refunds.map(
        (refund) => ({
          ...refund,

          amount: Number(
            refund.amount,
          ),
        }),
      )}
      bookings={bookings}
      tours={tours}
      departures={departures.map(
        (departure) => ({
          ...departure,

          date:
            departure.date.toISOString(),
        }),
      )}
      suppliers={suppliers}
      bankTransactions={bankTransactions.map(
        (transaction) => ({
          ...transaction,

          transactionDate:
            transaction.transactionDate.toISOString(),
        }),
      )}
    />
  );
}