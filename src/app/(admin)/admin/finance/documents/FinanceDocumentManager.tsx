"use client";

import {
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type DocumentRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;

  originalFileName: string;
  mimeType: string;
  fileSize: number;

  documentDate: string | null;
  referenceNumber: string | null;
  notes: string | null;

  createdAt: string;

  expense: {
    id: string;
    title: string;
  } | null;

  supplierPayable: {
    id: string;
    title: string;
    supplierNameSnapshot: string;
  } | null;

  supplierPayablePayment: {
    id: string;

    payable: {
      title: string;
      supplierNameSnapshot: string;
    };
  } | null;

  refund: {
    id: string;
    amount: number;
    currency: string;

    booking: {
      bookingReference: string;
      bookingDisplayCode: string | null;
    };
  } | null;

  bankAccount: {
    id: string;
    name: string;
    currency: string;
  } | null;

  bankTransaction: {
    id: string;
    description: string | null;
    reference: string | null;

    bankAccount: {
      id: string;
      name: string;
      currency: string;
    };
  } | null;

  booking: {
    id: string;
    bookingReference: string;
    bookingDisplayCode: string | null;
  } | null;

  tour: {
    id: string;
    title: string;
  } | null;

  departureDate: {
    id: string;
    date: string;

    tour: {
      title: string;
    };
  } | null;

  supplier: {
    id: string;
    name: string;
  } | null;

  uploadedBy: {
    fullName: string | null;
    email: string;
  } | null;
};

type ExpenseOption = {
  id: string;
  title: string;
  vendorName: string | null;
  expenseDate: string;
};

type SupplierPayableOption = {
  id: string;
  title: string;
  supplierNameSnapshot: string;
  supplierInvoiceNumber: string | null;
};

type SupplierPaymentOption = {
  id: string;
  paymentDate: string;
  reference: string | null;

  payable: {
    title: string;
    supplierNameSnapshot: string;
  };
};

type RefundOption = {
  id: string;
  amount: number;
  currency: string;
  status: string;

  booking: {
    bookingReference: string;
    bookingDisplayCode: string | null;
  };
};

type BookingOption = {
  id: string;
  bookingReference: string;
  bookingDisplayCode: string | null;
  tourTitleSnapshot: string;
};

type TourOption = {
  id: string;
  title: string;
  tourCode: string | null;
};

type DepartureOption = {
  id: string;
  date: string;

  tour: {
    title: string;
  };
};

type SupplierOption = {
  id: string;
  name: string;
  type: string;
};

type BankAccountOption = {
  id: string;
  name: string;
  currency: string;
  currentBalance: number;
};

type BankTransactionOption = {
  id: string;
  type: string;
  reference: string | null;
  description: string | null;
  transactionDate: string;

  bankAccountId: string;

  bankAccount: {
    name: string;
    currency: string;
  };
};

type Props = {
  documentTypes: string[];

  documents: DocumentRecord[];

  expenses: ExpenseOption[];

  supplierPayables:
    SupplierPayableOption[];

  supplierPayablePayments:
    SupplierPaymentOption[];

  refunds: RefundOption[];

  bookings: BookingOption[];

  tours: TourOption[];

  departures: DepartureOption[];

  suppliers: SupplierOption[];

  bankAccounts: BankAccountOption[];

  bankTransactions:
    BankTransactionOption[];
};

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatFileSize(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb =
    bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(
      1,
    )} KB`;
  }

  const mb =
    kb / 1024;

  return `${mb.toFixed(
    2,
  )} MB`;
}

function formatMoney(
  amount: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
      },
    ).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(
      2,
    )}`;
  }
}

