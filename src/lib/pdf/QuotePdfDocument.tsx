import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

type QuotePdfItem = {
  id: string;
  title: string;
  description: string | null;
  itemType: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  optional: boolean;
  sortOrder: number;
};

type QuotePdfData = {
  id: string;
  quoteNumber: number;
  quoteReference: string | null;
  title: string | null;
  purpose: string;
  status: string;
  currency: string;
  recipientName: string | null;
  recipientEmail: string | null;
  internalNotes: string | null;
  termsAndNotes: string | null;
  validUntil: Date | string | null;
  createdAt: Date | string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  items: QuotePdfItem[];
  tour?: {
    title: string;
    category: string;
  } | null;
  departureDate?: {
    date: Date | string;
    season: string;
    status: string;
  } | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 34,
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.4,
  },
  brandBar: {
    height: 8,
    backgroundColor: "#8B0000",
    marginBottom: 18,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  companyBlock: {
    width: "55%",
  },
  quoteBlock: {
    width: "40%",
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#001F3F",
    marginBottom: 4,
  },
  companySub: {
    fontSize: 9,
    color: "#4B5563",
    marginBottom: 2,
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#001F3F",
    marginBottom: 6,
  },
  quoteMeta: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 2,
  },
  section: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#001F3F",
    marginBottom: 8,
  },
  twoCol: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontWeight: 700,
    color: "#111827",
  },
  table: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  cellTitle: {
    width: "40%",
    paddingRight: 8,
  },
  cellType: {
    width: "16%",
    paddingRight: 8,
  },
  cellQty: {
    width: "10%",
    textAlign: "right",
    paddingRight: 8,
  },
  cellUnit: {
    width: "17%",
    textAlign: "right",
    paddingRight: 8,
  },
  cellTotal: {
    width: "17%",
    textAlign: "right",
  },
  itemTitle: {
    fontWeight: 700,
    marginBottom: 2,
  },
  itemDesc: {
    color: "#6B7280",
    fontSize: 8,
  },
  totalsWrap: {
    marginTop: 12,
    marginLeft: "52%",
    width: "48%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
  },
  totalRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    fontSize: 11,
    fontWeight: 700,
    color: "#001F3F",
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 18,
    fontSize: 8,
    color: "#6B7280",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
});

function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

export default function QuotePdfDocument({
  quote,
}: {
  quote: QuotePdfData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar} />

        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>Christian Pilgrimage Tours</Text>
            <Text style={styles.companySub}>Professional Group & Faith Travel</Text>
            <Text style={styles.companySub}>Prepared quotation document</Text>
          </View>

          <View style={styles.quoteBlock}>
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.quoteMeta}>Quote #: {quote.quoteNumber}</Text>
            <Text style={styles.quoteMeta}>
              Reference: {quote.quoteReference || "-"}
            </Text>
            <Text style={styles.quoteMeta}>
              Date: {formatDate(quote.createdAt)}
            </Text>
            <Text style={styles.quoteMeta}>
              Valid Until: {formatDate(quote.validUntil)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Information</Text>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.field}>
                <Text style={styles.label}>Title: </Text>
                {quote.title || "-"}
              </Text>
              <Text style={styles.field}>
                <Text style={styles.label}>Purpose: </Text>
                {quote.purpose}
              </Text>
              <Text style={styles.field}>
                <Text style={styles.label}>Status: </Text>
                {quote.status}
              </Text>
              <Text style={styles.field}>
                <Text style={styles.label}>Currency: </Text>
                {quote.currency}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.field}>
                <Text style={styles.label}>Recipient: </Text>
                {quote.recipientName || "-"}
              </Text>
              <Text style={styles.field}>
                <Text style={styles.label}>Email: </Text>
                {quote.recipientEmail || "-"}
              </Text>
              <Text style={styles.field}>
                <Text style={styles.label}>Tour: </Text>
                {quote.tour?.title || "-"}
              </Text>
              <Text style={styles.field}>
                <Text style={styles.label}>Departure: </Text>
                {quote.departureDate
                  ? formatDate(quote.departureDate.date)
                  : "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Items</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellTitle}>Item</Text>
              <Text style={styles.cellType}>Type</Text>
              <Text style={styles.cellQty}>Qty</Text>
              <Text style={styles.cellUnit}>Unit Price</Text>
              <Text style={styles.cellTotal}>Total</Text>
            </View>

            {quote.items.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.cellTitle}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  ) : null}
                </View>

                <Text style={styles.cellType}>{item.itemType}</Text>
                <Text style={styles.cellQty}>{item.quantity}</Text>
                <Text style={styles.cellUnit}>
                  {formatMoney(item.unitPrice, quote.currency)}
                </Text>
                <Text style={styles.cellTotal}>
                  {formatMoney(item.total, quote.currency)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsWrap}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(quote.subtotal, quote.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>{formatMoney(quote.discountTotal, quote.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>{formatMoney(quote.taxTotal, quote.currency)}</Text>
            </View>
            <View style={styles.totalRowGrand}>
              <Text>Total</Text>
              <Text>{formatMoney(quote.totalAmount, quote.currency)}</Text>
            </View>
          </View>
        </View>

        {(quote.internalNotes || quote.termsAndNotes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>

            {quote.internalNotes ? (
              <Text style={{ marginBottom: 8 }}>
                <Text style={styles.label}>Internal Notes: </Text>
                {quote.internalNotes}
              </Text>
            ) : null}

            {quote.termsAndNotes ? (
              <Text>
                <Text style={styles.label}>Terms & Notes: </Text>
                {quote.termsAndNotes}
              </Text>
            ) : null}
          </View>
        )}

        <Text style={styles.footer}>
          Christian Pilgrimage Tours · Generated quotation document
        </Text>
      </Page>
    </Document>
  );
}