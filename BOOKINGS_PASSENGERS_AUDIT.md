# Bookings & Passengers — Core Completion Pass

## Fixed
- B2B booking creation now reserves departure seats in the same database transaction as booking creation.
- Concurrent booking requests are protected from overselling departure capacity.
- Admin conversion of a custom request into a booking also reserves seats transactionally.
- Cancelling a booking releases its seats.
- Restoring a cancelled booking re-reserves seats and is blocked when capacity is no longer available.
- B2B passenger entry cannot create more passenger records than the booking's guest count.

## Still for later / Phase 2
- Full booking amendment workflow (changing guest count, departure, room mix).
- Passenger edit/delete UI and rooming-list management.
- Waitlist promotion workflow.
- More advanced inventory ledger/history rather than only a bookedSeats counter.
