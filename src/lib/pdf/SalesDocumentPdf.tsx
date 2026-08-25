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

  originalDocumentNumber: string | null;
  originalDocumentIssueDate: string | null;

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
        {
          src: regular,
          fontWeight: 400,
        },
        {
          src: bold,
          fontWeight: 700,
        },
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
const CREDIT_BG = "#FFF7ED";

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 48,
    paddingHorizontal: 28,
    fontSize: 7.8,
    color: "#1F2937",
    lineHeight: 1.25,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 8,
    marginBottom: 7,
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
  },

  brandBlock: {
    width: "48%",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  logo: {
    width: 48,
    height: 48,
    objectFit: "contain",
    marginRight: 8,
  },

  companyBlock: {
    flex: 1,
    paddingTop: 1,
  },

  companyName: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 2,
  },

  companyText: {
    fontSize: 7.3,
    color: "#475569",
    marginBottom: 1,
  },

  documentBlock: {
    width: "50%",
    alignItems: "flex-end",
  },

  title: {
    fontSize: 12.5,
    fontWeight: 700,
    color: NAVY,
    textAlign: "right",
    marginBottom: 4,
  },

  documentNumber: {
    fontSize: 9.5,
    fontWeight: 700,
    color: RED,
    marginBottom: 2,
  },

  documentMeta: {
    fontSize: 7.3,
    color: "#475569",
    marginBottom: 1,
  },

  creditReference: {
    marginTop: 3,
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: CREDIT_BG,
    borderRadius: 3,
    color: "#92400E",
    fontSize: 7.2,
    textAlign: "right",
  },

  accentLine: {
    height: 1.5,
    backgroundColor: GOLD,
    marginBottom: 7,
  },

  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  column: {
    width: "49%",
  },

  section: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    marginBottom: 6,
    overflow: "hidden",
  },

  sectionHeader: {
    backgroundColor: LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 3.5,
    paddingHorizontal: 6,
  },

  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: NAVY,
  },

  sectionBody: {
    paddingVertical: 5,
    paddingHorizontal: 6,
  },

  text: {
    fontSize: 7.4,
    marginBottom: 1.2,
  },

  label: {
    fontWeight: 700,
    color: "#334155",
  },

  bulgarian: {
    marginTop: 2.5,
    color: "#334155",
  },

  table: {
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    color: "#FFFFFF",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    minHeight: 22,
    alignItems: "center",
  },

  descriptionColumn: {
    width: "46%",
    paddingRight: 4,
  },

  quantityColumn: {
    width: "9%",
    textAlign: "right",
  },

  unitPriceColumn: {
    width: "18%",
    textAlign: "right",
  },

  vatColumn: {
    width: "9%",
    textAlign: "right",
  },

  amountColumn: {
    width: "18%",
    textAlign: "right",
  },

  tableHeaderText: {
    fontSize: 6.9,
    fontWeight: 700,
  },

  tableText: {
    fontSize: 7.2,
  },

  financialArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  bankArea: {
    width: "53%",
  },

  summaryArea: {
    width: "43%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    overflow: "hidden",
  },

  summaryTitle: {
    backgroundColor: LIGHT,
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    color: NAVY,
    fontSize: 7.7,
    fontWeight: 700,
  },

  summaryBody: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.7,
  },

  summaryLabel: {
    fontSize: 7.2,
    color: "#475569",
  },

  summaryValue: {
    fontSize: 7.2,
    fontWeight: 700,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: NAVY,
    marginTop: 2,
    paddingTop: 3,
  },

  totalLabel: {
    fontSize: 8.7,
    fontWeight: 700,
    color: NAVY,
  },

  totalValue: {
    fontSize: 8.7,
    fontWeight: 700,
    color: NAVY,
  },

  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: CREDIT_BG,
    marginTop: 2.5,
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderRadius: 3,
  },

  balanceLabel: {
    fontSize: 7.8,
    fontWeight: 700,
    color: RED,
  },

  balanceValue: {
    fontSize: 7.8,
    fontWeight: 700,
    color: RED,
  },

  noteSection: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 5,
  },

  noteTitle: {
    fontSize: 7.8,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 2,
  },

  noteEnglish: {
    fontSize: 7.1,
    marginBottom: 2,
  },

  noteBulgarian: {
    fontSize: 7.1,
    color: "#374151",
  },

  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 18,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    textAlign: "center",
    color: MUTED,
    fontSize: 6.8,
    lineHeight: 1.3,
  },
});

