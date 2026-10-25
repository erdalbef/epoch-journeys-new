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

export default async function EditSupplierPaymentPage({ params }: Props) {
  const { id, paymentId } = await params;

  const [payable, payment, bankAccounts] = await Promise.all([
    db.supplierPayable.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        supplierId: true,
        supplierNameSnapshot: true,
        currency: true,
        approvedAmount: true,
        creditAmount: true,
      },
    }),
    db.supplierPayablePayment.findFirst({
      where: { id: paymentId, payableId: id },
      select: {
        id: true,
        amount: true,
        currency: true,
        bankAccountId: true,
        paymentDate: true,
        method: true,
        reference: true,
        notes: true,
        contractPaymentScheduleId: true,
        documents: {
          where: { type: "SUPPLIER_PAYMENT_PROOF" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, originalFileName: true },
        },
      },
    }),
    db.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
  ]);

  if (!payable || !payment) notFound();

  // Do not associate a payment with contracts belonging to a different supplier.
  const schedules = payable.supplierId
    ? await db.supplierContractPaymentSchedule.findMany({
        where: {
          contract: {
            supplierId: payable.supplierId,
          },
        },
        select: {
          id: true,
          label: true,
          dueDate: true,
          amount: true,
          contract: {
            select: { title: true, currency: true },
          },
          supplierPayablePayments: {
            select: { amount: true },
          },
        },
        orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
      })
    : [];

  const contractInstallments = schedules.map((schedule) => {
    const required = schedule.amount === null ? null : Number(schedule.amount);
    const linkedPaid = schedule.supplierPayablePayments.reduce(
      (total, linkedPayment) => total + Number(linkedPayment.amount),
      0,
    );

    return {
      id: schedule.id,
      contractTitle: schedule.contract.title,
      label: schedule.label,
      dueDate: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(schedule.dueDate),
      currency: schedule.contract.currency,
      amount: required,
      remaining: required === null ? null : Math.max(0, required - linkedPaid),
    };
  });

  const proof = payment.documents[0] ?? null;

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
          {payable.supplierNameSnapshot} · {payable.title}
        </p>
      </div>

      <EditSupplierPaymentForm
        payable={{
          id: payable.id,
          currency: payable.currency,
          approvedAmount: Number(payable.approvedAmount),
          creditAmount: Number(payable.creditAmount),
        }}
        payment={{
          id: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          bankAccountId: payment.bankAccountId,
          paymentDate: payment.paymentDate.toISOString(),
          method: payment.method,
          reference: payment.reference,
          notes: payment.notes,
          hasProof: Boolean(proof),
          proofDocumentId: proof?.id ?? null,
          proofFileName: proof?.originalFileName ?? null,
          contractPaymentScheduleId: payment.contractPaymentScheduleId,
        }}
        bankAccounts={bankAccounts}
        contractInstallments={contractInstallments}
      />
    </div>
  );
}
