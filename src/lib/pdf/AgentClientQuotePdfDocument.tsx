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

const NAVY = "#001F3F";
const RED = "#8B0000";
const SLATE = "#475569";
const BORDER = "#D7DEE8";
const LIGHT = "#F8FAFC";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 42,
    paddingHorizontal: 32,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.42,
  },

  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 120,
    height: 52,
    objectFit: "contain",
  },

  brandFallback: {
    fontSize: 19,
    fontWeight: "bold",
    color: NAVY,
    letterSpacing: 0.4,
  },

  brandSub: {
    marginTop: 3,
    fontSize: 8.5,
    color: SLATE,
  },

  proposalLabel: {
    fontSize: 10,
    color: RED,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },

  titleBlock: {
    flex: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 4,
  },

  metaBox: {
    width: 190,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    backgroundColor: LIGHT,
    padding: 9,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },

  metaLabel: {
    color: "#64748B",
    fontSize: 8.5,
  },

  metaValue: {
    color: NAVY,
    fontWeight: "bold",
    fontSize: 8.5,
    textAlign: "right",
  },

  preparedFor: {
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: RED,
    paddingLeft: 10,
  },

  preparedLabel: {
    fontSize: 8,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  preparedAgency: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "bold",
    color: NAVY,
  },

  preparedText: {
    marginTop: 2,
    fontSize: 9,
    color: "#334155",
  },

  heroImage: {
    width: "100%",
    height: 165,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 15,
  },

  section: {
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 4,
  },

  box: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },

  highlightBox: {
    borderWidth: 1,
    borderColor: "#B9DCC9",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#F1FAF5",
  },

  noteBox: {
    borderWidth: 1,
    borderColor: "#E5D3A2",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#FFFBEB",
  },

  twoCol: {
    flexDirection: "row",
    gap: 12,
  },

  col: {
    flex: 1,
  },

  infoGrid: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
  },

  infoRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#E9EEF4",
  },

  infoRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 9,
  },

  infoLabel: {
    width: "42%",
    color: "#64748B",
    fontWeight: "bold",
  },

  infoValue: {
    flex: 1,
    color: "#111827",
  },

  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },

  tableHeaderText: {
    fontSize: 8.5,
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  colPax: {
    width: "16%",
  },

  colPrice: {
    width: "28%",
    textAlign: "right",
  },

  optionalScope: {
    width: "17%",
  },

  optionalService: {
    width: "39%",
  },

  optionalBasis: {
    width: "22%",
  },

  optionalAmount: {
    width: "22%",
    textAlign: "right",
  },

  bodyText: {
    fontSize: 9.5,
    color: "#334155",
    lineHeight: 1.45,
  },

  listItem: {
    marginBottom: 4,
    fontSize: 9.5,
    color: "#334155",
  },

  paragraph: {
    marginBottom: 5,
    fontSize: 9.5,
    color: "#334155",
    lineHeight: 1.45,
  },

  itineraryList: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
  },

  itineraryRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#E9EEF4",
  },

  itineraryRowLast: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 9,
  },

  itineraryDate: {
    width: "29%",
    paddingRight: 8,
    color: NAVY,
    fontSize: 8.8,
    fontWeight: "bold",
  },

  itineraryDetails: {
    flex: 1,
    color: "#334155",
    fontSize: 9,
    lineHeight: 1.4,
  },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  footerBrand: {
    fontSize: 7.5,
    color: NAVY,
    fontWeight: "bold",
  },

  footerText: {
    fontSize: 7.2,
    color: "#64748B",
  },

  contactBlock: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },

  companyName: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 2,
  },

  companyContact: {
    fontSize: 8.2,
    color: "#475569",
    lineHeight: 1.35,
  },

  thankYouBox: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#D9C58F",
    backgroundColor: "#FFFCF4",
    borderRadius: 4,
    padding: 12,
    textAlign: "center",
  },

  thankYouTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 5,
  },

  thankYouText: {
    fontSize: 9.2,
    color: "#334155",
    lineHeight: 1.45,
  },

  motto: {
    marginTop: 7,
    fontSize: 8.8,
    color: RED,
    fontWeight: "bold",
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
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function quoteNumberLabel(quoteReference: string | null, quoteNumber: number) {
  if (quoteReference?.trim()) return quoteReference.trim();
  return `Q-${quoteNumber}`;
}

function pricingBasisLabel(value: string) {
  switch (value) {
    case "PER_PERSON":
      return "Per person";
    case "PER_VEHICLE":
      return "Per vehicle";
    case "GROUP_TOTAL":
      return "Group total";
    case "PER_SERVICE":
    default:
      return "Per service";
  }
}

function renderBulletText(text?: string | null) {
  if (!text?.trim()) {
    return <Text style={styles.bodyText}>-</Text>;
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => (
      <Text key={index} style={styles.listItem}>
        {line.startsWith("•") || line.startsWith("-") ? line : `• ${line}`}
      </Text>
    ));
}

function renderStructuredText(text?: string | null) {
  if (!text?.trim()) {
    return <Text style={styles.bodyText}>-</Text>;
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const looksLikeHeading =
        /^[0-9]+%\s/.test(line) ||
        /^[A-Z][A-Z &/-]{4,}$/.test(line) ||
        /:$/.test(line);

      return (
        <Text
          key={index}
          style={looksLikeHeading ? [styles.paragraph, { fontWeight: "bold", color: NAVY }] : styles.paragraph}
        >
          {line}
        </Text>
      );
    });
}

