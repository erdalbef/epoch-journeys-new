# Quote V8 — Accepted Quote to Booking

## Commercial rule
A booking may be created only from a quote explicitly marked **ACCEPTED**.

## Conversion rule
Conversion creates a permanent commercial snapshot. The booking does not depend on future edits to:
- tour starting prices;
- seasonal reference rates;
- quote calculation logic;
- tour itinerary/content;
- future quote versions.

## Snapshot locked into Booking
- Quote ID/reference/version and acceptance timestamp
- Requested start/end dates
- Paying and complimentary passenger basis
- All approved Final NET group-rate tiers
- Selected Final NET tier for the current paying-pax basis
- Single, Double/Twin and Triple NET rates
- Currency
- Inclusions/exclusions
- Payment policy
- Cancellation policy
- Offer/validity/terms notes
- Tour descriptive fields used at conversion

## Group-rate tier selection
For an accepted booking basis, V8 selects the highest approved pax tier that does not exceed the current paying-pax count. Example: 32 paying passengers use the 30-pax tier. If the group is below the smallest approved tier, the smallest tier is used and should be reviewed operationally.

## Requested dates
Pilgrimage group bookings do not require a fixed DepartureDate record. The accepted requested start/end dates are snapshotted directly into Booking.

## Duplicate protection
`Booking.quoteId` remains unique and conversion is checked again inside the database transaction. One accepted quote therefore creates one primary booking.

## NET B2B policy
Agent commission is not calculated. The booking snapshots Epoch Journeys' approved NET rate to the agency. The agency controls its own resale markup.