function relatedRecordLabel(
  document: DocumentRecord,
) {
  if (document.expense) {
    return `Expense: ${document.expense.title}`;
  }

  if (
    document.supplierPayable
  ) {
    return `Supplier Payable: ${document.supplierPayable.title}`;
  }

  if (
    document.supplierPayablePayment
  ) {
    return `Supplier Payment: ${document.supplierPayablePayment.payable.supplierNameSnapshot}`;
  }

  if (document.refund) {
    return `Refund: ${
      document.refund.booking
        .bookingDisplayCode ||
      document.refund.booking
        .bookingReference
    }`;
  }

  if (
    document.bankTransaction
  ) {
    return `Bank Transaction: ${
      document.bankTransaction
        .description ||
      document.bankTransaction
        .reference ||
      "Ledger Entry"
    } · ${
      document.bankTransaction
        .bankAccount.name
    }`;
  }

  if (document.bankAccount) {
    return `Bank Account: ${document.bankAccount.name} · ${document.bankAccount.currency}`;
  }

  if (document.booking) {
    return `Booking: ${
      document.booking
        .bookingDisplayCode ||
      document.booking
        .bookingReference
    }`;
  }

  if (document.tour) {
    return `Tour: ${document.tour.title}`;
  }

  if (
    document.departureDate
  ) {
    return `Departure: ${document.departureDate.tour.title} · ${formatDate(
      document.departureDate
        .date,
    )}`;
  }

  if (document.supplier) {
    return `Supplier: ${document.supplier.name}`;
  }

  return "General Finance Document";
}

