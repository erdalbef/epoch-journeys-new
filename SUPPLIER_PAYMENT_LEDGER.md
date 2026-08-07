# Supplier Payment → Bank Ledger Integration

## What changes
When an approved supplier payable payment is recorded:
1. A `SupplierPayablePayment` is created.
2. A matching `BankTransaction` is created with:
   - type `SUPPLIER_PAYMENT`
   - direction `OUT`
   - the selected bank/cash account
   - the same amount and currency
   - links to Booking, Tour and Departure when available
3. The Supplier Payable balance/status is updated.

All three operations occur inside one Prisma database transaction.

## Safety
- A bank/cash account is now required for supplier payments.
- Account must be active.
- Account currency must match the payable currency.
- Payments cannot exceed outstanding balance.
- No `BankAccount.currentBalance` field is mutated here. Cash balance should be derived from ledger transactions until a formal bank-ledger reconciliation strategy is implemented.
