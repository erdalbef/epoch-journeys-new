import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import EditSupplierPaymentForm from "@/components/admin/supplier-payables/EditSupplierPaymentForm";

type Props = {
  params: Promise<{
    id: string;
    paymentId: string;
  }>;
};

export default async function EditSupplierPaymentPage({
  params,
}: Props) {
  const { id, paymentId } = await params;

  const [payable, payment, bankAccounts] =
    await Promise.all([
      db.supplierPayable.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          title: true,
          supplierNameSnapshot: true,
          currency: true,
          approvedAmount: true,
          creditAmount: true,
        },
      }),

      db.supplierPayablePayment.findFirst({
        where: {
          id: paymentId,
          payableId: id,
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          bankAccountId: true,
          paymentDate: true,
          method: true,
          reference: true,
          notes: true,
          documents: {
            where: {
              type: "SUPPLIER_PAYMENT_PROOF",
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              originalFileName: true,
            },
          },
        },
      }),

      db.bankAccount.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          currency: true,
        },
      }),
    ]);

  if (!payable || !payment) {
    notFound();
  }

  const proof =
    payment.documents[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href={`/admin/supplier-payables/${payable.id}`}
          className="text-sm font-semibold text-[#001F3F] hover:underline"
        >
          ← Back to Supplier Payable
        </Link>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
          Supplier Payment
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#001F3F]">
          Edit Payment
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {payable.supplierNameSnapshot} ·{" "}
          {payable.title}
        </p>
      </div>

      <EditSupplierPaymentForm
        payable={{
          id: payable.id,
          currency: payable.currency,
          approvedAmount: Number(
            payable.approvedAmount,
          ),
          creditAmount: Number(
            payable.creditAmount,
          ),
        }}
        payment={{
          id: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          bankAccountId:
            payment.bankAccountId,
          paymentDate:
            payment.paymentDate
              .toISOString()
              .slice(0, 10),
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
          hasProof: Boolean(proof),
          proofFileName:
            proof?.originalFileName ?? null,
        }}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
