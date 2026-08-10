import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type SalesPdfData = {
  type: string;
  documentNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  recipientName: string;
  recipientCompany: string | null;
  recipientEmail: string | null;
  recipientEmailSecondary: string | null;
  recipientAddress: string | null;
  recipientCity: string | null;
  recipientPostalCode: string | null;
  recipientCountry: string | null;
  recipientTaxNumber: string | null;
  recipientVatNumber: string | null;
  issuerName: string;
  issuerAddress: string | null;
  issuerCountry: string | null;
  issuerVatNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  iban: string | null;
  swiftBic: string | null;
  bookingReference: string | null;
  groupName: string | null;
  tourTitle: string | null;
  departureDate: string | null;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  serviceEn: string;
  serviceBg: string;
  vatEn: string;
  vatBg: string;
  paymentEn: string;
  paymentBg: string;
  additionalNotes: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number | null;
    grossAmount: number;
  }[];
  logoDataUri?: string | null;
  fontRegular?: string | null;
  fontBold?: string | null;
};

export function registerSalesPdfFonts(
  regular?: string | null,
  bold?: string | null,
) {
  if (regular && bold) {
    Font.register({
      family: "EpochUnicode",
      fonts: [
        { src: regular, fontWeight: 400 },
        { src: bold, fontWeight: 700 },
      ],
    });
    return "EpochUnicode";
  }
  return "Helvetica";
}

const NAVY = "#001F3F";
const RED = "#8B0000";
const GOLD = "#B7791F";
const BORDER = "#D7DEE7";
const MUTED = "#64748B";
const LIGHT = "#F8FAFC";

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 32, fontSize: 8.5, color: "#1F2937", lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, marginBottom: 14, borderBottomWidth: 2, borderBottomColor: NAVY },
  brandBlock: { width: "47%", flexDirection: "row", alignItems: "flex-start" },
  logo: { width: 58, height: 58, objectFit: "contain", marginRight: 10 },
  companyBlock: { flex: 1, paddingTop: 2 },
  companyName: { fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 2 },
  companyText: { fontSize: 8, color: "#475569", marginBottom: 1 },
  documentBlock: { width: "51%", alignItems: "flex-end" },
  title: { fontSize: 12.5, fontWeight: 700, color: NAVY, textAlign: "right", marginBottom: 7 },
  documentNumber: { fontSize: 10, fontWeight: 700, color: RED, marginBottom: 3 },
  documentMeta: { fontSize: 8, color: "#475569", marginBottom: 2 },
  twoColumn: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  column: { width: "49%" },
  section: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 10, overflow: "hidden" },
  sectionHeader: { backgroundColor: LIGHT, borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 5, paddingHorizontal: 8 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: NAVY },
  sectionBody: { paddingVertical: 7, paddingHorizontal: 8 },
  text: { fontSize: 8.2, marginBottom: 2 },
  label: { fontWeight: 700, color: "#334155" },
  bulgarian: { marginTop: 5, color: "#334155" },
  table: { marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  tableHeader: { flexDirection: "row", backgroundColor: NAVY, color: "#FFFFFF", paddingVertical: 6, paddingHorizontal: 5 },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 5, borderTopWidth: 1, borderTopColor: BORDER, minHeight: 27, alignItems: "center" },
  descriptionColumn: { width: "46%", paddingRight: 5 },
  quantityColumn: { width: "9%", textAlign: "right" },
  unitPriceColumn: { width: "18%", textAlign: "right" },
  vatColumn: { width: "9%", textAlign: "right" },
  amountColumn: { width: "18%", textAlign: "right" },
  tableHeaderText: { fontSize: 7.5, fontWeight: 700 },
  tableText: { fontSize: 8 },
  financialArea: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  bankArea: { width: "53%" },
  summaryArea: { width: "43%", borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: "hidden" },
  summaryTitle: { backgroundColor: LIGHT, paddingVertical: 5, paddingHorizontal: 7, borderBottomWidth: 1, borderBottomColor: BORDER, color: NAVY, fontSize: 8.5, fontWeight: 700 },
  summaryBody: { paddingVertical: 5, paddingHorizontal: 7 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  summaryLabel: { fontSize: 8, color: "#475569" },
  summaryValue: { fontSize: 8, fontWeight: 700 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: NAVY, marginTop: 3, paddingTop: 5 },
  totalLabel: { fontSize: 10, fontWeight: 700, color: NAVY },
  totalValue: { fontSize: 10, fontWeight: 700, color: NAVY },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#FFF7ED", marginTop: 4, paddingVertical: 5, paddingHorizontal: 5, borderRadius: 3 },
  balanceLabel: { fontSize: 9, fontWeight: 700, color: RED },
  balanceValue: { fontSize: 9, fontWeight: 700, color: RED },
  noteSection: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 8, marginBottom: 8 },
  noteTitle: { fontSize: 9, fontWeight: 700, color: NAVY, marginBottom: 4 },
  noteEnglish: { fontSize: 8, marginBottom: 4 },
  noteBulgarian: { fontSize: 8, color: "#374151" },
  footer: { marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: BORDER, textAlign: "center", color: MUTED, fontSize: 7.5 },
  accentLine: { height: 2, backgroundColor: GOLD, marginBottom: 8 },
});

