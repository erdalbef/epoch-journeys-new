# Payments & Operation Control Audit

## Critical fixes
- Operation Control form was POSTing to an endpoint that only implemented DELETE. Added authenticated POST upsert logic.
- Operation status is now derived automatically as PENDING, IN_PROGRESS, or READY from confirmed operational items.
- Operation Control UI now checks API failures instead of always displaying "Saved".
- Deleting a non-cancelled booking now releases its reserved departure seats transactionally before deleting the booking.

## Payments review
- Admin payment creation validates amount, method, status, currency, and date.
- Payment creation calls the existing centralized booking payment recalculation helper.
- Payment schedules are created transactionally and recompute the booking payment summary.
- Existing payment allocation/locking routes remain intact.

## Phase 2
- Supplier CRM records should replace free-text supplier details in Operation Control where appropriate.
- Add operational deadlines/alerts and supplier confirmation references.
- Add richer audit history for booking amendments and payment corrections.
