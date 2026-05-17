"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  children: React.ReactNode;
};

export default function CreateExpenseForm({ children }: Props) {
  const router = useRouter();

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const method = String(formData.get("_method") || "POST");
    const expenseId = String(formData.get("expenseId") || "");

    const originalAmount = Number(formData.get("originalAmount") || 0);
    const originalCurrency = String(
      formData.get("originalCurrency") || "EUR"
    ).toUpperCase();
    const exchangeRateToBase = Number(
      formData.get("exchangeRateToBase") || 1
    );
    const baseCurrency = String(formData.get("baseCurrency") || "EUR").toUpperCase();
    const baseAmount = originalAmount * exchangeRateToBase;

    formData.set("originalAmount", String(originalAmount));
    formData.set("originalCurrency", originalCurrency);
    formData.set("exchangeRateToBase", String(exchangeRateToBase));
    formData.set("baseCurrency", baseCurrency);
    formData.set("baseAmount", String(baseAmount));

    formData.set("amount", String(originalAmount));
    formData.set("currency", originalCurrency);

    const endpoint =
      method === "PATCH" && expenseId
        ? `/api/admin/expenses/${expenseId}`
        : "/api/admin/expenses";

    try {
      const res = await fetch(endpoint, {
        method,
        body: formData,
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Failed to save finance entry.");
        return;
      }

      toast.success(
        method === "PATCH"
          ? "Finance entry updated successfully."
          : "Finance entry saved."
      );

      router.push("/admin/finance/expenses");
      router.refresh();
    } catch (error) {
      console.error("SAVE_FINANCE_ENTRY_CLIENT_ERROR", error);
      toast.error("Something went wrong while saving.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      {children}
    </form>
  );
}