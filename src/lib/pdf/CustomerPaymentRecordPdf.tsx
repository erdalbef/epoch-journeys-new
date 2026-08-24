import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type CustomerPaymentRecordPdfData = {
  recordTitle: string;
  paymentId: string;
  bookingReference: string;
  tourTitle: string;
  groupName: string | null;
  customerName: string | null;
  agencyName: string | null;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string | null;
  bankAccountName: string;
  receivedBy: string | null;
  notes: string | null;
  bookingTotal: number;
  amountPaidAfter: number;
  amountDueAfter: number;
  allocations: Array<{
    type: string;
    title: string;
    amount: number;
    dueDate: string;
  }>;
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 38,
    paddingBottom: 40,
    paddingLeft: 38,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#1f2937",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#8B0000",
    paddingBottom: 12,
    marginBottom: 18,
  },
  brand: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: "#001F3F",
  },
  brandLine: {
    marginTop: 3,
    fontSize: 8.5,
    color: "#6b7280",
  },
  title: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#8B0000",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 8.5,
    color: "#6b7280",
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#001F3F",
    marginBottom: 7,
  },
  box: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 5,
    padding: 10,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: 125,
    color: "#6b7280",
  },
  value: {
    flexGrow: 1,
    fontFamily: "Helvetica-Bold",
  },
  amountBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 5,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  amountLabel: {
    fontSize: 8.5,
    color: "#6b7280",
  },
  amountValue: {
    marginTop: 4,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#001F3F",
  },
  tableHeader: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingTop: 6,
    paddingBottom: 6,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: 6,
    paddingBottom: 6,
  },
  colType: {
    width: "22%",
    paddingHorizontal: 5,
  },
  colTitle: {
    width: "33%",
    paddingHorizontal: 5,
  },
  colDue: {
    width: "20%",
    paddingHorizontal: 5,
  },
  colAmount: {
    width: "25%",
    paddingHorizontal: 5,
    textAlign: "right",
  },
  headerCell: {
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8,
    color: "#6b7280",
    lineHeight: 1.45,
  },
});

export function CustomerPaymentRecordPdf({
  data,
}: {
  data: CustomerPaymentRecordPdfData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>EPOCH Journeys OOD</Text>
          <Text style={styles.brandLine}>
            Sofia, Bulgaria · VAT No. BG208727060
          </Text>

          <Text style={styles.title}>
            {data.recordTitle}
          </Text>

          <Text style={styles.subtitle}>
            Internal accounting support document for a customer payment
            received against a booking. This document is not a sales invoice.
          </Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>
            Amount Received
          </Text>
          <Text style={styles.amountValue}>
            {money(data.amount, data.currency)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Payment Details
          </Text>

          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.label}>Payment Date</Text>
              <Text style={styles.value}>
                {data.paymentDate}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>
                {label(data.paymentMethod)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Reference</Text>
              <Text style={styles.value}>
                {data.paymentReference || "-"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Receiving Account</Text>
              <Text style={styles.value}>
                {data.bankAccountName}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Recorded By</Text>
              <Text style={styles.value}>
                {data.receivedBy || "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Booking
          </Text>

          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.label}>Booking Reference</Text>
              <Text style={styles.value}>
                {data.bookingReference}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Tour</Text>
              <Text style={styles.value}>
                {data.tourTitle}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Group</Text>
              <Text style={styles.value}>
                {data.groupName || "-"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Customer / Leader</Text>
              <Text style={styles.value}>
                {data.customerName || "-"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Agency</Text>
              <Text style={styles.value}>
                {data.agencyName || "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Installment Allocation
          </Text>

          {data.allocations.length > 0 ? (
            <View style={styles.box}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colType, styles.headerCell]}>
                  Type
                </Text>
                <Text style={[styles.colTitle, styles.headerCell]}>
                  Installment
                </Text>
                <Text style={[styles.colDue, styles.headerCell]}>
                  Due Date
                </Text>
                <Text style={[styles.colAmount, styles.headerCell]}>
                  Allocated
                </Text>
              </View>

              {data.allocations.map((allocation, index) => (
                <View
                  key={`${allocation.type}-${allocation.title}-${index}`}
                  style={styles.tableRow}
                >
                  <Text style={styles.colType}>
                    {label(allocation.type)}
                  </Text>
                  <Text style={styles.colTitle}>
                    {allocation.title}
                  </Text>
                  <Text style={styles.colDue}>
                    {allocation.dueDate}
                  </Text>
                  <Text style={styles.colAmount}>
                    {money(allocation.amount, data.currency)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.box}>
              <Text>
                No payment schedule allocation was recorded. The receipt is
                treated as a customer advance for accounting classification.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Booking Balance After Receipt
          </Text>

          <View style={styles.box}>
            <View style={styles.row}>
              <Text style={styles.label}>Booking Total</Text>
              <Text style={styles.value}>
                {money(data.bookingTotal, data.currency)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Paid</Text>
              <Text style={styles.value}>
                {money(data.amountPaidAfter, data.currency)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Outstanding</Text>
              <Text style={styles.value}>
                {money(data.amountDueAfter, data.currency)}
              </Text>
            </View>
          </View>
        </View>

        {data.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.box}>
              <Text>{data.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>
            Payment Record ID: {data.paymentId}
          </Text>
          <Text>
            This document supports the accounting record of the customer
            receipt and should be read together with the corresponding bank
            ledger transaction and bank statement evidence.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
