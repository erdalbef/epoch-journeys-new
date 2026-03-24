import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  companyBlock: {
    width: "65%",
  },
  companyName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#001F3F",
    marginBottom: 4,
  },
  companySub: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 2,
  },
  voucherHeaderRight: {
    width: "35%",
    alignItems: "flex-end",
  },
  voucherTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B0000",
    marginBottom: 4,
    textAlign: "right",
  },
  voucherMeta: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 2,
    textAlign: "right",
  },
  logoBox: {
    marginBottom: 8,
    alignItems: "flex-end",
  },
  agencyLogo: {
    width: 90,
    height: 50,
  },
  section: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#001F3F",
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  item: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 8,
  },
  fullItem: {
    width: "100%",
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "bold",
  },
  noteBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 10,
    minHeight: 40,
  },
  noteText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
  },
  footer: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    fontSize: 9,
    color: "#6b7280",
  },
  footerLine: {
    marginBottom: 3,
  },
});

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number | null | undefined, currency = "EUR") {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "-";
  return value.replaceAll("_", " ");
}

type VoucherBooking = {
  bookingReference: string;
  status: string;
  paymentStatus: string;
  createdAt: Date | string;
  tourTitleSnapshot: string;
  departureDateSnapshot: Date | string;
  numberOfGuests: number;
  grossAmount: number;
  currency: string;
  agentNameSnapshot: string | null;
  agencyNameSnapshot: string | null;
  partnerTypeSnapshot: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  leadFirstName: string | null;
  leadLastName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
  singleRooms: number;
  doubleRooms: number;
  twinRooms: number;
  landOnly: boolean;
  needsFlights: boolean;
  notes: string | null;
  specialRequests: string | null;
  user?: {
    agentLogoUrl: string | null;
  } | null;
};

export async function generateVoucherPDF(booking: VoucherBooking) {
  const leadTraveler =
    [booking.leadFirstName, booking.leadLastName].filter(Boolean).join(" ") || "-";

  const Voucher = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>Epoch Journeys OOD</Text>
            <Text style={styles.companySub}>Booking Voucher</Text>
            <Text style={styles.companySub}>
              Professional B2B travel booking confirmation
            </Text>
          </View>

          <View style={styles.voucherHeaderRight}>
            {booking.user?.agentLogoUrl ? (
            <View style={styles.logoBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={booking.user.agentLogoUrl} style={styles.agencyLogo} />
              </View>
            ) : null}

            <Text style={styles.voucherTitle}>VOUCHER</Text>
            <Text style={styles.voucherMeta}>
              Ref: {booking.bookingReference}
            </Text>
            <Text style={styles.voucherMeta}>
              Issued: {formatDate(booking.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          <View style={styles.grid}>
            <View style={styles.item}>
              <Text style={styles.label}>Tour</Text>
              <Text style={styles.value}>{booking.tourTitleSnapshot}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Departure</Text>
              <Text style={styles.value}>
                {formatDate(booking.departureDateSnapshot)}
              </Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Guests</Text>
              <Text style={styles.value}>{booking.numberOfGuests}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Total Amount</Text>
              <Text style={styles.value}>
                {formatMoney(booking.grossAmount, booking.currency)}
              </Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Booking Status</Text>
              <Text style={styles.value}>{formatStatus(booking.status)}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Payment Status</Text>
              <Text style={styles.value}>
                {formatStatus(booking.paymentStatus)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agency / Agent</Text>
          <View style={styles.grid}>
            <View style={styles.item}>
              <Text style={styles.label}>Agency</Text>
              <Text style={styles.value}>{booking.agencyNameSnapshot || "-"}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Agent</Text>
              <Text style={styles.value}>{booking.agentNameSnapshot || "-"}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Partner Type</Text>
              <Text style={styles.value}>
                {formatStatus(booking.partnerTypeSnapshot)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client / Lead Traveler</Text>
          <View style={styles.grid}>
            <View style={styles.item}>
              <Text style={styles.label}>Client / Group Name</Text>
              <Text style={styles.value}>{booking.customerName || "-"}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Client Email</Text>
              <Text style={styles.value}>{booking.customerEmail || "-"}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Client Phone</Text>
              <Text style={styles.value}>{booking.customerPhone || "-"}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Lead Traveler</Text>
              <Text style={styles.value}>{leadTraveler}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Lead Email</Text>
              <Text style={styles.value}>{booking.leadEmail || "-"}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Lead Phone</Text>
              <Text style={styles.value}>{booking.leadPhone || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rooming & Services</Text>
          <View style={styles.grid}>
            <View style={styles.item}>
              <Text style={styles.label}>Single Rooms</Text>
              <Text style={styles.value}>{booking.singleRooms}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Double Rooms</Text>
              <Text style={styles.value}>{booking.doubleRooms}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Twin Rooms</Text>
              <Text style={styles.value}>{booking.twinRooms}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Land Only</Text>
              <Text style={styles.value}>{booking.landOnly ? "Yes" : "No"}</Text>
            </View>

            <View style={styles.item}>
              <Text style={styles.label}>Needs Flights</Text>
              <Text style={styles.value}>{booking.needsFlights ? "Yes" : "No"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Notes</Text>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{booking.notes || "-"}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 12, marginBottom: 8 }]}>
            Special Requests
          </Text>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{booking.specialRequests || "-"}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLine}>Epoch Journeys OOD</Text>
          <Text style={styles.footerLine}>
            This voucher confirms booking receipt and is subject to final operator confirmation and service terms.
          </Text>
          <Text style={styles.footerLine}>
            Please keep this voucher for your records and client file.
          </Text>
        </View>
      </Page>
    </Document>
  );

  return pdf(Voucher).toBuffer();
}