function documentTitle(type: string) {
  switch (type) {
    case "INVOICE":
      return "INVOICE / ФАКТУРА";

    case "PROFORMA":
      return "PROFORMA INVOICE / ПРОФОРМА ФАКТУРА";

    case "CREDIT_NOTE":
      return "CREDIT NOTE / КРЕДИТНО ИЗВЕСТИЕ";

    default:
      return type.replaceAll("_", " ").toUpperCase();
  }
}

function money(
  value: number,
  currency: string,
) {
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

export function SalesDocumentPdf({
  data,
}: {
  data: SalesPdfData;
}) {
  const fontFamily =
    registerSalesPdfFonts(
      data.fontRegular,
      data.fontBold,
    );

  const isCreditNote =
    data.type === "CREDIT_NOTE";

  const isProforma =
    data.type === "PROFORMA";

  const hasBookingDetails = Boolean(
    data.bookingReference ||
      data.groupName ||
      data.tourTitle ||
      data.departureDate,
  );

  const showPaymentReference =
    !isCreditNote &&
    Boolean(
      data.paymentEn ||
        data.paymentBg,
    );

  const showBankDetails =
    !isCreditNote &&
    Boolean(
      data.bankName ||
        data.iban ||
        data.swiftBic ||
        data.bankAccountName,
    );

  return (
    <Document>
      <Page
        size="A4"
        style={[
          styles.page,
          {
            fontFamily,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {data.logoDataUri ? (
              <Image
                src={data.logoDataUri}
                style={styles.logo}
              />
            ) : null}

            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>
                {data.issuerName}
              </Text>

              {data.issuerAddress ? (
                <Text style={styles.companyText}>
                  {data.issuerAddress}
                </Text>
              ) : null}

              {data.issuerCountry ? (
                <Text style={styles.companyText}>
                  {data.issuerCountry}
                </Text>
              ) : null}

              {data.issuerVatNumber ? (
                <Text style={styles.companyText}>
                  VAT No.: {data.issuerVatNumber}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.documentBlock}>
            <Text style={styles.title}>
              {documentTitle(data.type)}
            </Text>

            <Text style={styles.documentNumber}>
              No. {data.documentNumber}
            </Text>

            <Text style={styles.documentMeta}>
              Issue Date / Дата: {data.issueDate}
            </Text>

            {!isCreditNote &&
            data.dueDate ? (
              <Text style={styles.documentMeta}>
                Due Date / Падеж: {data.dueDate}
              </Text>
            ) : null}

            <Text style={styles.documentMeta}>
              Currency / Валута: {data.currency}
            </Text>

            {isCreditNote &&
            data.originalDocumentNumber ? (
              <View style={styles.creditReference}>
                <Text>
                  Original Invoice / Оригинална фактура:{" "}
                  {data.originalDocumentNumber}
                </Text>

                {data.originalDocumentIssueDate ? (
                  <Text>
                    Invoice Date / Дата на фактурата:{" "}
                    {data.originalDocumentIssueDate}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {isProforma ? (
              <Text
                style={[
                  styles.documentMeta,
                  {
                    marginTop: 3,
                    color: RED,
                    fontWeight: 700,
                  },
                ]}
              >
                Not a tax invoice / Не е данъчна фактура
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.accentLine} />

        <View style={styles.twoColumn}>
          <View
            style={[
              styles.section,
              styles.column,
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Bill To / Получател
              </Text>
            </View>

            <View style={styles.sectionBody}>
              <Text
                style={[
                  styles.text,
                  {
                    fontWeight: 700,
                  },
                ]}
              >
                {data.recipientCompany ||
                  data.recipientName}
              </Text>

              {data.recipientCompany ? (
                <Text style={styles.text}>
                  Contact / Лице за контакт:{" "}
                  {data.recipientName}
                </Text>
              ) : null}

              {data.recipientAddress ? (
                <Text style={styles.text}>
                  {data.recipientAddress}
                </Text>
              ) : null}

              {[
                data.recipientPostalCode,
                data.recipientCity,
                data.recipientCountry,
              ]
                .filter(Boolean)
                .join(" ") ? (
                <Text style={styles.text}>
                  {[
                    data.recipientPostalCode,
                    data.recipientCity,
                    data.recipientCountry,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              ) : null}

              {data.recipientTaxNumber ? (
                <Text style={styles.text}>
                  Tax ID / ЕИК:{" "}
                  {data.recipientTaxNumber}
                </Text>
              ) : null}

              {data.recipientVatNumber ? (
                <Text style={styles.text}>
                  VAT No. / ДДС №:{" "}
                  {data.recipientVatNumber}
                </Text>
              ) : null}

              {data.recipientEmail ? (
                <Text style={styles.text}>
                  Email: {data.recipientEmail}
                </Text>
              ) : null}

              {data.recipientEmailSecondary ? (
                <Text style={styles.text}>
                  CC: {data.recipientEmailSecondary}
                </Text>
              ) : null}
            </View>
          </View>

          {hasBookingDetails ? (
            <View
              style={[
                styles.section,
                styles.column,
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Booking Details / Данни за резервацията
                </Text>
              </View>

              <View style={styles.sectionBody}>
                <Text style={styles.text}>
                  <Text style={styles.label}>
                    Booking Reference / Референция:{" "}
                  </Text>
                  {data.bookingReference || "-"}
                </Text>

                <Text style={styles.text}>
                  <Text style={styles.label}>
                    Group Name / Име на групата:{" "}
                  </Text>
                  {data.groupName || "-"}
                </Text>

                <Text style={styles.text}>
                  <Text style={styles.label}>
                    Tour / Тур:{" "}
                  </Text>
                  {data.tourTitle || "-"}
                </Text>

                <Text style={styles.text}>
                  <Text style={styles.label}>
                    Travel Date / Дата на пътуване:{" "}
                  </Text>
                  {data.departureDate || "-"}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.section,
                styles.column,
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Document Details / Данни за документа
                </Text>
              </View>

              <View style={styles.sectionBody}>
                <Text style={styles.text}>
                  Document No.: {data.documentNumber}
                </Text>

                <Text style={styles.text}>
                  Issue Date: {data.issueDate}
                </Text>

                <Text style={styles.text}>
                  Currency: {data.currency}
                </Text>
              </View>
            </View>
          )}
        </View>

        {(data.serviceEn ||
          data.serviceBg) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Service Description / Описание на услугата
              </Text>
            </View>

            <View style={styles.sectionBody}>
              {data.serviceEn ? (
                <Text style={styles.text}>
                  {data.serviceEn}
                </Text>
              ) : null}

              {data.serviceBg ? (
                <Text
                  style={[
                    styles.text,
                    styles.bulgarian,
                  ]}
                >
                  {data.serviceBg}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text
              style={[
                styles.descriptionColumn,
                styles.tableHeaderText,
              ]}
            >
              Description / Описание
            </Text>

            <Text
              style={[
                styles.quantityColumn,
                styles.tableHeaderText,
              ]}
            >
              Qty
            </Text>

            <Text
              style={[
                styles.unitPriceColumn,
                styles.tableHeaderText,
              ]}
            >
              Unit Price
            </Text>

            <Text
              style={[
                styles.vatColumn,
                styles.tableHeaderText,
              ]}
            >
              VAT
            </Text>

            <Text
              style={[
                styles.amountColumn,
                styles.tableHeaderText,
              ]}
            >
              Amount
            </Text>
          </View>

          {data.items.map((item, index) => (
            <View
              key={`${item.description}-${index}`}
              style={styles.tableRow}
              wrap={false}
            >
              <Text
                style={[
                  styles.descriptionColumn,
                  styles.tableText,
                ]}
              >
                {item.description}
              </Text>

              <Text
                style={[
                  styles.quantityColumn,
                  styles.tableText,
                ]}
              >
                {item.quantity}
              </Text>

              <Text
                style={[
                  styles.unitPriceColumn,
                  styles.tableText,
                ]}
              >
                {money(
                  item.unitPrice,
                  data.currency,
                )}
              </Text>

              <Text
                style={[
                  styles.vatColumn,
                  styles.tableText,
                ]}
              >
                {item.taxRate ?? 0}%
              </Text>

              <Text
                style={[
                  styles.amountColumn,
                  styles.tableText,
                ]}
              >
                {money(
                  item.grossAmount,
                  data.currency,
                )}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={styles.financialArea}
          wrap={false}
        >
          {showBankDetails ? (
            <View
              style={[
                styles.section,
                styles.bankArea,
                {
                  marginBottom: 0,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Bank Details / Банкови данни
                </Text>
              </View>

              <View style={styles.sectionBody}>
                <Text style={styles.text}>
                  <Text style={styles.label}>
                    Bank:{" "}
                  </Text>
                  {data.bankName || "-"}
                </Text>

                <Text style={styles.text}>
                  <Text style={styles.label}>
                    IBAN:{" "}
                  </Text>
                  {data.iban || "-"}
                </Text>

                <Text style={styles.text}>
                  <Text style={styles.label}>
                    SWIFT / BIC:{" "}
                  </Text>
                  {data.swiftBic || "-"}
                </Text>

                <Text style={styles.text}>
                  <Text style={styles.label}>
                    Account Name:{" "}
                  </Text>
                  {data.bankAccountName || "-"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.bankArea} />
          )}

          <View style={styles.summaryArea}>
            <Text style={styles.summaryTitle}>
              {isCreditNote
                ? "Credit Summary / Кредитно известие"
                : "Financial Summary / Финансова справка"}
            </Text>

            <View style={styles.summaryBody}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Subtotal / Междинна сума
                </Text>

                <Text style={styles.summaryValue}>
                  {money(
                    data.subtotal,
                    data.currency,
                  )}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  VAT / ДДС
                </Text>

                <Text style={styles.summaryValue}>
                  {money(
                    data.taxTotal,
                    data.currency,
                  )}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {isCreditNote
                    ? "CREDIT AMOUNT"
                    : "TOTAL / ОБЩО"}
                </Text>

                <Text style={styles.totalValue}>
                  {money(
                    data.totalAmount,
                    data.currency,
                  )}
                </Text>
              </View>

              {!isCreditNote && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Paid / Платено
                    </Text>

                    <Text style={styles.summaryValue}>
                      {money(
                        data.amountPaid,
                        data.currency,
                      )}
                    </Text>
                  </View>

                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>
                      BALANCE DUE / ОСТАТЪК
                    </Text>

                    <Text style={styles.balanceValue}>
                      {money(
                        data.balance,
                        data.currency,
                      )}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {(data.vatEn ||
          data.vatBg) && (
          <View
            style={styles.noteSection}
            wrap={false}
          >
            <Text style={styles.noteTitle}>
              VAT Note / ДДС
            </Text>

            {data.vatEn ? (
              <Text style={styles.noteEnglish}>
                {data.vatEn}
              </Text>
            ) : null}

            {data.vatBg ? (
              <Text style={styles.noteBulgarian}>
                {data.vatBg}
              </Text>
            ) : null}
          </View>
        )}

        {showPaymentReference ? (
          <View
            style={styles.noteSection}
            wrap={false}
          >
            <Text style={styles.noteTitle}>
              Payment Reference / Основание за плащане
            </Text>

            {data.paymentEn ? (
              <Text style={styles.noteEnglish}>
                {data.paymentEn}
              </Text>
            ) : null}

            {data.paymentBg ? (
              <Text style={styles.noteBulgarian}>
                {data.paymentBg}
              </Text>
            ) : null}
          </View>
        ) : null}

        {data.additionalNotes ? (
          <View
            style={styles.noteSection}
            wrap={false}
          >
            <Text style={styles.noteTitle}>
              Additional Information / Допълнителна информация
            </Text>

            <Text style={styles.noteEnglish}>
              {data.additionalNotes}
            </Text>
          </View>
        ) : null}

        <Text
          style={styles.footer}
          fixed
        >
          Epoch Journeys · Thoughtfully Planned. Faithfully Delivered.
          {"\n"}
          Thank you for your cooperation / Благодарим Ви за сътрудничеството.
        </Text>
      </Page>
    </Document>
  );
}