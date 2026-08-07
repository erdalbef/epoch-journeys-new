import Link from "next/link";

import SupplierForm from "@/components/admin/suppliers/SupplierForm";

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link href="/admin/suppliers" className="text-sm font-semibold text-[#001F3F]">
          ← Suppliers
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Create Supplier</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create the permanent CRM record first. Contacts, services, rates and contracts are added from the supplier profile.
        </p>
      </div>
      <SupplierForm />
    </div>
  );
}