export default function AgentClientQuotePdfDocument(props: Props) {
  const {
    quoteNumber,
    quoteReference,
    issueDate,
    title,
    clientDocumentTitle,
    currency,
    validUntil,

    agencyName,
    contactName,
    contactEmail,
    logoUrl,
    heroImageUrl,

    companyName,
    companyAddress,
    companyVat,
    companyEmail,
    companyWebsite,
    companyPhone,

    startDate,
    endDate,
    totalPassengers,
    freePassengers,
    payingPassengers,

    paxPricingRows,
    complimentaryPolicy,
    briefItinerary,
    optionalHotels,
    optionalServices,

    clientIncludes,
    clientExcludes,
    paymentPolicy,
    cancellationPolicy,
    clientOfferNotes,
    termsAndNotes,
    availabilityNotes,
    nextStepNotes,
  } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandWrap}>
              {logoUrl ? (
                <Image src={logoUrl} style={styles.logo} />
              ) : (
                <View>
                  <Text style={styles.brandFallback}>EPOCH JOURNEYS</Text>
                  <Text style={styles.brandSub}>Pilgrimage & Group Travel</Text>
                </View>
              )}
            </View>

            <Text style={styles.proposalLabel}>Agency NET Proposal</Text>
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>
                {clientDocumentTitle || title || "Pilgrimage Proposal"}
              </Text>

              <View style={styles.preparedFor}>
                <Text style={styles.preparedLabel}>Prepared For</Text>
                <Text style={styles.preparedAgency}>{agencyName}</Text>
                {contactName ? <Text style={styles.preparedText}>{contactName}</Text> : null}
                {contactEmail ? <Text style={styles.preparedText}>{contactEmail}</Text> : null}
              </View>
            </View>

            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Quote No.</Text>
                <Text style={styles.metaValue}>
                  {quoteNumberLabel(quoteReference, quoteNumber)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Issue Date</Text>
                <Text style={styles.metaValue}>{formatDate(issueDate || new Date())}</Text>
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
                    : "-"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.contactBlock}>
            <Text style={styles.companyName}>
              {companyName}
            </Text>

            <Text style={styles.companyContact}>
              {companyAddress} | VAT {companyVat}
            </Text>

            <Text style={styles.companyContact}>
              {companyEmail} | {companyWebsite} | {companyPhone}
            </Text>
          </View>
        </View>

        {heroImageUrl ? <Image src={heroImageUrl} style={styles.heroImage} /> : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paying Pilgrims</Text>
              <Text style={styles.infoValue}>{payingPassengers ?? 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Complimentary Travelers</Text>
              <Text style={styles.infoValue}>{freePassengers ?? 0}</Text>
            </View>
            <View style={styles.infoRowLast}>
              <Text style={styles.infoLabel}>Total Travelers</Text>
              <Text style={styles.infoValue}>{totalPassengers ?? 0}</Text>
            </View>
          </View>
        </View>

        {briefItinerary.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Brief Itinerary</Text>

            <View style={styles.itineraryList}>
              {briefItinerary.map((item, index) => {
                const isLast =
                  index ===
                  briefItinerary.length - 1;

                return (
                  <View
                    key={`${item.dayNumber}-${index}`}
                    style={
                      isLast
                        ? styles.itineraryRowLast
                        : styles.itineraryRow
                    }
                    wrap={false}
                  >
                    <Text style={styles.itineraryDate}>
                      {item.dateLabel}
                    </Text>

                    <Text style={styles.itineraryDetails}>
                      {item.details}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text
              style={[
                styles.bodyText,
                {
                  marginTop: 6,
                  fontSize: 8.5,
                  color: "#64748B",
                },
              ]}
            >
              The sequence of visits may be adjusted for operational,
              liturgical, traffic, opening-hour, or supplier requirements.
            </Text>
          </View>
        ) : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>NET Rates to Travel Agency</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colPax]}>Paying Pax</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Single</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Double/Twin</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Triple</Text>
            </View>

            {paxPricingRows.length > 0 ? (
              paxPricingRows.map((row, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colPax}>{row.paxCount}</Text>
                  <Text style={styles.colPrice}>{formatMoney(row.singlePrice, currency)}</Text>
                  <Text style={styles.colPrice}>{formatMoney(row.doubleTwinPrice, currency)}</Text>
                  <Text style={styles.colPrice}>{formatMoney(row.triplePrice, currency)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.tableRow}>
                <Text>No passenger pricing available.</Text>
              </View>
            )}
          </View>

          <View style={[styles.highlightBox, { marginTop: 8 }]}>
            <Text style={styles.bodyText}>
              NET B2B RATES: Prices shown are net to the travel agency. The agency may determine its own resale price and markup.
            </Text>
          </View>
        </View>

        {complimentaryPolicy ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Complimentary Place Policy</Text>
            <View style={styles.highlightBox}>{renderStructuredText(complimentaryPolicy)}</View>
          </View>
        ) : null}

        {optionalHotels.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Pre / Post Stay Accommodation</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: "16%" }]}>Stay</Text>
                <Text style={[styles.tableHeaderText, { width: "34%" }]}>Hotel / Destination</Text>
                <Text style={[styles.tableHeaderText, { width: "16%", textAlign: "right" }]}>Single</Text>
                <Text style={[styles.tableHeaderText, { width: "18%", textAlign: "right" }]}>Double/Twin</Text>
                <Text style={[styles.tableHeaderText, { width: "16%", textAlign: "right" }]}>Triple</Text>
              </View>

              {optionalHotels.map((row, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={{ width: "16%" }}>{row.scope}</Text>
                  <Text style={{ width: "34%" }}>
                    {row.hotelName}{row.destination ? ` - ${row.destination}` : ""}
                    {row.nights > 0 ? ` (${row.nights} night${row.nights === 1 ? "" : "s"})` : ""}
                  </Text>
                  <Text style={{ width: "16%", textAlign: "right" }}>{formatMoney(row.singlePrice, currency)}</Text>
                  <Text style={{ width: "18%", textAlign: "right" }}>{formatMoney(row.doubleTwinPrice, currency)}</Text>
                  <Text style={{ width: "16%", textAlign: "right" }}>{formatMoney(row.triplePrice, currency)}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.bodyText, { marginTop: 6 }]}>Accommodation rates are per person for the stated number of nights.</Text>
          </View>
        ) : null}

        {optionalServices.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Pre / Post Stay Services</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.optionalScope]}>Stay</Text>
                <Text style={[styles.tableHeaderText, styles.optionalService]}>Service</Text>
                <Text style={[styles.tableHeaderText, styles.optionalBasis]}>Basis</Text>
                <Text style={[styles.tableHeaderText, styles.optionalAmount]}>Rate</Text>
              </View>

              {optionalServices.map((row, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.optionalScope}>{row.scope}</Text>
                  <Text style={styles.optionalService}>{row.label}</Text>
                  <Text style={styles.optionalBasis}>{pricingBasisLabel(row.pricingBasis)}</Text>
                  <Text style={styles.optionalAmount}>{formatMoney(row.amount, currency)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Rates Include</Text>
              <View style={styles.box}>{renderBulletText(clientIncludes)}</View>
            </View>

            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Rates Exclude</Text>
              <View style={styles.box}>{renderBulletText(clientExcludes)}</View>
            </View>
          </View>
        </View>

        {paymentPolicy ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            <View style={styles.box}>{renderStructuredText(paymentPolicy)}</View>
          </View>
        ) : null}

        {cancellationPolicy ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancellation Terms</Text>
            <View style={styles.noteBox}>{renderStructuredText(cancellationPolicy)}</View>
          </View>
        ) : null}

        {termsAndNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Important Conditions & Notes</Text>
            <View style={styles.box}>{renderStructuredText(termsAndNotes)}</View>
          </View>
        ) : null}

        {clientOfferNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.box}>{renderStructuredText(clientOfferNotes)}</View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Validity & Availability</Text>
          <View style={styles.box}>
            <Text style={styles.paragraph}>
              This quotation is valid until {formatDate(validUntil)}, subject to availability.
            </Text>
            {availabilityNotes ? renderStructuredText(availabilityNotes) : null}
          </View>
        </View>

        {nextStepNotes ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>How to Proceed</Text>
            <View style={styles.highlightBox}>{renderStructuredText(nextStepNotes)}</View>
          </View>
        ) : null}

        <View style={styles.thankYouBox} wrap={false}>
          <Text style={styles.thankYouTitle}>
            Thank You
          </Text>

          <Text style={styles.thankYouText}>
            Thank you for the opportunity to prepare this proposal. We look
            forward to working with you and welcoming your pilgrims on a
            meaningful, carefully planned, and smoothly operated journey.
          </Text>

          <Text style={styles.motto}>
            Epoch Journeys - Per Fidem, Per Excellentiam
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>
            EPOCH JOURNEYS | Agency NET Proposal | {companyWebsite}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
