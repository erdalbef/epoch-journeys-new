# Supplier Payables UI

## Added
- `/admin/supplier-payables`
- `/admin/supplier-payables/new`
- `/admin/supplier-payables/[id]`
- Supplier payable creation API
- Approval workflow API
- Partial/full supplier payment API
- Admin Finance navigation entry

## Workflow
Draft → Pending Approval → Approved → Partial Payments → Paid

## Safeguards
- Supplier/service/rate ownership is verified server-side.
- Departure must belong to the selected tour.
- Payables cannot be paid before approval.
- Payment cannot exceed the outstanding balance.
- Bank-account currency must match payable currency.
- Payables with recorded payments cannot be cancelled.
- Supplier/rate data is snapshotted on payable creation.

## Important accounting boundary
This first pass records the bank account used for a supplier payment but does not change `BankAccount.currentBalance`.
That should be done only when we add a proper bank transaction/ledger model, to avoid silent or double accounting.
