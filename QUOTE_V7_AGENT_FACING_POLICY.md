# Quote V7 — Agent-Facing NET Proposal Policy

## Commercial boundary
Agency-facing quote previews, PDFs, and emails may use only admin-approved **Final NET** rates.

They must never expose:
- supplier costs
- seasonal reference rates
- calculated NET/reference rates
- Epoch markup
- Epoch profit or margin
- internal costing notes

## Finalization gate
A draft quote cannot be finalized unless it has at least one group-size tier and every saved tier has positive approved Final NET Single, Double/Twin, and Triple rates. There is deliberately no fallback to calculated/internal rates.

## Agency wording
The proposal identifies prices as NET B2B rates and states that the travel agency determines its own resale price and markup.

## Data rule
`manualSinglePrice`, `manualDoubleTwinPrice`, and `manualTriplePrice` are treated as the approved Final NET values in the current V6/V7 data structure. The public PDF builders intentionally ignore the calculated fields.
