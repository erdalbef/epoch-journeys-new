"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  children: React.ReactNode;
};

export default function CreateExpenseForm({ children }: Props) {
  const router = useRouter();

  async function handleSubmit(
    event: React.SyntheticEvent<HTMLFormElement>,
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

    const paymentSource = String(
      formData.get("paymentSource") || "COMPANY_BANK",
    );

    const bankAccountId = String(
      formData.get("bankAccountId") || "",
    ).trim();

    const spenderName = String(
      formData.get("spenderName") || "",
    ).trim();

    if (!amount || amount <= 0) {
      toast.error(
        "Amount must be greater than zero.",
      );
      return;
    }

    if (
      paymentSource === "COMPANY_BANK" &&
      paymentStatus === "PAID" &&
      !bankAccountId
    ) {
      toast.error(
        "Select the company bank account used to pay this expense.",
      );
      return;
    }

    if (
      paymentSource !== "COMPANY_BANK" &&
      !spenderName
    ) {
      toast.error(
        "Enter the employee, accountable person, or owner who paid this expense.",
      );
      return;
    }

    /*
     * Personal-payment rules:
     *
     * - The supplier/vendor has already been paid by the person.
     * - No company-bank transaction is created at this stage.
     * - The reimbursement workflow records what the company owes
     *   back to the employee/accountable person or owner.
     */
    if (
      paymentSource === "EMPLOYEE_PERSONAL" ||
      paymentSource === "OWNER_PERSONAL"
    ) {
      formData.set(
        "paymentStatus",
        "PAID",
      );

      formData.delete(
        "bankAccountId",
      );

      formData.set(
        "reimbursable",
        "true",
      );

      const reimbursementStatus = String(
        formData.get("reimbursementStatus") ||
          "NOT_APPLICABLE",
      );

      if (
        reimbursementStatus ===
        "NOT_APPLICABLE"
      ) {
        formData.set(
          "reimbursementStatus",
          "PENDING",
        );
      }
    } else {
      formData.set(
        "reimbursable",
        "false",
      );

      formData.set(
        "reimbursementStatus",
        "NOT_APPLICABLE",
      );

      formData.set(
        "reimbursedAmount",
        "0",
      );

      formData.delete(
        "reimbursedAt",
      );

      formData.delete(
        "reimbursementReference",
      );
    }

    formData.set(
      "amount",
      String(amount),
    );

    formData.set(
      "currency",
      "EUR",
    );

    formData.set(
      "direction",
      "EXPENSE",
    );

    const endpoint =
      method === "PATCH" && expenseId
        ? `/api/admin/expenses/${expenseId}`
        : "/api/admin/expenses";

    try {
      const res = await fetch(endpoint, {
        method,
        body: formData,
      });

      const data =
        (await res
          .json()
          .catch(() => null)) as
          | {
              success?: boolean;
              error?: string;
            }
          | null;

      if (
        !res.ok ||
        !data?.success
      ) {
        toast.error(
          data?.error ||
            "Failed to save expense.",
        );
        return;
      }

      toast.success(
        method === "PATCH"
          ? "Expense updated successfully."
          : "Expense saved successfully.",
      );

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
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      {children}
    </form>
  );
}
