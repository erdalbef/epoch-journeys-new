import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";

type PageProps = {
  params: {
    id: string;
  };
};

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

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const template = await db.quoteTemplate.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
      createdBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <Link
          href="/admin/quotes/templates"
          className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          ← Back to Templates
        </Link>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{template.title}</h1>

            <p className="text-sm text-muted-foreground">
              {template.description || "No description provided"}
            </p>
          </div>

          <Link
            href={`/admin/quotes/templates/${template.id}/edit`}
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Edit Template
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Currency</p>
          <p className="font-medium">{template.currency}</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Items</p>
          <p className="font-medium">{template.items.length}</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Version</p>
          <p className="font-medium">{template.calculationVersion || "-"}</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">
            {template.isDefault ? "Default" : "Standard"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Template Items</h2>

          <div className="mt-6 space-y-4">
            {template.items.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No items in this template.
              </div>
            ) : (
              template.items.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{item.title}</h3>

                      {item.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>

                    {item.optional ? (
                      <span className="rounded border px-2 py-1 text-xs">
                        Optional
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p>{item.itemType}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Qty</p>
                      <p>{item.quantity}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Unit</p>
                      <p>{formatMoney(item.unitPrice, item.currency)}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Discount</p>
                      <p>{formatMoney(item.discountAmount, item.currency)}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">
                        {formatMoney(item.total, item.currency)}
                      </p>
                    </div>
                  </div>

                  {item.taxRate !== null ? (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Tax Rate: {item.taxRate}% · Tax Amount:{" "}
                      {formatMoney(item.taxAmount, item.currency)}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Template Summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Name / Slug</span>
                <span className="font-medium">{template.name}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {formatDate(template.createdAt)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">
                  {formatDate(template.updatedAt)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-medium">{template.purpose || "-"}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Default</span>
                <span className="font-medium">
                  {template.isDefault ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Totals</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{template.items.length}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium">{template.currency}</span>
              </div>

              <div className="flex justify-between gap-4 border-t pt-3 text-base">
                <span className="font-semibold">Estimated Total</span>
                <span className="font-semibold">
                  {formatMoney(
                    template.items.reduce((sum, item) => sum + item.total, 0),
                    template.currency
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Ownership</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Created By</span>
                <span className="font-medium">
                  {template.createdBy?.fullName ||
                    template.createdBy?.email ||
                    "-"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}