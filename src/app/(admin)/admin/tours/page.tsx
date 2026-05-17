import Link from "next/link";
import { db } from "@/lib/db";
import ToursBulkActions from "@/components/admin/ToursBulkActions";
import ToursToastHandler from "@/components/admin/ToursToastHandler";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    category?: string;
    page?: string;
    success?: string;
    error?: string;
  }>;
};

const PAGE_SIZE = 9;

export default async function AdminToursPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "published";
  const category = params.category?.trim() ?? "all";
  const success = params.success?.trim() ?? "";
  const error = params.error?.trim() ?? "";

  const pageNumber = Number(params.page ?? "1");
  const currentPage =
    Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  const where = {
    ...(q
      ? {
          title: {
            contains: q,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(status === "published"
      ? { isPublished: true }
      : status === "archived"
        ? { isPublished: false }
        : {}),
    ...(category !== "all" ? { category } : {}),
  };

  const [tours, totalCount, categoryRows] = await Promise.all([
    db.tour.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        category: true,
        duration: true,
        mainImageUrl: true,
        isPublished: true,
        featured: true,
        bookings: {
          select: { id: true },
          take: 1,
        },
        quotes: {
          select: { id: true },
          take: 1,
        },
        departureDates: {
          select: {
            id: true,
            bookings: {
              select: { id: true },
              take: 1,
            },
            quotes: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    }),
    db.tour.count({ where }),
    db.tour.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const categories = categoryRows.map((row) => row.category);

  const mappedTours = tours.map((tour) => {
    const hasDirectBookings = tour.bookings.length > 0;
    const hasDirectQuotes = tour.quotes.length > 0;

    const hasDepartureDependencies = tour.departureDates.some(
      (departure) =>
        departure.bookings.length > 0 || departure.quotes.length > 0
    );

    return {
      id: tour.id,
      title: tour.title,
      category: tour.category,
      duration: tour.duration,
      mainImageUrl: tour.mainImageUrl,
      isPublished: tour.isPublished,
      featured: tour.featured,
      isProtected:
        hasDirectBookings || hasDirectQuotes || hasDepartureDependencies,
    };
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildPageHref(page: number) {
    const query = new URLSearchParams();

    if (q) query.set("q", q);
    if (status && status !== "published") query.set("status", status);
    if (category && category !== "all") query.set("category", category);
    if (page > 1) query.set("page", String(page));

    const queryString = query.toString();
    return queryString ? `/admin/tours?${queryString}` : "/admin/tours";
  }

  return (
    <div className="max-w-7xl space-y-6">
      <ToursToastHandler success={success} error={error} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tours</h1>
          <p className="text-sm text-muted-foreground">
            Manage all tours, images, and publishing status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/tours/create"
            className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
          >
            + Create Tour
          </Link>

          <span className="text-sm text-muted-foreground">
            Images are uploaded inside Create / Edit
          </span>
        </div>
      </div>

      <form
        method="GET"
        className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label htmlFor="q" className="text-sm font-medium">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by title"
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="mt-1 w-full rounded border p-2"
          >
            <option value="published">Published</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className="mt-1 w-full rounded border p-2"
          >
            <option value="all">All</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-[#001F3F] px-4 py-2 text-white hover:opacity-90"
          >
            Apply Filters
          </button>

          <Link
            href="/admin/tours"
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Reset
          </Link>

          <div className="text-sm text-muted-foreground">
            {totalCount} result{totalCount === 1 ? "" : "s"}
          </div>
        </div>
      </form>

      {mappedTours.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          No tours found for the selected filters.
        </div>
      ) : (
        <>
          <ToursBulkActions tours={mappedTours} />

          <div className="flex flex-col gap-3 rounded-lg border bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={buildPageHref(Math.max(1, currentPage - 1))}
                className={`rounded border px-3 py-2 text-sm ${
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "hover:bg-gray-50"
                }`}
              >
                Prev
              </Link>

              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;

                if (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 2
                ) {
                  return (
                    <Link
                      key={page}
                      href={buildPageHref(page)}
                      className={`rounded border px-3 py-2 text-sm ${
                        page === currentPage
                          ? "bg-[#001F3F] text-white"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </Link>
                  );
                }

                if (page === currentPage - 3 || page === currentPage + 3) {
                  return (
                    <span key={page} className="px-2 text-sm">
                      ...
                    </span>
                  );
                }

                return null;
              })}

              <Link
                href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                className={`rounded border px-3 py-2 text-sm ${
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "hover:bg-gray-50"
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}