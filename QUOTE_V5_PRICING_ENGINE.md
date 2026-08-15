# Quote V5 - Verified NET Group Pricing Engine

## Commercial rule
Epoch Journeys quotes a NET B2B rate to the travel agency. Agent resale markup is outside Epoch's quote calculation.

## Passenger definitions
- `payingPassengers`: passengers whose payments recover the tour cost and Epoch margin.
- `freePassengers`: complimentary travelers travelling in addition to paying passengers.
- `totalTravelers = payingPassengers + freePassengers`.
- Group pricing tiers (20 / 25 / 30 / 35 / 40) always mean **paying passengers**.

## Cost rules
1. Hotel and other per-person services are incurred for each traveler who consumes them.
2. True group costs (coach, guide, tour manager, etc.) occur once and are divided by paying passengers.
3. Complimentary travelers add their variable cost but do not duplicate group costs.
4. Complimentary traveler hotel cost defaults to the double/twin basis.

For the double/twin basis:

`Cost PP = hotel PP + other variable PP + group costs / paying pax + free variable costs / paying pax`

where:

`free variable costs = free pax * (double/twin hotel PP + other variable PP)`

## NET rate
`Calculated NET PP = Cost PP * (1 + Epoch markup %)`

A manual final NET rate may override the calculated rate. The calculated rate remains visible internally as a reference.

## Profit
On the standard double/twin basis:
- `NET revenue = final NET PP * paying pax`
- `Profit = NET revenue - total tour cost`
- `Margin = Profit / NET revenue`

No agent commission is deducted because Epoch is quoting NET.

## Seasonal rates
Seasonal rates are reference rates used to seed/review a quote. They do not replace the costing engine and do not become contractual until saved as the final NET quote rate.
