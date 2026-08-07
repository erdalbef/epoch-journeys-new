# Booking Detail Workflow Audit

## Core issue fixed
The Admin Booking Detail editor was submitting PATCH requests to `/api/admin/bookings/[id]`, but no route exists there. The implemented endpoint is `/api/admin/bookings/[id]/update-status`. This caused status/payment edits to fail at runtime. The client now calls the correct API.

## Admin passenger visibility
The admin booking detail now loads passenger records and shows completion count plus a compact passenger/rooming list.

## Existing strengths
- Admin detail already shows booking, financial, customer, tour/departure, rooming and operation summaries.
- B2B booking detail already has passenger list, room breakdown, payment submissions, recorded payments and voucher/payment actions.
- B2B booking ownership is enforced server-side.
- Operation Control is already separated into its own protected admin workflow.

## Later enhancements
- Admin passenger edit/delete controls.
- Dedicated rooming-list editor/export.
- Full booking amendment workflow.
