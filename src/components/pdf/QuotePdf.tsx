'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

import type { QuoteCalculationResult } from '@/lib/quotes/calculateQuote'

export type QuotePdfDetails = {
  quoteTitle?: string
  agentName?: string
  clientName?: string
  destination?: string
  groupSize?: number | null
  travelDates?: string
  validUntil?: string
  notes?: string
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 30,
    fontSize: 10,
    color: '#0f172a',
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },

  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },

  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 10,
    color: '#475569',
  },

  quoteTitleWrap: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },

  quoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  quoteMeta: {
    marginTop: 4,
    fontSize: 9,
    color: '#64748b',
  },

  detailsSection: {
    marginTop: 16,
  },

  detailsGrid: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },

  detailsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  detailsRowLast: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  detailsLabel: {
    width: '35%',
    fontSize: 10,
    color: '#475569',
    fontWeight: 'bold',
  },

  detailsValue: {
    flex: 1,
    fontSize: 10,
    color: '#0f172a',
  },

  section: {
    marginTop: 16,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
    textTransform: 'uppercase',
  },

  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  colLabel: {
    flex: 1.8,
    fontSize: 10,
    color: '#334155',
  },

  colValue: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
    color: '#0f172a',
  },

  headerLabel: {
    flex: 1.8,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
    textTransform: 'uppercase',
  },

  headerValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#334155',
    textTransform: 'uppercase',
  },

  emphasisRow: {
    backgroundColor: '#f8fafc',
  },

  totalText: {
    fontWeight: 'bold',
  },

  pricingGrid: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },

  pricingHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },

  pricingRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  pricingRowLast: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  pricingCol1: {
    flex: 1.2,
    fontSize: 10,
    color: '#334155',
  },

  pricingCol2: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10,
    color: '#0f172a',
  },

  pricingCol3: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10,
    color: '#0f172a',
  },

  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
  },

  notesBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 10,
    fontSize: 10,
    color: '#334155',
  },
})

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function PricingTable({
  title,
  data,
}: {
  title: string
  data:
    | {
        doubleTwin: { sellingPrice: number | null | undefined }
        single: { sellingPrice: number | null | undefined }
        triple: { sellingPrice: number | null | undefined }
      }
    | null
    | undefined
}) {
  if (!data) return null

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.pricingGrid}>
        <View style={styles.pricingHeader}>
          <Text style={styles.pricingCol1}>Occupancy</Text>
          <Text style={styles.pricingCol2}>Selling Price</Text>
          <Text style={styles.pricingCol3}>Currency</Text>
        </View>

        <View style={styles.pricingRow}>
          <Text style={styles.pricingCol1}>Double / Twin</Text>
          <Text style={styles.pricingCol2}>{money(data.doubleTwin.sellingPrice)}</Text>
          <Text style={styles.pricingCol3}>EUR</Text>
        </View>

        <View style={styles.pricingRow}>
          <Text style={styles.pricingCol1}>Single</Text>
          <Text style={styles.pricingCol2}>{money(data.single.sellingPrice)}</Text>
          <Text style={styles.pricingCol3}>EUR</Text>
        </View>

        <View style={styles.pricingRowLast}>
          <Text style={styles.pricingCol1}>Triple</Text>
          <Text style={styles.pricingCol2}>{money(data.triple.sellingPrice)}</Text>
          <Text style={styles.pricingCol3}>EUR</Text>
        </View>
      </View>
    </View>
  )
}

