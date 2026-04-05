import type {
  QuoteCalculationResult,
  QuoteInput,
  QuoteLineItemInput,
  QuoteLineType,
} from '@/lib/quotes/types'

export type QuoteItemWriteInput = {
  itemType:
    | 'SERVICE'
    | 'ACCOMMODATION'
    | 'TRANSPORT'
    | 'GUIDE'
    | 'ACTIVITY'
    | 'FLIGHT'
    | 'FEE'
    | 'CUSTOM'
  title: string
  description?: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate?: number | null
  taxAmount: number
  total: number
  currency: string
  optional: boolean
  sortOrder: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function titleFromType(type: QuoteLineType): string {
  return type.replaceAll('_', ' ')
}

function mapType(type: QuoteLineType): QuoteItemWriteInput['itemType'] {
  if (type.includes('FLIGHT')) return 'FLIGHT'
  if (type === 'HOTEL' || type.includes('ACCOMMODATION')) return 'ACCOMMODATION'
  if (['BUS', 'TOLL', 'PARKING_FEES', 'FERRY'].includes(type)) return 'TRANSPORT'
  if (type.includes('GUIDE') || type.includes('TOUR_MANAGER')) return 'GUIDE'
  if (type.includes('TIPS') || type.includes('TAX')) return 'FEE'
  return 'SERVICE'
}

function description(row: QuoteCalculationResult['normalizedRows'][number]) {
  if (row.perPersonByOccupancy) {
    return [
      row.perPersonByOccupancy.doubleTwin && `DT: ${row.perPersonByOccupancy.doubleTwin}`,
      row.perPersonByOccupancy.single && `SGL: ${row.perPersonByOccupancy.single}`,
      row.perPersonByOccupancy.triple && `TPL: ${row.perPersonByOccupancy.triple}`,
    ]
      .filter(Boolean)
      .join(' | ')
  }

  if (row.uniformPerPerson !== null) {
    return `Per pax: ${row.uniformPerPerson}`
  }

  return undefined
}

function findSource(input: QuoteInput, id: string): QuoteLineItemInput | undefined {
  return input.lineItems.find((i) => i.id === id)
}

export function toQuoteItems(
  input: QuoteInput,
  result: QuoteCalculationResult,
  currency = 'EUR'
): QuoteItemWriteInput[] {
  return result.normalizedRows.map((row, i) => {
    const src = findSource(input, row.id)

    const total = round2(row.totalCost ?? 0)

    return {
      itemType: mapType(row.sourceType),
      title: src?.title || titleFromType(row.sourceType),
      description: description(row),
      quantity: 1,
      unitPrice: total,
      discountAmount: 0,
      taxRate: null,
      taxAmount: 0,
      total,
      currency,
      optional: false,
      sortOrder: i,
    }
  })
}