'use client';

import { calculateQuote } from '@/lib/quotes/calculateQuote';
import type { QuoteInput } from '@/lib/quotes/types';

export default function DebugQuotePage() {
  const mockQuote: QuoteInput = {
    totalPassengers: 20,
    payingPassengers: 19,
    freePassengers: 1,
    doubleTwinPassengers: 18,
    singlePassengers: 2,
    triplePassengers: 0,
    nights: 5,
    pricingMode: 'BOTH',
    freeEnabled: true,
    freeCalculationMethod: 'SPREAD_ACROSS_PAYING_PASSENGERS',
    agencyCommissionPercent: 10,
    epochMarkupPercent: 20,
    lineItems: [
      {
        id: 'hotel',
        section: 'FIXED',
        type: 'HOTEL',
        calculationMethod: 'PER_OCCUPANCY_DIRECT',
        perPersonDoubleTwin: 400,
        perPersonSingle: 600,
        perPersonTriple: null,
      },
      {
        id: 'whisper',
        section: 'FIXED',
        type: 'WHISPER_SET',
        calculationMethod: 'PER_PERSON_X_DAYS',
        unitCost: 3,
        days: 5,
      },
      {
        id: 'lunch',
        section: 'FIXED',
        type: 'LUNCH',
        calculationMethod: 'PER_PERSON_X_QTY',
        unitCost: 20,
        quantity: 4,
      },
      {
        id: 'bus',
        section: 'VARIABLE',
        type: 'BUS',
        calculationMethod: 'SHARED_TOTAL',
        totalCost: 2000,
        divisorBasis: 'PAYING_PASSENGERS',
      },
      {
        id: 'guide',
        section: 'VARIABLE',
        type: 'GUIDE',
        calculationMethod: 'SHARED_DAILY',
        unitCost: 150,
        days: 5,
        divisorBasis: 'PAYING_PASSENGERS',
      },
      {
        id: 'city-tax',
        section: 'FIXED',
        type: 'CITY_TAX',
        calculationMethod: 'PER_PERSON_PER_NIGHT',
        unitCost: 3,
      },
      {
        id: 'flight',
        section: 'FLIGHT',
        type: 'PASSENGER_FLIGHT',
        calculationMethod: 'PER_PERSON',
        unitCost: 200,
      },
    ],
  };

  const result = calculateQuote(mockQuote);

  return (
    <div style={{ padding: 20 }}>
      <h1>Quote Debug Page</h1>

      <h2>Normalized Rows</h2>
      <pre>{JSON.stringify(result.normalizedRows, null, 2)}</pre>

      <h2>Totals</h2>
      <pre>{JSON.stringify(result.totals, null, 2)}</pre>

      <h2>Base Costs</h2>
      <pre>{JSON.stringify(result.baseCosts, null, 2)}</pre>

      <h2>Free Adjusted</h2>
      <pre>{JSON.stringify(result.freeAdjusted, null, 2)}</pre>

      <h2>Pricing</h2>
      <pre>{JSON.stringify(result.pricing, null, 2)}</pre>
    </div>
  );
}