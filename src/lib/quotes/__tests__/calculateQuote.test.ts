import { describe, it, expect } from 'vitest';
import { calculateQuote } from '../calculateQuote';
import { QuoteInput } from '../types';

describe('calculateQuote', () => {
  it('calculates whisper set correctly', () => {
    const input: QuoteInput = {
      totalPassengers: 20,
      payingPassengers: 20,
      doubleTwinPassengers: 20,
      singlePassengers: 0,
      triplePassengers: 0,
      nights: 8,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'whisper',
          section: 'FIXED',
          type: 'WHISPER_SET',
          calculationMethod: 'PER_PERSON_X_DAYS',
          unitCost: 3,
          days: 8,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows[0].uniformPerPerson).toBe(24);
    expect(result.normalizedRows[0].totalCost).toBe(480);
  });

  it('calculates accommodation tax by occupancy correctly', () => {
    const input: QuoteInput = {
      totalPassengers: 6,
      payingPassengers: 6,
      doubleTwinPassengers: 2,
      singlePassengers: 1,
      triplePassengers: 3,
      nights: 5,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'acc-tax',
          section: 'FIXED',
          type: 'ACCOMMODATION_TAX',
          calculationMethod: 'PER_ROOM_PER_NIGHT',
          unitCost: 10,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows[0].perPersonByOccupancy?.doubleTwin).toBe(25);
    expect(result.normalizedRows[0].perPersonByOccupancy?.single).toBe(50);
    expect(result.normalizedRows[0].perPersonByOccupancy?.triple).toBe(16.67);
  });

  it('calculates shared bus correctly', () => {
    const input: QuoteInput = {
      totalPassengers: 20,
      payingPassengers: 20,
      doubleTwinPassengers: 20,
      singlePassengers: 0,
      triplePassengers: 0,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'bus',
          section: 'VARIABLE',
          type: 'BUS',
          calculationMethod: 'SHARED_TOTAL',
          totalCost: 2000,
          divisorBasis: 'PAYING_PASSENGERS',
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows[0].uniformPerPerson).toBe(100);
  });

  it('applies free spread across paying passengers', () => {
    const input: QuoteInput = {
      totalPassengers: 20,
      payingPassengers: 19,
      freePassengers: 1,
      doubleTwinPassengers: 20,
      singlePassengers: 0,
      triplePassengers: 0,
      pricingMode: 'LAND_ONLY',
      freeEnabled: true,
      freeCalculationMethod: 'SPREAD_ACROSS_PAYING_PASSENGERS',
      lineItems: [
        {
          id: 'entrance',
          section: 'FIXED',
          type: 'ENTRANCE',
          calculationMethod: 'PER_PERSON',
          unitCost: 100,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.baseCosts.uniform).toBe(100);
    expect(result.freeAdjusted.freeCostImpact).toBe(5.26);
    expect(result.freeAdjusted.doubleTwin).toBe(105.26);
  });

  it('calculates land and air selling', () => {
    const input: QuoteInput = {
      totalPassengers: 20,
      payingPassengers: 20,
      doubleTwinPassengers: 20,
      singlePassengers: 0,
      triplePassengers: 0,
      pricingMode: 'BOTH',
      agencyCommissionPercent: 10,
      epochMarkupPercent: 20,
      lineItems: [
        {
          id: 'base-hotel',
          section: 'FIXED',
          type: 'HOTEL',
          calculationMethod: 'PER_OCCUPANCY_DIRECT',
          perPersonDoubleTwin: 500,
          perPersonSingle: 500,
          perPersonTriple: 500,
        },
        {
          id: 'air',
          section: 'FLIGHT',
          type: 'PASSENGER_FLIGHT',
          calculationMethod: 'PER_PERSON',
          unitCost: 200,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.pricing.landOnly?.doubleTwin.net).toBe(500);
    expect(result.pricing.landOnly?.doubleTwin.sellingPrice).toBe(650);

    expect(result.pricing.landAndAir?.doubleTwin.net).toBe(700);
    expect(result.pricing.landAndAir?.doubleTwin.sellingPrice).toBe(910);
  });

  // NEW TESTS BELOW 👇

  it('calculates city tax per person per night', () => {
    const input: QuoteInput = {
      totalPassengers: 20,
      payingPassengers: 20,
      doubleTwinPassengers: 20,
      singlePassengers: 0,
      triplePassengers: 0,
      nights: 5,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'city-tax',
          section: 'FIXED',
          type: 'CITY_TAX',
          calculationMethod: 'PER_PERSON_PER_NIGHT',
          unitCost: 3,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows[0].uniformPerPerson).toBe(15);
    expect(result.normalizedRows[0].totalCost).toBe(300);
    expect(result.baseCosts.uniform).toBe(15);
    expect(result.freeAdjusted.doubleTwin).toBe(15);
  });

  it('calculates lunch quantity correctly', () => {
    const input: QuoteInput = {
      totalPassengers: 20,
      payingPassengers: 20,
      doubleTwinPassengers: 20,
      singlePassengers: 0,
      triplePassengers: 0,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'lunch',
          section: 'FIXED',
          type: 'LUNCH',
          calculationMethod: 'PER_PERSON_X_QTY',
          unitCost: 20,
          quantity: 4,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows[0].uniformPerPerson).toBe(80);
    expect(result.normalizedRows[0].totalCost).toBe(1600);
    expect(result.baseCosts.uniform).toBe(80);
  });

  it('calculates dinner quantity correctly', () => {
    const input: QuoteInput = {
      totalPassengers: 10,
      payingPassengers: 10,
      doubleTwinPassengers: 10,
      singlePassengers: 0,
      triplePassengers: 0,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'dinner',
          section: 'FIXED',
          type: 'DINNER',
          calculationMethod: 'PER_PERSON_X_QTY',
          unitCost: 25,
          quantity: 3,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows[0].uniformPerPerson).toBe(75);
    expect(result.normalizedRows[0].totalCost).toBe(750);
    expect(result.baseCosts.uniform).toBe(75);
  });

  it('ignores blank rows', () => {
    const input: QuoteInput = {
      totalPassengers: 10,
      payingPassengers: 10,
      doubleTwinPassengers: 10,
      singlePassengers: 0,
      triplePassengers: 0,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'blank',
          section: 'FIXED',
          type: 'ENTRANCE',
          calculationMethod: 'PER_PERSON',
          unitCost: null,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows).toHaveLength(0);
    expect(result.baseCosts.uniform).toBeNull();
  });

  it('treats zero as valid and null as missing', () => {
    const input: QuoteInput = {
      totalPassengers: 10,
      payingPassengers: 10,
      doubleTwinPassengers: 10,
      singlePassengers: 0,
      triplePassengers: 0,
      pricingMode: 'LAND_ONLY',
      lineItems: [
        {
          id: 'zero',
          section: 'FIXED',
          type: 'ENTRANCE',
          calculationMethod: 'PER_PERSON',
          unitCost: 0,
        },
        {
          id: 'missing',
          section: 'FIXED',
          type: 'LUNCH',
          calculationMethod: 'PER_PERSON_X_QTY',
          unitCost: null,
          quantity: 2,
        },
      ],
    };

    const result = calculateQuote(input);

    expect(result.normalizedRows[0].uniformPerPerson).toBe(0);
    expect(result.normalizedRows[1].uniformPerPerson).toBeNull();
    expect(result.baseCosts.uniform).toBe(0);
  });
});