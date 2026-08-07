import Link from "next/link";
import { notFound } from "next/navigation";

import SupplierForm from "@/components/admin/suppliers/SupplierForm";
import { db } from "@/lib/db";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link href={`/admin/suppliers/${supplier.id}`} className="text-sm font-semibold text-[#001F3F]">
          ← {supplier.name}
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Edit Supplier</h1>
      </div>
      <SupplierForm initial={supplier} />
    </div>
  );
}
