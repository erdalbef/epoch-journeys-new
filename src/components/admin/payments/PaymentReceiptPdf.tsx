import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type PaymentReceiptPdfProps = {
  bookingReference: string;
  agentName: string;
  agentEmail: string;
  amount: number;
  currency: string;
  method: string;
  reviewedAt: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    color: "#001F3F",
  },
  section: {
    marginBottom: 10,
  },
  label: {
    fontWeight: 700,
  },
});

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export default function PaymentReceiptPdf({
  bookingReference,
  agentName,
  agentEmail,
  amount,
  currency,
  method,
  reviewedAt,
}: PaymentReceiptPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Epoch Journeys</Text>

        <View style={styles.section}>
          <Text>Payment Receipt</Text>
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Booking: </Text>
            {bookingReference}
          </Text>
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Agent: </Text>
            {agentName}
          </Text>
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Email: </Text>
            {agentEmail}
          </Text>
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Amount: </Text>
            {formatCurrency(amount, currency)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Method: </Text>
            {method}
          </Text>
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Approved: </Text>
            {reviewedAt}
          </Text>
        </View>
      </Page>
    </Document>
  );
}