export default function FinanceDocumentManager({
  documentTypes,
  documents,
  expenses,
  supplierPayables,
  supplierPayablePayments,
  refunds,
  bookings,
  tours,
  departures,
  suppliers,
  bankAccounts,
  bankTransactions,
}: Props) {
  const router =
    useRouter();

  const [uploading, setUploading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(
      null,
    );

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [
    documentType,
    setDocumentType,
  ] = useState(
    documentTypes[0] || "OTHER",
  );

  const [
    accountingDestination,
    setAccountingDestination,
  ] = useState<
    "OTHER_DOCUMENTS" | "TRIP_GROUP_DOCUMENTATION"
  >("OTHER_DOCUMENTS");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    documentDate,
    setDocumentDate,
  ] = useState("");

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [expenseId, setExpenseId] =
    useState("");

  const [
    supplierPayableId,
    setSupplierPayableId,
  ] = useState("");

  const [
    supplierPayablePaymentId,
    setSupplierPayablePaymentId,
  ] = useState("");

  const [refundId, setRefundId] =
    useState("");

  const [
    bankAccountId,
    setBankAccountId,
  ] = useState("");

  const [
    bankTransactionId,
    setBankTransactionId,
  ] = useState("");

  const [bookingId, setBookingId] =
    useState("");

  const [tourId, setTourId] =
    useState("");

  const [
    departureDateId,
    setDepartureDateId,
  ] = useState("");

  const [supplierId, setSupplierId] =
    useState("");

  const [file, setFile] =
    useState<File | null>(
      null,
    );

  const filteredDocuments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return documents.filter(
        (document) => {
          if (
            typeFilter &&
            document.type !==
              typeFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack = [
            document.title,
            document.originalFileName,
            document.referenceNumber,
            document.description,
            document.notes,
            document.bankAccount
              ?.name,
            document.bankAccount
              ?.currency,
            document.bankTransaction
              ?.bankAccount.name,
            relatedRecordLabel(
              document,
            ),
            document.uploadedBy
              ?.fullName,
            document.uploadedBy
              ?.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            query,
          );
        },
      );
    }, [
      documents,
      search,
      typeFilter,
    ]);

  const availableBankTransactions =
    useMemo(() => {
      if (!bankAccountId) {
        return bankTransactions;
      }

      return bankTransactions.filter(
        (transaction) =>
          transaction.bankAccountId ===
          bankAccountId,
      );
    }, [
      bankAccountId,
      bankTransactions,
    ]);

  const selectedBankAccount =
    useMemo(
      () =>
        bankAccounts.find(
          (account) =>
            account.id ===
            bankAccountId,
        ) || null,
      [
        bankAccountId,
        bankAccounts,
      ],
    );

  function clearRelationFields() {
    setExpenseId("");
    setSupplierPayableId("");
    setSupplierPayablePaymentId(
      "",
    );
    setRefundId("");
    setBankAccountId("");
    setBankTransactionId("");
    setBookingId("");
    setTourId("");
    setDepartureDateId("");
    setSupplierId("");
  }

  function handleBankAccountChange(
    value: string,
  ) {
    setBankAccountId(value);

    if (!bankTransactionId) {
      return;
    }

    const selectedTransaction =
      bankTransactions.find(
        (transaction) =>
          transaction.id ===
          bankTransactionId,
      );

    if (
      value &&
      selectedTransaction &&
      selectedTransaction.bankAccountId !==
        value
    ) {
      setBankTransactionId("");
    }
  }

  function handleDocumentTypeChange(
    value: string,
  ) {
    setDocumentType(value);

    /*
     * Bank statements belong to an account,
     * not to an individual ledger entry.
     */
    if (
      value ===
      "BANK_STATEMENT"
    ) {
      setBankTransactionId("");
    }
  }

  async function handleUpload(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!file) {
      toast.error(
        "Please select a file.",
      );
      return;
    }

    if (!title.trim()) {
      toast.error(
        "Document title is required.",
      );
      return;
    }

    if (
      documentType ===
        "BANK_STATEMENT" &&
      !bankAccountId
    ) {
      toast.error(
        "Please select the bank account for this bank statement.",
      );
      return;
    }

    const formData =
      new FormData();

    formData.set(
      "file",
      file,
    );

    formData.set(
      "type",
      documentType,
    );

    formData.set(
      "accountingCategory",
      accountingDestination,
    );

    formData.set(
      "title",
      title.trim(),
    );

    if (
      description.trim()
    ) {
      formData.set(
        "description",
        description.trim(),
      );
    }

    if (documentDate) {
      formData.set(
        "documentDate",
        documentDate,
      );
    }

    if (
      referenceNumber.trim()
    ) {
      formData.set(
        "referenceNumber",
        referenceNumber.trim(),
      );
    }

    if (notes.trim()) {
      formData.set(
        "notes",
        notes.trim(),
      );
    }

    if (expenseId) {
      formData.set(
        "expenseId",
        expenseId,
      );
    }

    if (
      supplierPayableId
    ) {
      formData.set(
        "supplierPayableId",
        supplierPayableId,
      );
    }

    if (
      supplierPayablePaymentId
    ) {
      formData.set(
        "supplierPayablePaymentId",
        supplierPayablePaymentId,
      );
    }

    if (refundId) {
      formData.set(
        "refundId",
        refundId,
      );
    }

    if (bankAccountId) {
      formData.set(
        "bankAccountId",
        bankAccountId,
      );
    }

    if (
      bankTransactionId
    ) {
      formData.set(
        "bankTransactionId",
        bankTransactionId,
      );
    }

    if (bookingId) {
      formData.set(
        "bookingId",
        bookingId,
      );
    }

    if (tourId) {
      formData.set(
        "tourId",
        tourId,
      );
    }

    if (
      departureDateId
    ) {
      formData.set(
        "departureDateId",
        departureDateId,
      );
    }

    if (supplierId) {
      formData.set(
        "supplierId",
        supplierId,
      );
    }

    setUploading(true);

    try {
      const response =
        await fetch(
          "/api/admin/finance/documents/upload",
          {
            method: "POST",
            body: formData,
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to upload document.",
        );
      }

      toast.success(
        "Additional accounting document uploaded successfully.",
      );

      setTitle("");
      setDescription("");
      setDocumentDate("");
      setReferenceNumber("");
      setNotes("");
      setFile(null);

      clearRelationFields();

      const fileInput =
        window.document.querySelector<HTMLInputElement>(
          "#finance-document-file",
        );

      if (fileInput) {
        fileInput.value = "";
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload document.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(
    id: string,
  ) {
    const confirmed =
      window.confirm(
        "Delete this finance document? The stored file will also be permanently removed from private Blob storage.",
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      const response =
        await fetch(
          `/api/admin/finance/documents/${id}`,
          {
            method: "DELETE",
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to delete document.",
        );
      }

      toast.success(
        "Finance document deleted.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete document.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Additional Accounting Documents
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Upload accounting-support documents that were not already collected
            through Supplier Payables, Additional Expenses, Customer Payments,
            or Bank Statements.
          </p>
        </div>

        <Link
          href="/admin/finance"
          className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          ← Finance Center
        </Link>
      </div>

      {/* UPLOAD */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Upload Additional Accounting Document
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Use this page mainly for contracts, agreements, accountant-requested
            documents, official notices, and trip/group supporting documents
            that were not uploaded through another finance workflow.
          </p>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <strong>Do not upload duplicates.</strong>{" "}
            Supplier invoices belong in Supplier Payables, additional-expense
            receipts in Additional Expenses, customer payment proofs in Customer
            Payments, and full bank statements in Bank Statements. Use this form
            only when an additional accounting document still needs to be filed.
          </div>
        </div>

        <form
          onSubmit={handleUpload}
          className="space-y-6"
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Accounting Destination *">
              <select
                value={accountingDestination}
                onChange={(event) =>
                  setAccountingDestination(
                    event.target.value as
                      | "OTHER_DOCUMENTS"
                      | "TRIP_GROUP_DOCUMENTATION",
                  )
                }
                className={inputClass}
                required
              >
                <option value="OTHER_DOCUMENTS">
                  07 - Other Documents
                </option>
                <option value="TRIP_GROUP_DOCUMENTATION">
                  08 - Trip / Group Documentation
                </option>
              </select>

              <p className="mt-1.5 text-xs text-slate-500">
                Select where this manually uploaded document should appear in
                the monthly accounting package.
              </p>
            </Field>

            <Field label="Document Type *">
              <select
                value={
                  documentType
                }
                onChange={(
                  event,
                ) =>
                  handleDocumentTypeChange(
                    event.target
                      .value,
                  )
                }
                className={
                  inputClass
                }
              >
                {documentTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {enumLabel(
                        type,
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
                value={title}
                onChange={(
                  event,
                ) =>
                  setTitle(
                    event.target
                      .value,
                  )
                }
                required
                placeholder="Example: Hotel contract / Final group voucher"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Document Date">
              <input
                type="date"
                value={
                  documentDate
                }
                onChange={(
                  event,
                ) =>
                  setDocumentDate(
                    event.target
                      .value,
                  )
                }
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Reference Number">
              <input
                value={
                  referenceNumber
                }
                onChange={(
                  event,
                ) =>
                  setReferenceNumber(
                    event.target
                      .value,
                  )
                }
                placeholder="Invoice / bank / document reference"
                className={
                  inputClass
                }
              />
            </Field>

            <Field
              label="File *"
              className="md:col-span-2"
            >
              <input
                id="finance-document-file"
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                onChange={(
                  event,
                ) =>
                  setFile(
                    event.target
                      .files?.[0] ||
                      null,
                  )
                }
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />

              <p className="mt-1.5 text-xs text-slate-500">
                PDF, JPG, PNG,
                WEBP, DOC, DOCX,
                XLS or XLSX.
                Maximum 20 MB.
              </p>
            </Field>
          </div>

          {/* RELATIONS */}

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Link to Finance /
              Operational Record
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Link the document to
              its source record where
              applicable. Bank
              statements should be
              linked to a Bank Account;
              transaction-specific
              banking proofs may also
              be linked to a Bank
              Transaction.
            </p>

            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Expense">
                <select
                  value={
                    expenseId
                  }
                  onChange={(
                    event,
                  ) =>
                    setExpenseId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {expenses.map(
                    (expense) => (
                      <option
                        key={
                          expense.id
                        }
                        value={
                          expense.id
                        }
                      >
                        {
                          expense.title
                        }
                        {expense.vendorName
                          ? ` · ${expense.vendorName}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Supplier Payable">
                <select
                  value={
                    supplierPayableId
                  }
                  onChange={(
                    event,
                  ) =>
                    setSupplierPayableId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {supplierPayables.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.supplierNameSnapshot
                        }
                        {" · "}
                        {
                          item.title
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Supplier Payment">
                <select
                  value={
                    supplierPayablePaymentId
                  }
                  onChange={(
                    event,
                  ) =>
                    setSupplierPayablePaymentId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {supplierPayablePayments.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item
                            .payable
                            .supplierNameSnapshot
                        }
                        {" · "}
                        {
                          item
                            .payable
                            .title
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Refund">
                <select
                  value={
                    refundId
                  }
                  onChange={(
                    event,
                  ) =>
                    setRefundId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {refunds.map(
                    (refund) => (
                      <option
                        key={
                          refund.id
                        }
                        value={
                          refund.id
                        }
                      >
                        {refund.booking
                          .bookingDisplayCode ||
                          refund.booking
                            .bookingReference}
                        {" · "}
                        {
                          refund.currency
                        }{" "}
                        {refund.amount.toFixed(
                          2,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              {/* BANK ACCOUNT */}

              <Field
                label={
                  documentType ===
                  "BANK_STATEMENT"
                    ? "Bank Account *"
                    : "Bank Account"
                }
              >
                <select
                  value={
                    bankAccountId
                  }
                  onChange={(
                    event,
                  ) =>
                    handleBankAccountChange(
                      event.target
                        .value,
                    )
                  }
                  required={
                    documentType ===
                    "BANK_STATEMENT"
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    {documentType ===
                    "BANK_STATEMENT"
                      ? "Select bank account..."
                      : "Not linked"}
                  </option>

                  {bankAccounts.map(
                    (account) => (
                      <option
                        key={
                          account.id
                        }
                        value={
                          account.id
                        }
                      >
                        {
                          account.name
                        }
                        {" · "}
                        {
                          account.currency
                        }
                      </option>
                    ),
                  )}
                </select>

                {selectedBankAccount ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Current recorded
                    balance:{" "}
                    {formatMoney(
                      selectedBankAccount.currentBalance,
                      selectedBankAccount.currency,
                    )}
                  </p>
                ) : null}
              </Field>

              {/* BANK TRANSACTION */}

              <Field label="Bank Transaction">
                <select
                  value={
                    bankTransactionId
                  }
                  onChange={(
                    event,
                  ) =>
                    setBankTransactionId(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    documentType ===
                    "BANK_STATEMENT"
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    {documentType ===
                    "BANK_STATEMENT"
                      ? "Not applicable to bank statements"
                      : "Not linked"}
                  </option>

                  {availableBankTransactions.map(
                    (
                      transaction,
                    ) => (
                      <option
                        key={
                          transaction.id
                        }
                        value={
                          transaction.id
                        }
                      >
                        {
                          transaction
                            .bankAccount
                            .name
                        }
                        {" · "}
                        {enumLabel(
                          transaction.type,
                        )}
                        {" · "}
                        {transaction.description ||
                          transaction.reference ||
                          formatDate(
                            transaction.transactionDate,
                          )}
                      </option>
                    ),
                  )}
                </select>

                {bankAccountId &&
                documentType !==
                  "BANK_STATEMENT" ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Showing
                    transactions for
                    the selected bank
                    account only.
                  </p>
                ) : null}
              </Field>

              <Field label="Booking">
                <select
                  value={
                    bookingId
                  }
                  onChange={(
                    event,
                  ) =>
                    setBookingId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {bookings.map(
                    (booking) => (
                      <option
                        key={
                          booking.id
                        }
                        value={
                          booking.id
                        }
                      >
                        {booking.bookingDisplayCode ||
                          booking.bookingReference}
                        {" · "}
                        {
                          booking.tourTitleSnapshot
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Tour">
                <select
                  value={
                    tourId
                  }
                  onChange={(
                    event,
                  ) =>
                    setTourId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {tours.map(
                    (tour) => (
                      <option
                        key={
                          tour.id
                        }
                        value={
                          tour.id
                        }
                      >
                        {tour.tourCode
                          ? `${tour.tourCode} · `
                          : ""}
                        {
                          tour.title
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Departure">
                <select
                  value={
                    departureDateId
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepartureDateId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {departures.map(
                    (
                      departure,
                    ) => (
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
                            .tour
                            .title
                        }
                        {" · "}
                        {formatDate(
                          departure.date,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Supplier">
                <select
                  value={
                    supplierId
                  }
                  onChange={(
                    event,
                  ) =>
                    setSupplierId(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Not linked
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={
                          supplier.id
                        }
                        value={
                          supplier.id
                        }
                      >
                        {
                          supplier.name
                        }
                        {" · "}
                        {enumLabel(
                          supplier.type,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Description">
              <textarea
                value={
                  description
                }
                onChange={(
                  event,
                ) =>
                  setDescription(
                    event.target
                      .value,
                  )
                }
                rows={3}
                className={
                  textareaClass
                }
              />
            </Field>

            <Field label="Internal Notes">
              <textarea
                value={notes}
                onChange={(
                  event,
                ) =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
                rows={3}
                className={
                  textareaClass
                }
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={
              uploading
            }
            className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f0000] disabled:opacity-50"
          >
            {uploading
              ? "Uploading..."
              : "Upload Document"}
          </button>
        </form>
      </section>

      {/* DOCUMENT LIST */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              Stored Accounting Documents
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {
                documents.length
              }{" "}
              finance document
              {documents.length ===
              1
                ? ""
                : "s"}{" "}
              currently stored.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search documents..."
              className={
                inputClass
              }
            />

            <select
              value={
                typeFilter
              }
              onChange={(
                event,
              ) =>
                setTypeFilter(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            >
              <option value="">
                All document types
              </option>

              {documentTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {enumLabel(
                      type,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {filteredDocuments.length ===
        0 ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No finance documents
            match the current filter.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Document
                  </th>

                  <th className="px-4 py-3">
                    Type
                  </th>

                  <th className="px-4 py-3">
                    Related Record
                  </th>

                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Uploaded By
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map(
                  (document) => (
                    <tr
                      key={
                        document.id
                      }
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">
                          {
                            document.title
                          }
                        </p>

                        <p className="mt-1 max-w-[300px] truncate text-xs text-slate-500">
                          {
                            document.originalFileName
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatFileSize(
                            document.fileSize,
                          )}
                        </p>

                        {document.referenceNumber ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Ref:{" "}
                            {
                              document.referenceNumber
                            }
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                          {enumLabel(
                            document.type,
                          )}
                        </span>
                      </td>

                      <td className="max-w-[320px] px-4 py-4 text-slate-700">
                        {relatedRecordLabel(
                          document,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(
                          document.documentDate ||
                            document.createdAt,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {document.uploadedBy
                          ?.fullName ||
                          document.uploadedBy
                            ?.email ||
                          "Admin"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/api/admin/finance/documents/${document.id}/download`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#001F3F] hover:border-[#001F3F]"
                          >
                            Download
                          </a>

                          <button
                            type="button"
                            disabled={
                              deletingId ===
                              document.id
                            }
                            onClick={() =>
                              handleDelete(
                                document.id,
                              )
                            }
                            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId ===
                            document.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children:
    React.ReactNode;
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

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";