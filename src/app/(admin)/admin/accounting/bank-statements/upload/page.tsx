import Link from "next/link";
import { Landmark, ArrowLeft, Upload } from "lucide-react";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
};

export default async function BankStatementUploadPage({
  searchParams,
}: PageProps) {
  const query = await searchParams;

  const now = new Date();

  const defaultYear =
    Number(query.year) || now.getFullYear();

  const defaultMonth =
    Number(query.month) || now.getMonth() + 1;

  const bankAccounts =
    await db.bankAccount.findMany({
      where: {
        isActive: true,
        currency: "EUR",
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href={`/admin/accounting/${defaultYear}/${defaultMonth}?category=BANK_STATEMENTS`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#8B0000]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bank Statements
        </Link>

        <div className="flex items-center gap-2 text-sm font-semibold text-[#8B0000]">
          <Landmark className="h-4 w-4" />
          Accounting
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B1F3A]">
          Upload EUR Bank Statement
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Upload a complete monthly EUR bank
          statement and assign it to the correct
          accounting period and bank account.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        Your accountant requested complete
        monthly statements in PDF and Excel
        format where available. For now, this
        upload records one statement file at a
        time. You may upload both the PDF and
        Excel versions as separate statement
        records if required.
      </div>

      <form
        action="/api/admin/accounting/bank-statements"
        method="POST"
        encType="multipart/form-data"
        className="space-y-8"
      >
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0B1F3A]">
            Accounting Period
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="year"
                className="text-sm font-semibold text-slate-800"
              >
                Accounting Year *
              </label>

              <input
                id="year"
                name="year"
                type="number"
                min="2000"
                max="2100"
                required
                defaultValue={defaultYear}
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="month"
                className="text-sm font-semibold text-slate-800"
              >
                Accounting Month *
              </label>

              <select
                id="month"
                name="month"
                required
                defaultValue={defaultMonth}
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                {Array.from(
                  { length: 12 },
                  (_, index) => {
                    const month = index + 1;

                    const label =
                      new Intl.DateTimeFormat(
                        "en-GB",
                        {
                          month: "long",
                        }
                      ).format(
                        new Date(
                          Date.UTC(
                            2026,
                            index,
                            1
                          )
                        )
                      );

                    return (
                      <option
                        key={month}
                        value={month}
                      >
                        {label}
                      </option>
                    );
                  }
                )}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0B1F3A]">
            Statement Details
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="bankAccountId"
                className="text-sm font-semibold text-slate-800"
              >
                EUR Bank Account *
              </label>

              <select
                id="bankAccountId"
                name="bankAccountId"
                required
                defaultValue=""
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option
                  value=""
                  disabled
                >
                  Select bank account
                </option>

                {bankAccounts.map(
                  (account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name} –{" "}
                      {account.currency}
                    </option>
                  )
                )}
              </select>

              {bankAccounts.length === 0 && (
                <p className="mt-2 text-sm text-red-700">
                  No active EUR bank account
                  exists yet.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="statementDate"
                className="text-sm font-semibold text-slate-800"
              >
                Statement Date *
              </label>

              <input
                id="statementDate"
                name="statementDate"
                type="date"
                required
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="file"
                className="text-sm font-semibold text-slate-800"
              >
                Statement File *
              </label>

              <input
                id="file"
                name="file"
                type="file"
                required
                accept=".pdf,.csv,.xls,.xlsx"
                className="mt-2 block w-full rounded-lg border px-3 py-2 text-sm"
              />

              <p className="mt-1 text-xs text-slate-500">
                PDF, Excel or CSV. Maximum 20 MB.
              </p>
            </div>

            <div>
              <label
                htmlFor="openingBalance"
                className="text-sm font-semibold text-slate-800"
              >
                Opening Balance
              </label>

              <input
                id="openingBalance"
                name="openingBalance"
                type="number"
                step="0.01"
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="closingBalance"
                className="text-sm font-semibold text-slate-800"
              >
                Closing Balance
              </label>

              <input
                id="closingBalance"
                name="closingBalance"
                type="number"
                step="0.01"
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="text-sm font-semibold text-slate-800"
              >
                Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Optional accounting notes."
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/admin/accounting/${defaultYear}/${defaultMonth}?category=BANK_STATEMENTS`}
            className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={bankAccounts.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Upload Statement
          </button>
        </div>
      </form>
    </div>
  );
}