function documentTitle(type: string) {
  if (type === "INVOICE") return "INVOICE / ФАКТУРА";
  if (type === "CREDIT_NOTE") return "CREDIT NOTE / КРЕДИТНО ИЗВЕСТИЕ";
  return "PROFORMA INVOICE / ПРОФОРМА ФАКТУРА";
}

function currencySymbol(currency: string) {
  switch (currency.toUpperCase()) {
    case "EUR": return "€";
    case "USD": return "$";
    case "GBP": return "£";
    case "BGN": return "лв.";
    default: return currency.toUpperCase();
  }
}

function money(value: number, currency: string) {
  const symbol = currencySymbol(currency);
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return currency.toUpperCase() === "BGN" ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}

function recipientAddress(data: SalesPdfData) {
  return [data.recipientAddress, data.recipientCity, data.recipientPostalCode].filter(Boolean).join(", ");
}

function showGroupDetails(data: SalesPdfData) {
  return Boolean(data.bookingReference || data.groupName || data.tourTitle || data.departureDate);
}

export function SalesDocumentPdf({ data }: { data: SalesPdfData }) {
  const family = registerSalesPdfFonts(data.fontRegular, data.fontBold);
  const addressAlreadyContainsCountry = Boolean(
    data.issuerAddress && data.issuerCountry && data.issuerAddress.toLowerCase().includes(data.issuerCountry.toLowerCase()),
  );

  return (
    <Document>
      <Page size="A4" style={[styles.page, { fontFamily: family }]}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {data.logoDataUri ? <Image src={data.logoDataUri} style={styles.logo} /> : null}
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>{data.issuerName}</Text>
              {data.issuerAddress ? <Text style={styles.companyText}>{data.issuerAddress}</Text> : null}
              {data.issuerCountry && !addressAlreadyContainsCountry ? <Text style={styles.companyText}>{data.issuerCountry}</Text> : null}
              <Text style={styles.companyText}>VAT No: {data.issuerVatNumber || "-"}</Text>
            </View>
          </View>

          <View style={styles.documentBlock}>
            <Text style={styles.title}>{documentTitle(data.type)}</Text>
            <Text style={styles.documentNumber}>No / №: {data.documentNumber}</Text>
            <Text style={styles.documentMeta}>Date / Дата: {data.issueDate}</Text>
            <Text style={styles.documentMeta}>Due Date / Падеж: {data.dueDate || "-"}</Text>
          </View>
        </View>

        <View style={styles.accentLine} />

        <View style={styles.twoColumn}>
          <View style={[styles.section, showGroupDetails(data) ? styles.column : { width: "100%" }]}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Bill To / Получател</Text></View>
            <View style={styles.sectionBody}>
              <Text style={[styles.text, { fontWeight: 700 }]}>{data.recipientCompany || data.recipientName}</Text>
              {data.recipientCompany && data.recipientName ? <Text style={styles.text}>Contact: {data.recipientName}</Text> : null}
              {recipientAddress(data) ? <Text style={styles.text}>{recipientAddress(data)}</Text> : null}
              {data.recipientCountry ? <Text style={styles.text}>{data.recipientCountry}</Text> : null}
              {data.recipientEmail ? <Text style={styles.text}>{data.recipientEmail}</Text> : null}
              <Text style={styles.text}><Text style={styles.label}>Tax ID: </Text>{data.recipientTaxNumber || "-"}</Text>
              <Text style={styles.text}><Text style={styles.label}>VAT No: </Text>{data.recipientVatNumber || "-"}</Text>
            </View>
          </View>

          {showGroupDetails(data) ? (
            <View style={[styles.section, styles.column]}>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Group Details / Данни за групата</Text></View>
              <View style={styles.sectionBody}>
                <Text style={styles.text}><Text style={styles.label}>Booking Reference / Референция: </Text>{data.bookingReference || "-"}</Text>
                <Text style={styles.text}><Text style={styles.label}>Group Name / Име на група: </Text>{data.groupName || "-"}</Text>
                <Text style={styles.text}><Text style={styles.label}>Tour / Тур: </Text>{data.tourTitle || "-"}</Text>
                <Text style={styles.text}><Text style={styles.label}>Travel Date / Дата: </Text>{data.departureDate || "-"}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Service Description / Описание на услугата</Text></View>
          <View style={styles.sectionBody}>
            <Text style={styles.text}>{data.serviceEn}</Text>
            <Text style={[styles.text, styles.bulgarian]}>{data.serviceBg}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.descriptionColumn, styles.tableHeaderText]}>Description / Описание</Text>
            <Text style={[styles.quantityColumn, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.unitPriceColumn, styles.tableHeaderText]}>Unit Price</Text>
            <Text style={[styles.vatColumn, styles.tableHeaderText]}>VAT</Text>
            <Text style={[styles.amountColumn, styles.tableHeaderText]}>Amount</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={`${item.description}-${index}`} style={styles.tableRow}>
              <Text style={[styles.descriptionColumn, styles.tableText]}>{item.description}</Text>
              <Text style={[styles.quantityColumn, styles.tableText]}>{item.quantity}</Text>
              <Text style={[styles.unitPriceColumn, styles.tableText]}>{money(item.unitPrice, data.currency)}</Text>
              <Text style={[styles.vatColumn, styles.tableText]}>{item.taxRate ?? 0}%</Text>
              <Text style={[styles.amountColumn, styles.tableText]}>{money(item.grossAmount, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.financialArea}>
          <View style={[styles.section, styles.bankArea, { marginBottom: 0 }]}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Bank Details / Банкови данни</Text></View>
            <View style={styles.sectionBody}>
              <Text style={styles.text}><Text style={styles.label}>Bank: </Text>{data.bankName || "-"}</Text>
              <Text style={styles.text}><Text style={styles.label}>IBAN: </Text>{data.iban || "-"}</Text>
              <Text style={styles.text}><Text style={styles.label}>SWIFT / BIC: </Text>{data.swiftBic || "-"}</Text>
              <Text style={styles.text}><Text style={styles.label}>Account Name: </Text>{data.bankAccountName || "-"}</Text>
            </View>
          </View>

          <View style={styles.summaryArea}>
            <Text style={styles.summaryTitle}>Financial Summary / Финансова справка</Text>
            <View style={styles.summaryBody}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal / Междинна сума</Text><Text style={styles.summaryValue}>{money(data.subtotal, data.currency)}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>VAT / ДДС</Text><Text style={styles.summaryValue}>{money(data.taxTotal, data.currency)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL / ОБЩО</Text><Text style={styles.totalValue}>{money(data.totalAmount, data.currency)}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Paid / Платено</Text><Text style={styles.summaryValue}>{money(data.amountPaid, data.currency)}</Text></View>
              <View style={styles.balanceRow}><Text style={styles.balanceLabel}>BALANCE DUE / ОСТАТЪК</Text><Text style={styles.balanceValue}>{money(data.balance, data.currency)}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>VAT Note / ДДС</Text>
          <Text style={styles.noteEnglish}>{data.vatEn}</Text>
          <Text style={styles.noteBulgarian}>{data.vatBg}</Text>
        </View>

        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>Payment Reference / Основание за плащане</Text>
          <Text style={styles.noteEnglish}>{data.paymentEn}</Text>
          <Text style={styles.noteBulgarian}>{data.paymentBg}</Text>
        </View>

        {data.additionalNotes ? (
          <View style={styles.noteSection}>
            <Text style={styles.noteTitle}>Additional Information / Допълнителна информация</Text>
            <Text style={styles.noteEnglish}>{data.additionalNotes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>Thank you for your cooperation / Благодарим Ви за сътрудничеството.</Text>
      </Page>
    </Document>
  );
}
