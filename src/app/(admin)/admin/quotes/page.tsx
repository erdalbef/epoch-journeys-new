import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { QuoteStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";
import DeleteQuoteButton from "@/components/admin/DeleteQuoteButton";
import DuplicateQuoteButton from "@/components/admin/DuplicateQuoteButton";
import UpdateQuoteStatusButton from "@/components/admin/UpdateQuoteStatusButton";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  const styles: Record<QuoteStatus, string> = {
    DRAFT: "bg-slate-200 text-slate-700",
    FINALIZED: "bg-amber-100 text-amber-700",
    SENT: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-rose-100 text-rose-700",
    CONVERTED: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    order?: string;
  }>;
};

export default async function QuotesPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const rawQuery = resolvedSearchParams.q ?? "";
  const query = rawQuery.trim();

  const rawStatus = resolvedSearchParams.status ?? "";
  const status =
    rawStatus && Object.values(QuoteStatus).includes(rawStatus as QuoteStatus)
      ? (rawStatus as QuoteStatus)
      : "";

  const rawSort = resolvedSearchParams.sort ?? "createdAt";
  const rawOrder = resolvedSearchParams.order ?? "desc";

  const sortField = rawSort === "totalAmount" ? "totalAmount" : "createdAt";
  const sortOrder: Prisma.SortOrder = rawOrder === "asc" ? "asc" : "desc";

  const quotes = await db.quote.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { recipientName: { contains: query, mode: "insensitive" } },
              { recipientEmail: { contains: query, mode: "insensitive" } },
              { quoteReference: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: {
      [sortField]: sortOrder,
    },
    take: 50,
    include: {
      items: true,
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="text-sm text-slate-600">
            Review, manage, and open saved quotes.
          </p>
        </div>

        <Link
          href="/admin/quotes/new"
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Create Quote
        </Link>
      </div>

      <div className="mb-6 rounded-xl border p-4">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="block xl:col-span-2">
            <span className="mb-1 block text-sm font-medium">Search</span>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Title, recipient, email, reference..."
              className="w-full rounded-md border p-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-md border p-2"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="FINALIZED">FINALIZED</option>
              <option value="SENT">SENT</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="CONVERTED">CONVERTED</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Sort By</span>
            <select
              name="sort"
              defaultValue={sortField}
              className="w-full rounded-md border p-2"
            >
              <option value="createdAt">Created Date</option>
              <option value="totalAmount">Total Amount</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Order</span>
            <select
              name="order"
              defaultValue={sortOrder}
              className="w-full rounded-md border p-2"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Apply
            </button>

            <Link
              href="/admin/quotes"
              className="w-full rounded-md border px-4 py-2 text-center text-sm hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      <div className="mb-4 text-sm text-slate-600">
        Showing {quotes.length} quote{quotes.length === 1 ? "" : "s"}
        {query ? ` for "${query}"` : ""}
        {status ? ` with status ${status}` : ""}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Quote</th>
              <th className="p-3 text-left">Recipient</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {quotes.map((quote) => {
              const itemsTotal = quote.items.reduce(
                (sum, item) => sum + item.total,
                0
              );

              const total =
                quote.totalAmount > 0 ? quote.totalAmount : itemsTotal;

              return (
                <tr key={quote.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-medium">
                      {quote.title || `Quote #${quote.quoteNumber}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {quote.quoteReference || "-"}
                    </div>
                  </td>

                  <td className="p-3">
                    <div>{quote.recipientName || "-"}</div>
                    <div className="text-xs text-slate-500">
                      {quote.recipientEmail || "-"}
                    </div>
                  </td>

                  <td className="p-3">
                    <StatusBadge status={quote.status} />
                  </td>

                  <td className="p-3">{formatMoney(total, quote.currency)}</td>

                  <td className="p-3">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/admin/quotes/${quote.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>

                      <DuplicateQuoteButton quoteId={quote.id} />

                      {quote.status === "DRAFT" && (
                        <>
                          <Link
                            href={`/admin/quotes/${quote.id}/edit`}
                            className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            Edit Draft
                          </Link>

                          <UpdateQuoteStatusButton
                            quoteId={quote.id}
                            currentStatus={quote.status}
                          />

                          <DeleteQuoteButton quoteId={quote.id} />
                        </>
                      )}

                      {quote.status === "FINALIZED" && (
                        <UpdateQuoteStatusButton
                          quoteId={quote.id}
                          currentStatus={quote.status}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {quotes.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">
            No quotes found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}