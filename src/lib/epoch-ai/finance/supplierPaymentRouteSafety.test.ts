import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const createRoute = readFileSync(
  fileURLToPath(new URL("../../../app/api/admin/supplier-payables/[id]/payments/route.ts", import.meta.url)), "utf8",
);
const editRoute = readFileSync(
  fileURLToPath(new URL("../../../app/api/admin/supplier-payables/[id]/payments/[paymentId]/route.ts", import.meta.url)), "utf8",
);

describe("Supplier-payment route safety invariants (source audit)", () => {
  it("serializes create and edit operations on the same payable", () => {
    for (const route of [createRoute, editRoute]) {
      expect(route).toContain('FROM "SupplierPayable"');
      expect(route).toContain("FOR UPDATE");
    }
  });
  it("rechecks available balance inside the create transaction", () => {
    expect(createRoute).toContain("amount.gt(currentPayable.balance)");
    expect(createRoute).toContain("currentPayable.amountPaid.plus(");
  });
  it("locks and checks linked ledgers before editing the payment", () => {
    expect(editRoute).toContain('FROM "BankTransaction"');
    expect(editRoute).toContain("ledger.statementLine !== null");
    expect(editRoute).toContain("ledger.reconciliationId !== null");
    expect(editRoute).toContain("ledger.reversals !== null");
    expect(editRoute.indexOf("const existingLedgers =")).toBeLessThan(
      editRoute.indexOf("const updatedPayment ="),
    );
  });
  it("rechecks the edit ceiling inside the transaction", () => {
    expect(editRoute).toContain("const concurrentOtherPayments =");
    expect(editRoute).toContain(".gt(currentNetApproved)");
  });
  it("keeps the supplier settlement and bank debit separated", () => {
    expect(createRoute).toContain("amount: resolvedPaymentAmounts.bankDebitAmount");
    expect(editRoute.match(/amount: resolvedPaymentAmounts.bankDebitAmount/g)).toHaveLength(2);
  });
});
