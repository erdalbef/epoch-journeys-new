/* eslint-disable jsx-a11y/alt-text */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

type Props = ReturnType<
  typeof import("./buildAgentClientQuotePdfData").buildAgentClientQuotePdfData
>;

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.45,
  },

  headerWrap: {
    marginBottom: 18,
    borderBottom: "1.5px solid #D1D5DB",
    paddingBottom: 12,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },

  logoBox: {
    width: 120,
    minHeight: 55,
    justifyContent: "center",
  },

  logo: {
    width: 110,
    height: 55,
    objectFit: "contain",
  },

  agencyBlock: {
    flex: 1,
    alignItems: "flex-end",
  },

  agencyName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 3,
  },

  agencyText: {
    fontSize: 9,
    color: "#4B5563",
    textAlign: "right",
    marginBottom: 1,
  },

  docTitleWrap: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },

  docTitleBlock: {
    flex: 1,
  },

  docTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 10,
    color: "#4B5563",
  },

  metaBox: {
    minWidth: 170,
    border: "1px solid #D1D5DB",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#F9FAFB",
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },

  metaLabel: {
    fontSize: 9,
    color: "#6B7280",
  },

  metaValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },

  heroImage: {
    width: "100%",
    height: 180,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 14,
  },

  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    borderBottom: "1px solid #D1D5DB",
    paddingBottom: 4,
  },

  table: {
    border: "1px solid #D1D5DB",
    borderRadius: 4,
    overflow: "hidden",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottom: "1px solid #D1D5DB",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },

  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  colPax: {
    width: "16%",
  },

  colPrice: {
    width: "28%",
    textAlign: "right",
    fontSize: 9,
  },

  tableCell: {
    fontSize: 9,
    color: "#111827",
  },

  twoCol: {
    flexDirection: "row",
    gap: 14,
  },

  col: {
    flex: 1,
  },

  box: {
    border: "1px solid #D1D5DB",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },

  listItem: {
    marginBottom: 4,
    fontSize: 10,
  },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 30,
    right: 30,
    borderTop: "1px solid #D1D5DB",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  footerText: {
    fontSize: 8,
    color: "#6B7280",
  },

  small: {
    fontSize: 9,
    color: "#6B7280",
  },
});

function formatMoney(value: number | null | undefined, currency = "EUR") {
  const amount = typeof value === "number" ? value : 0;

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function renderMultilineText(text?: string | null) {
  if (!text?.trim()) {
    return <Text style={styles.small}>—</Text>;
  }

  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => (
      <Text key={index} style={styles.listItem}>
        • {line.trim()}
      </Text>
    ));
}

export default function AgentClientQuotePdfDocument(props: Props) {
  const {
    quoteNumber,
    quoteReference,
    title,
    clientDocumentTitle,
    recipientName,
    recipientEmail,
    currency,
    validUntil,

    agencyName,
    contactName,
    contactEmail,
    contactPhone,
    contactWebsite,
    agencyAddress,
    logoUrl,
    heroImageUrl,

    startDate,
    endDate,
    totalPassengers,
    freePassengers,
    payingPassengers,

    paxPricingRows,

    clientIncludes,
    clientExcludes,
    paymentPolicy,
    cancellationPolicy,
    clientOfferNotes,
    termsAndNotes,
  } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerWrap}>
          <View style={styles.headerTop}>
            <View style={styles.logoBox}>
              {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            </View>

            <View style={styles.agencyBlock}>
              <Text style={styles.agencyName}>{agencyName}</Text>
              {contactName ? <Text style={styles.agencyText}>{contactName}</Text> : null}
              {agencyAddress ? <Text style={styles.agencyText}>{agencyAddress}</Text> : null}
              {contactEmail ? <Text style={styles.agencyText}>{contactEmail}</Text> : null}
              {contactPhone ? <Text style={styles.agencyText}>{contactPhone}</Text> : null}
              {contactWebsite ? <Text style={styles.agencyText}>{contactWebsite}</Text> : null}
            </View>
          </View>

          <View style={styles.docTitleWrap}>
            <View style={styles.docTitleBlock}>
              <Text style={styles.docTitle}>
                {clientDocumentTitle || title || "Travel Proposal"}
              </Text>

              {recipientName ? (
                <Text style={styles.subtitle}>Prepared for: {recipientName}</Text>
              ) : null}

              {recipientEmail ? (
                <Text style={styles.subtitle}>{recipientEmail}</Text>
              ) : null}
            </View>

            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Quote Ref</Text>
                <Text style={styles.metaValue}>
                  {quoteReference || `Q-${quoteNumber}`}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Valid Until</Text>
                <Text style={styles.metaValue}>{formatDate(validUntil)}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Travel Dates</Text>
                <Text style={styles.metaValue}>
                  {startDate || endDate
                    ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                    : "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {heroImageUrl ? <Image src={heroImageUrl} style={styles.heroImage} /> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          <View style={styles.twoCol}>
            <View style={styles.box}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Total Passengers</Text>
                <Text style={styles.metaValue}>{totalPassengers ?? 0}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Free Passengers</Text>
                <Text style={styles.metaValue}>{freePassengers ?? 0}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Paying Passengers</Text>
                <Text style={styles.metaValue}>{payingPassengers ?? 0}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NET Group Rates</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colPax]}>Paying Pax</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Single</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Double/Twin</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Triple</Text>
            </View>

            {paxPricingRows.length > 0 ? (
              paxPricingRows.map((row, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colPax]}>
                    {row.paxCount}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPrice]}>
                    {formatMoney(row.singlePrice, currency)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPrice]}>
                    {formatMoney(row.doubleTwinPrice, currency)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPrice]}>
                    {formatMoney(row.triplePrice, currency)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>No passenger pricing available.</Text>
              </View>
            )}
          </View>
          <View style={[styles.box, { marginTop: 10 }]}>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
              NET B2B RATES: All prices in this proposal are net rates provided to the travel agency. The travel agency determines its own resale price and markup.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Included</Text>
              <View style={styles.box}>{renderMultilineText(clientIncludes)}</View>
            </View>

            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Not Included</Text>
              <View style={styles.box}>{renderMultilineText(clientExcludes)}</View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Payment Policy</Text>
              <View style={styles.box}>{renderMultilineText(paymentPolicy)}</View>
            </View>

            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Cancellation Policy</Text>
              <View style={styles.box}>{renderMultilineText(cancellationPolicy)}</View>
            </View>
          </View>
        </View>

        {clientOfferNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.box}>{renderMultilineText(clientOfferNotes)}</View>
          </View>
        ) : null}

        {termsAndNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <View style={styles.box}>{renderMultilineText(termsAndNotes)}</View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{agencyName}</Text>
          <Text style={styles.footerText}>Prepared for client use</Text>
        </View>
      </Page>
    </Document>
  );
}