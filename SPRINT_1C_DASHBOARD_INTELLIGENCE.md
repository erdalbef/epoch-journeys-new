# Sprint 1C — Dashboard Intelligence

Adds management intelligence to the Admin Command Center without changing the Prisma schema.

## Added
- Six-month gross sales vs collected cash chart
- Collection-rate indicator
- Quote pipeline (Draft / Finalized / Sent / Converted)
- Current-month bookings, travelers and sales indicators
- Existing Sprint 1B operational priorities and departure controls retained

## Technical
- Uses the existing `recharts` dependency.
- Uses existing Booking and Quote fields only.
- No Prisma migration required.
- Permanently removes the payment aggregate `.catch()` typing workaround and uses `RECEIVED`.
