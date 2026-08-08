import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseCostCenter,
  ExpenseCostType,
  ExpenseItem,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  FinanceTaxType,
  PaymentMethod,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import CreateExpenseForm from "./CreateExpenseForm";

const expenseCategories = Object.values(ExpenseCategory);
const expenseCostTypes = Object.values(ExpenseCostType);
const expenseItems = Object.values(ExpenseItem);
const expenseCostCenters = Object.values(ExpenseCostCenter);

const approvalStatuses = Object.values(
  ExpenseApprovalStatus,
);

const paymentStatuses = Object.values(
  ExpensePaymentStatus,
);

const financeDirections = Object.values(
  FinanceDirection,
);

const financeSourceTypes = Object.values(
  FinanceSourceType,
);

const financeTaxTypes = Object.values(
  FinanceTaxType,
);

const paymentMethods = Object.values(
  PaymentMethod,
);

function formatEnumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(value);
}

export default async function AdminCreateExpensePage() {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const [
    tours,
    bookings,
    departures,
    partnerCompanies,
    suppliers,
    bankAccounts,
  ] = await Promise.all([
    db.tour.findMany({
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
        tourCode: true,
      },
    }),

    db.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      select: {
        id: true,
        bookingDisplayCode: true,
        bookingReference: true,
        agentNameSnapshot: true,
        tourTitleSnapshot: true,
      },
    }),

    db.departureDate.findMany({
      orderBy: {
        date: "desc",
      },
      take: 200,
      select: {
        id: true,
        date: true,
        tourId: true,
        tour: {
          select: {
            title: true,
          },
        },
      },
    }),

    db.partnerCompany.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),

    db.supplier.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [
        {
          preferred: "desc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        preferred: true,
        city: true,
        country: true,
      },
    }),

    db.bankAccount.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
            Finance / Expense Management
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Add Expense
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Record direct tour costs or
            company overhead, allocate
            expenses to operations, attach
            supplier documents and record
            actual cash payments.
          </p>
        </div>

        <Link
          href="/admin/finance/expenses"
          className="inline-flex w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          ← Back to Expenses
        </Link>
      </div>

      <CreateExpenseForm>
        <div className="space-y-6">
          {/* ========================================= */}
          {/* CLASSIFICATION */}
          {/* ========================================= */}

          <ExpenseSection
            title="Expense Classification"
            description="Define exactly what kind of cost this is. This classification will later drive tour profitability and management reporting."
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Cost Type *">
                <select
                  name="costType"
                  defaultValue="DIRECT_TOUR_COST"
                  required
                  className={inputClass}
                >
                  {expenseCostTypes.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {formatEnumLabel(
                          item,
                        )}
                      </option>
                    ),
                  )}
                </select>

                <HelpText>
                  Use Direct Tour Cost for
                  costs attributable to a
                  specific tour, departure or
                  booking. Use Overhead for
                  general company expenses.
                </HelpText>
              </Field>

              <Field label="Detailed Expense Item">
                <select
                  name="expenseItem"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Select detailed item...
                  </option>

                  {expenseItems.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {formatEnumLabel(
                          item,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Cost Center">
                <select
                  name="costCenter"
                  defaultValue="TOUR_OPERATIONS"
                  className={inputClass}
                >
                  <option value="">
                    No cost center
                  </option>

                  {expenseCostCenters.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {formatEnumLabel(
                          item,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Broad Category *">
                <select
                  name="category"
                  required
                  defaultValue={
                    expenseCategories[0]
                  }
                  className={inputClass}
                >
                  {expenseCategories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {formatEnumLabel(
                          category,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                label="Title *"
                className="xl:col-span-2"
              >
                <input
                  name="title"
                  required
                  placeholder="Example: Lunch in Krakow – 28 passengers"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-950">
                Detailed tour-cost examples
              </p>

              <p className="mt-2 text-sm leading-6 text-blue-800">
                Tour Manager · Local Guide ·
                Driver · Coach / Bus · Private
                Transfer · Flight · Train ·
                Ferry · Boat Trip / Cruise ·
                Breakfast · Lunch · Dinner ·
                Refreshments · Entrance Fees ·
                Tickets · Mass Arrangement ·
                Church / Shrine Donation ·
                Priest / Celebrant Offering ·
                Staff · Staff Meals · Staff
                Accommodation · Hospitality /
                Treats · Tips / Gratuities.
              </p>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* CORE FINANCE */}
          {/* ========================================= */}

          <ExpenseSection
            title="Finance Information"
            description="Basic accounting classification and transaction date."
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Direction *">
                <select
                  name="direction"
                  defaultValue="EXPENSE"
                  required
                  className={inputClass}
                >
                  {financeDirections.map(
                    (direction) => (
                      <option
                        key={direction}
                        value={direction}
                      >
                        {formatEnumLabel(
                          direction,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Source Type *">
                <select
                  name="sourceType"
                  defaultValue="INTERNAL"
                  required
                  className={inputClass}
                >
                  {financeSourceTypes.map(
                    (sourceType) => (
                      <option
                        key={sourceType}
                        value={sourceType}
                      >
                        {formatEnumLabel(
                          sourceType,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Expense Date *">
                <input
                  name="expenseDate"
                  type="date"
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Currency *">
                <select
                  name="currency"
                  defaultValue="EUR"
                  required
                  className={inputClass}
                >
                  <option value="EUR">
                    EUR
                  </option>

                  <option value="USD">
                    USD
                  </option>

                  <option value="GBP">
                    GBP
                  </option>

                  <option value="PLN">
                    PLN
                  </option>

                  <option value="TRY">
                    TRY
                  </option>
                </select>
              </Field>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* AMOUNTS */}
          {/* ========================================= */}

          <ExpenseSection
            title="Amount"
            description="Enter the expense amount and optional foreign-currency accounting values."
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Expense Amount *">
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className={inputClass}
                />
              </Field>

              <Field label="Original Amount">
                <input
                  name="originalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  className={inputClass}
                />
              </Field>

              <Field label="Original Currency">
                <input
                  name="originalCurrency"
                  defaultValue="EUR"
                  maxLength={3}
                  className={inputClass}
                />
              </Field>

              <Field label="Exchange Rate to Base">
                <input
                  name="exchangeRateToBase"
                  type="number"
                  step="0.000001"
                  min="0"
                  defaultValue="1"
                  className={inputClass}
                />
              </Field>

              <Field label="Base Currency">
                <input
                  name="baseCurrency"
                  defaultValue="EUR"
                  maxLength={3}
                  className={inputClass}
                />
              </Field>

              <Field label="Base Amount">
                <input
                  name="baseAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  className={inputClass}
                />
              </Field>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* SUPPLIER */}
          {/* ========================================= */}

          <ExpenseSection
            title="Supplier / Vendor"
            description="Prefer linking the expense to Supplier CRM. Manual vendor entry remains available for one-off costs."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Supplier CRM">
                <select
                  name="supplierId"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Not linked to Supplier CRM
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.preferred
                          ? "★ "
                          : ""}
                        {supplier.name}
                        {" · "}
                        {formatEnumLabel(
                          supplier.type,
                        )}
                        {supplier.city
                          ? ` · ${supplier.city}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Manual Vendor / Payee">
                <input
                  name="vendorName"
                  placeholder="Use for one-off vendors or payees"
                  className={inputClass}
                />
              </Field>

              <Field label="Supplier Invoice Number">
                <input
                  name="supplierInvoiceNumber"
                  placeholder="Invoice / receipt number"
                  className={inputClass}
                />
              </Field>

              <Field label="Invoice Date">
                <input
                  name="invoiceDate"
                  type="date"
                  className={inputClass}
                />
              </Field>

              <Field label="Due Date">
                <input
                  name="dueDate"
                  type="date"
                  className={inputClass}
                />
              </Field>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* APPROVAL & PAYMENT */}
          {/* ========================================= */}

          <ExpenseSection
            title="Approval & Payment"
            description="Only approved and paid expenses create actual cash movement in the Bank Ledger."
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Approval Status *">
                <select
                  name="approvalStatus"
                  defaultValue="DRAFT"
                  required
                  className={inputClass}
                >
                  {approvalStatuses.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {formatEnumLabel(
                          status,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Payment Status *">
                <select
                  name="paymentStatus"
                  defaultValue="PENDING"
                  required
                  className={inputClass}
                >
                  {paymentStatuses.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {formatEnumLabel(
                          status,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Payment Method">
                <select
                  name="paymentMethod"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Not paid yet
                  </option>

                  {paymentMethods.map(
                    (method) => (
                      <option
                        key={method}
                        value={method}
                      >
                        {formatEnumLabel(
                          method,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Paid From Bank / Cash Account">
                <select
                  name="bankAccountId"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Select when expense is paid...
                  </option>

                  {bankAccounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                        {" · "}
                        {account.currency}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Paid Date">
                <input
                  name="paidAt"
                  type="date"
                  className={inputClass}
                />
              </Field>

              <Field label="Payment Reference">
                <input
                  name="paymentReference"
                  placeholder="Bank reference / transaction ID"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Bank Ledger rule
              </p>

              <p className="mt-1 text-sm text-amber-800">
                To save an expense as
                <strong> Paid</strong>, set
                Approval Status to
                <strong> Approved</strong>,
                select the payment method and
                select the bank/cash account
                used. The system will then
                create an
                <strong>
                  {" "}
                  EXPENSE PAYMENT / OUT
                </strong>{" "}
                transaction automatically.
              </p>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* TOUR / OPERATION ALLOCATION */}
          {/* ========================================= */}

          <ExpenseSection
            title="Tour / Operation Allocation"
            description="Link direct costs to the appropriate tour, departure or booking so profitability can be calculated later."
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Tour">
                <select
                  name="tourId"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Not linked
                  </option>

                  {tours.map((tour) => (
                    <option
                      key={tour.id}
                      value={tour.id}
                    >
                      {tour.tourCode
                        ? `${tour.tourCode} — ${tour.title}`
                        : tour.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Departure">
                <select
                  name="departureDateId"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Not linked
                  </option>

                  {departures.map(
                    (departure) => (
                      <option
                        key={
                          departure.id
                        }
                        value={
                          departure.id
                        }
                      >
                        {
                          departure
                            .tour.title
                        }
                        {" — "}
                        {formatDate(
                          departure.date,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Booking">
                <select
                  name="bookingId"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Not linked
                  </option>

                  {bookings.map(
                    (booking) => (
                      <option
                        key={booking.id}
                        value={
                          booking.id
                        }
                      >
                        {booking.bookingDisplayCode ||
                          booking.bookingReference}
                        {" — "}
                        {booking.tourTitleSnapshot ||
                          "Untitled Tour"}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Partner Company Record">
                <select
                  name="partnerCompanyId"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    Not linked
                  </option>

                  {partnerCompanies.map(
                    (partner) => (
                      <option
                        key={partner.id}
                        value={
                          partner.id
                        }
                      >
                        {partner.name}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Partner Company Name">
                <input
                  name="partnerCompanyName"
                  placeholder="Partner company"
                  className={inputClass}
                />
              </Field>

              <Field label="Client Company">
                <input
                  name="clientCompanyName"
                  placeholder="Client / corporate account"
                  className={inputClass}
                />
              </Field>

              <Field label="Agent / Travel Advisor">
                <input
                  name="agentNameSnapshot"
                  placeholder="Agent or travel advisor"
                  className={inputClass}
                />
              </Field>

              <Field label="Tour Leader">
                <input
                  name="tourLeaderName"
                  placeholder="Tour leader / priest / group leader"
                  className={inputClass}
                />
              </Field>

              <Field label="Spender / Cash Holder">
                <input
                  name="spenderName"
                  placeholder="Staff, tour manager, guide..."
                  className={inputClass}
                />
              </Field>

              <Field label="Group Name">
                <input
                  name="groupName"
                  placeholder="Group name"
                  className={inputClass}
                />
              </Field>

              <Field label="Custom Package Name">
                <input
                  name="customPackageName"
                  placeholder="Custom package / operation"
                  className={inputClass}
                />
              </Field>

              <Field label="Tour Category">
                <input
                  name="tourCategoryName"
                  placeholder="Pilgrimage, Cultural, Cruise..."
                  className={inputClass}
                />
              </Field>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* TAX */}
          {/* ========================================= */}

          <ExpenseSection
            title="Tax / VAT"
            description="Optional tax breakdown for accounting and reporting."
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Tax Type">
                <select
                  name="taxType"
                  defaultValue="NONE"
                  className={inputClass}
                >
                  {financeTaxTypes.map(
                    (taxType) => (
                      <option
                        key={taxType}
                        value={taxType}
                      >
                        {formatEnumLabel(
                          taxType,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Tax Rate %">
                <input
                  name="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </Field>

              <Field label="Tax Amount">
                <input
                  name="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </Field>

              <Field label="Net Amount">
                <input
                  name="netAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </Field>

              <Field label="Gross Amount">
                <input
                  name="grossAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </Field>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* FLAGS */}
          {/* ========================================= */}

          <ExpenseSection
            title="Expense Properties"
            description="Additional information useful for recurring costs and staff reimbursement."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CheckboxCard
                name="recurring"
                title="Recurring Expense"
                description="Use for rent, subscriptions, software, utilities and other repeating costs."
              />

              <CheckboxCard
                name="reimbursable"
                title="Reimbursable Expense"
                description="Use when staff, a tour manager, guide or another person paid personally and needs reimbursement."
              />
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* DOCUMENTS */}
          {/* ========================================= */}

          <ExpenseSection
            title="Receipt / Invoice Documents"
            description="Attach supporting documentation whenever available."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Upload Receipt / Invoice">
                <input
                  name="receipt"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                />

                <HelpText>
                  PDF, JPG, PNG or WEBP.
                  Maximum 10 MB.
                </HelpText>
              </Field>

              <Field label="Receipt URL">
                <input
                  name="receiptUrl"
                  placeholder="/uploads/expenses/invoice.pdf"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Supporting Document URL"
                className="md:col-span-2"
              >
                <input
                  name="documentUrl"
                  placeholder="Contract, invoice, supporting document or internal file link"
                  className={inputClass}
                />
              </Field>
            </div>
          </ExpenseSection>

          {/* ========================================= */}
          {/* DESCRIPTION */}
          {/* ========================================= */}

          <ExpenseSection
            title="Description & Notes"
            description="Add operational or accounting details that will help staff understand this cost later."
          >
            <div className="grid gap-5">
              <Field label="Description">
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Describe the expense..."
                  className={textareaClass}
                />
              </Field>

              <Field label="Internal Notes">
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Internal finance or operational notes..."
                  className={textareaClass}
                />
              </Field>
            </div>
          </ExpenseSection>
        </div>

        {/* ========================================= */}
        {/* ACTIONS */}
        {/* ========================================= */}

        <div className="sticky bottom-4 mt-8 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          >
            Save Expense
          </button>

          <Link
            href="/admin/finance/expenses"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Cancel
          </Link>
        </div>
      </CreateExpenseForm>
    </div>
  );
}

/* ============================================================ */
/* REUSABLE UI */
/* ============================================================ */

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

function ExpenseSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#001F3F]">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 max-w-4xl text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function HelpText({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mt-1.5 text-xs leading-5 text-slate-500">
      {children}
    </p>
  );
}

function CheckboxCard({
  name,
  title,
  description,
}: {
  name: string;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#001F3F]/30">
      <input
        type="checkbox"
        name={name}
        value="true"
        className="mt-1 h-4 w-4"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-900">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}