export default function QuotePdf({
  summary,
  details,
}: {
  summary: QuoteCalculationResult
  details?: QuotePdfDetails
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Christian Pilgrimage Tours</Text>
          <Text style={styles.subtitle}>Professional Tour Quotation</Text>

          <View style={styles.quoteTitleWrap}>
            <Text style={styles.quoteTitle}>
              {details?.quoteTitle || 'Quotation Summary'}
            </Text>
            <Text style={styles.quoteMeta}>Prepared on {todayLabel()}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Quote Details</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Agent Name</Text>
              <Text style={styles.detailsValue}>{display(details?.agentName)}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Client Name</Text>
              <Text style={styles.detailsValue}>{display(details?.clientName)}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Destination</Text>
              <Text style={styles.detailsValue}>{display(details?.destination)}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Group Size</Text>
              <Text style={styles.detailsValue}>{display(details?.groupSize)}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Travel Dates</Text>
              <Text style={styles.detailsValue}>{display(details?.travelDates)}</Text>
            </View>

            <View style={styles.detailsRowLast}>
              <Text style={styles.detailsLabel}>Valid Until</Text>
              <Text style={styles.detailsValue}>{display(details?.validUntil)}</Text>
            </View>
          </View>

          {details?.notes ? (
            <View style={styles.notesBox}>
              <Text>{details.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Summary</Text>

          <View style={styles.card}>
            <View style={styles.tableHeader}>
              <Text style={styles.headerLabel}>Item</Text>
              <Text style={styles.headerValue}>Amount</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.colLabel}>Fixed Costs</Text>
              <Text style={styles.colValue}>{money(summary.totals.totalFixedCost)}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.colLabel}>Variable Costs</Text>
              <Text style={styles.colValue}>{money(summary.totals.totalVariableCost)}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.colLabel}>Flight Costs</Text>
              <Text style={styles.colValue}>{money(summary.totals.totalFlightCost)}</Text>
            </View>

            <View style={[styles.tableRowLast, styles.emphasisRow]}>
              <Text style={[styles.colLabel, styles.totalText]}>Total Tour Cost</Text>
              <Text style={[styles.colValue, styles.totalText]}>
                {money(summary.totals.totalTourCost)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base Cost Per Person</Text>

          <View style={styles.pricingGrid}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingCol1}>Occupancy</Text>
              <Text style={styles.pricingCol2}>Base Cost</Text>
              <Text style={styles.pricingCol3}>Currency</Text>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.pricingCol1}>Double / Twin</Text>
              <Text style={styles.pricingCol2}>{money(summary.baseCosts.doubleTwin)}</Text>
              <Text style={styles.pricingCol3}>EUR</Text>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.pricingCol1}>Single</Text>
              <Text style={styles.pricingCol2}>{money(summary.baseCosts.single)}</Text>
              <Text style={styles.pricingCol3}>EUR</Text>
            </View>

            <View style={styles.pricingRowLast}>
              <Text style={styles.pricingCol1}>Triple</Text>
              <Text style={styles.pricingCol2}>{money(summary.baseCosts.triple)}</Text>
              <Text style={styles.pricingCol3}>EUR</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Free-Adjusted Cost Per Person</Text>

          <View style={styles.pricingGrid}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingCol1}>Occupancy</Text>
              <Text style={styles.pricingCol2}>Adjusted Cost</Text>
              <Text style={styles.pricingCol3}>Currency</Text>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.pricingCol1}>Double / Twin</Text>
              <Text style={styles.pricingCol2}>{money(summary.freeAdjusted.doubleTwin)}</Text>
              <Text style={styles.pricingCol3}>EUR</Text>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.pricingCol1}>Single</Text>
              <Text style={styles.pricingCol2}>{money(summary.freeAdjusted.single)}</Text>
              <Text style={styles.pricingCol3}>EUR</Text>
            </View>

            <View style={styles.pricingRowLast}>
              <Text style={styles.pricingCol1}>Triple</Text>
              <Text style={styles.pricingCol2}>{money(summary.freeAdjusted.triple)}</Text>
              <Text style={styles.pricingCol3}>EUR</Text>
            </View>
          </View>
        </View>

        <PricingTable title="Land Only Selling Price" data={summary.pricing.landOnly} />
        <PricingTable title="Land + Air Selling Price" data={summary.pricing.landAndAir} />

        <View style={styles.footer}>
          <Text>
            This quotation is prepared for internal pricing and commercial review.
          </Text>
          <Text>
            Final selling prices may be subject to operational confirmation, supplier
            availability, and commercial approval.
          </Text>
        </View>
      </Page>
    </Document>
  )
}