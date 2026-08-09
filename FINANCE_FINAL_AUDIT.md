# Epoch Journeys Finance Module — Final Audit

## Final reporting set
- General Ledger
- Accounts Receivable
- Accounts Payable
- Expense Report
- Cash & Bank Report
- Refund Report
- Tour / Departure Profitability (P&L)
- Finance Management Summary

## Core operational finance areas present
- Bank accounts
- Bank ledger transactions
- Bank transfers
- Bank statements
- Bank reconciliation
- Customer payments / receivables
- Supplier payables and supplier payments
- Expenses
- Refunds
- Finance documents
- Tour/departure profitability

## Accounting rules used
1. Confirmed bookings are the recognized customer-revenue basis.
2. Booking `netAmount` is used as recognized revenue after agent commission.
3. Approved supplier payables are treated as supplier commitments.
4. Approved direct expenses are treated as direct tour costs.
5. Approved overhead expenses are separated from direct tour costs.
6. Refunds caused by cancellation, service failure, price adjustment, goodwill, etc. reduce revenue.
7. Overpayment and duplicate-payment refunds are treated as cash corrections, not a second revenue reduction.
8. Cash flow is based on POSTED bank transactions.
9. Internal bank transfers are excluded from management external cash flow.
10. OPENING_BALANCE transactions are excluded where `BankAccount.openingBalance` is already included, preventing double counting.
11. Profitability and cash movement remain separate concepts.
12. Multiple currencies are never silently added together.

## Final manual verification
Run:
- `npx prisma validate`
- `npx prisma generate`
- `npm run build`

Then open:
- `/admin/finance`
- `/admin/finance/reports`
- `/admin/finance/profitability`
- `/admin/finance/reports/management-summary`
- each existing report page
- bank statements and reconciliation pages

Verify:
- report links open
- empty states render
- filters work
- CSV exports download
- multi-currency amounts remain separated
- no cancelled records enter recognized totals
- no opening balance is double-counted
- internal transfers do not inflate external cash flow
- paid supplier/expense/refund records have expected bank ledger links
- statement matches and reconciliations are visible where expected

## Status
After a successful production build and the manual checks above, the Finance module can be treated as functionally complete for the current Epoch Journeys ERP scope.
