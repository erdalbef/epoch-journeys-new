"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  children: React.ReactNode;
};

export default function CreateExpenseForm({
  children,
}: Props) {
  const router = useRouter();

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const method = String(
      formData.get("_method") || "POST",
    );

    const expenseId = String(
      formData.get("expenseId") || "",
    );

    const amount = Number(
      formData.get("amount") || 0,
    );

    const paymentStatus = String(
      formData.get("paymentStatus") || "PENDING",
    );

    const approvalStatus = String(
      formData.get("approvalStatus") || "DRAFT",
    );

    const bankAccountId = String(
      formData.get("bankAccountId") || "",
    );

    const paymentMethod = String(
      formData.get("paymentMethod") || "",
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error(
        "Amount must be greater than zero.",
      );
      return;
    }

    /*
     * PAID expenses create real cash movement.
     * Therefore the expense must be approved
     * and must identify the account/method used.
     */
    if (paymentStatus === "PAID") {
      if (approvalStatus !== "APPROVED") {
        toast.error(
          "A paid expense must be approved first.",
        );
        return;
      }

      if (!bankAccountId) {
        toast.error(
          "Please select the bank or cash account used to pay this expense.",
        );
        return;
      }

      if (!paymentMethod) {
        toast.error(
          "Please select the payment method.",
        );
        return;
      }
    }

    formData.set(
      "amount",
      String(amount),
    );

    /*
     * Preserve the selected currency.
     * Only default to EUR when the page
     * does not provide one.
     */
    const currency = String(
      formData.get("currency") || "EUR",
    )
      .trim()
      .toUpperCase();

    formData.set(
      "currency",
      currency || "EUR",
    );

    const endpoint =
      method === "PATCH" &&
      expenseId
        ? `/api/admin/expenses/${expenseId}`
        : "/api/admin/expenses";

    try {
      const response =
        await fetch(endpoint, {
          method,
          body: formData,
        });

      const data =
        (await response
          .json()
          .catch(() => null)) as {
          success?: boolean;
          error?: string;
          ledgerTransaction?: unknown;
        } | null;

      if (
        !response.ok ||
        !data?.success
      ) {
        toast.error(
          data?.error ||
            "Failed to save expense.",
        );

        return;
      }

      if (
        paymentStatus === "PAID"
      ) {
        toast.success(
          "Expense saved and payment posted to the Bank Ledger.",
        );
      } else {
        toast.success(
          method === "PATCH"
            ? "Expense updated successfully."
            : "Expense saved successfully.",
        );
      }

      router.push(
        "/admin/finance/expenses",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "SAVE_EXPENSE_CLIENT_ERROR",
        error,
      );

      toast.error(
        "Something went wrong while saving the expense.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-6"
    >
      {children}
    </form>
  );
}