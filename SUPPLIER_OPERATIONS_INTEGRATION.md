# Supplier CRM → Booking Operations Integration

This patch connects the existing Supplier CRM to Admin Booking Operation Control.

## Changed files
- `src/app/(admin)/admin/bookings/[id]/control/page.tsx`
- `src/app/(admin)/admin/bookings/[id]/control/BookingOperationControlForm.tsx`
- `src/app/api/admin/bookings/[id]/control/route.ts`

## Features
- CRM-first selection for Hotels, Transportation, Guides/Tour Managers, Restaurants, Churches/Mass Arrangements, and Tickets/Visits.
- Manual-entry fallback remains available.
- Selecting a CRM supplier populates name, location and primary contact.
- Compatible Supplier Services can be selected.
- Current contracted rates are displayed for reference.
- Operation JSON persists `supplierId`, `serviceId`, `supplierType`, and CRM/manual source.
- Existing operational items remain backward-compatible.
- No Prisma migration required.

## Important
Rates are reference-only in this pass. They do not yet create expenses, supplier payments, or quote-cost items automatically.
