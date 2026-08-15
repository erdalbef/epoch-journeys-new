# Quote V6 - Seasonal Reference and Final NET Policy

## Purpose
Seasonal rates are internal pricing references. They must never silently become the contractual rate sent to the travel agency.

## Three distinct numbers
1. Seasonal Reference NET: rate stored against the tour/date band.
2. Calculated NET: verified current costing plus Epoch markup.
3. Final NET: deliberate Admin-approved rate sent to the travel agency.

## Recommended rate
For each occupancy type, the UI recommends the higher of Seasonal Reference NET and Calculated NET. This is a safety benchmark, not an automatic contractual price.

## Admin controls
Admin may explicitly choose Use Calculated, Use Seasonal, or Use Recommended. Choosing one copies those values into Final Manual NET and switches the quote to Manual mode. Admin may then edit the final values.

## Important behavior
Loading/changing requested dates no longer overwrites Final NET rates. Seasonal rate changes remain visible as reference data until Admin deliberately applies them.

## B2B policy
All final rates are NET to the travel agency. The agency determines its own resale price and markup. Agent commission is not part of the standard quote calculation.
