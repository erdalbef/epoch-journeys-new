# Tours & Departures Audit — Core Completion Pass

## Fixed now
- Departure price updates now keep `price` and `priceDouble` synchronized. This is critical because current booking flows still read `departure.price`.
- `/api/tours/[id]/departures` now reads the correct `id` route parameter.
- Departure API now returns room pricing and seat inventory fields needed by booking/agent interfaces.
- Departure deletion is now blocked when the departure is linked to quotes, not only bookings.

## Already strong
- Tour list has search, status/category filters, pagination, bulk actions and dependency-aware deletion.
- Create/Edit share a substantial TourForm with images, map, brochure, inclusions/exclusions, highlights, accommodations and pricing types.
- Departure management supports seasons, Double/Twin pricing, single supplement, triple reduction, capacity, early discount and statuses.
- Capacity cannot be reduced below booked seats.
- Double/Twin price is locked once bookings exist.
- B2B tour pages restrict visibility to published tours.

## Mandatory item for Booking completion
`DepartureDate.bookedSeats` is currently not automatically incremented when bookings are created or released when a booking is cancelled. Until the Booking module is completed, seat inventory can drift from actual bookings. This should be fixed transactionally across all booking creation/status-change paths rather than patched manually here.

## Phase 2 improvements (not blockers)
- Separate Draft vs Archived instead of using `isPublished=false` for both concepts.
- Add richer departure search/calendar views and bulk date creation.
- Add explicit audit trail/versioning for price changes.
- Link supplier contracts/rates to tour and departure costing.
