# Epoch Journeys - B2B NET Group Quote Policy

## Commercial rule
Epoch Journeys quotes a NET rate to the travel agency. The travel agency decides its own resale price and markup. Standard pilgrimage group quotes do not calculate or add agent commission.

## Pricing hierarchy
1. Tour Starting Price - marketing reference only.
2. Tour Seasonal Rate - internal quote reference based on requested travel dates.
3. Calculated NET Rate - actual tour cost plus Epoch markup, calculated for each paying-passenger tier.
4. Final NET Rate - admin-approved agency rate; may override the calculated NET rate.
5. Booking Rate - snapshot of the accepted final NET quote and must not change when tour or seasonal rates later change.

## Group calculation rules
- Paying passengers = total travelers - complimentary travelers.
- True group costs (coach, guide, tour manager, transfers, etc.) are divided by paying passengers.
- Complimentary travelers add the variable costs they actually consume but do not duplicate true group costs.
- Group-size NET rates should be calculated independently for each tier because the group-cost divisor changes.
- Seasonal rates are references and must not silently overwrite a manually approved final NET rate.

## Agent-facing wording
All rates are NET to the travel agency. The travel agency determines its own resale price and markup.

## Internal profitability
NET revenue = final NET rate x paying passengers.
Epoch profit = NET revenue - total tour cost.
Margin % = Epoch profit / NET revenue x 100.
No agent commission deduction is used in the standard B2B NET workflow.
