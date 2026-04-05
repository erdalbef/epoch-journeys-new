import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

type ResourcesPageProps = {
  searchParams?: {
    destination?: string;
    category?: string;
  };
};

function buildZipHref(destination?: string, category?: string) {
  const params = new URLSearchParams();

  if (destination) {
    params.set("destination", destination);
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();
  return query ? `/api/b2b/resources/zip?${query}` : "/api/b2b/resources/zip";
}

export default async function B2BResourcesPage({
  searchParams,
}: ResourcesPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      approved: true,
      status: true,
    },
  });

  if (!user || user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
    redirect("/agent-login");
  }

  const destinationFilter = searchParams?.destination?.trim() || "";
  const categoryFilter = searchParams?.category?.trim() || "";

  const tours = await db.tour.findMany({
    where: {
      isPublished: true,
      OR: [
        { brochureUrl: { not: null } },
        { mainImageUrl: { not: null } },
        { mapImageUrl: { not: null } },
      ],
      ...(destinationFilter
        ? { destinations: { has: destinationFilter } }
        : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
    },
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      title: true,
      category: true,
      destinations: true,
      brochureUrl: true,
      mainImageUrl: true,
      mapImageUrl: true,
    },
  });

  const allToursForFilters = await db.tour.findMany({
    where: {
      isPublished: true,
    },
    select: {
      category: true,
      destinations: true,
    },
  });

  const categories = Array.from(
    new Set(allToursForFilters.map((tour) => tour.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const destinations = Array.from(
    new Set(
      allToursForFilters.flatMap((tour) => tour.destinations).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const brochureCount = tours.filter((tour) => Boolean(tour.brochureUrl)).length;
  const imageCount = tours.filter((tour) => Boolean(tour.mainImageUrl)).length;
  const mapCount = tours.filter((tour) => Boolean(tour.mapImageUrl)).length;

  const zipHref = buildZipHref(destinationFilter, categoryFilter);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#001F3F]">
              Marketing Resources
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Download brochures, tour images, and maps to support your client
              presentations and sales process.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={zipHref}
              className="rounded-lg bg-[#8B0000] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Download All Resources (ZIP)
            </a>

            <Link
              href="/b2b/tours"
              className="rounded-lg border px-5 py-3 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Browse Tours
            </Link>

            <Link
              href="/b2b/dashboard"
              className="rounded-lg border px-5 py-3 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#001F3F]">Filters</h2>

        <form className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination</label>
            <select
              name="destination"
              defaultValue={destinationFilter}
              className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="">All Destinations</option>
              {destinations.map((destination) => (
                <option key={destination} value={destination}>
                  {destination}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="h-10 rounded-md bg-[#8B0000] px-4 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Apply Filters
            </button>

            <Link
              href="/b2b/resources"
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Tours with Resources
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {tours.length}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Brochures
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {brochureCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Tour Images
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {imageCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Maps</div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {mapCount}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#001F3F]">
          Available Downloads
        </h2>

        {tours.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
            <p className="text-base font-medium text-[#001F3F]">
              No resources available
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              No published tour resources matched your current filters.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="rounded-2xl border p-5 transition hover:border-[#8B0000]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#001F3F]">
                      {tour.title}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {tour.category}
                      {tour.destinations.length > 0
                        ? ` • ${tour.destinations.join(", ")}`
                        : ""}
                    </p>
                  </div>

                  <Link
                    href={`/b2b/tours/${tour.id}`}
                    className="text-sm font-medium text-[#8B0000] hover:underline"
                  >
                    View Tour
                  </Link>
                </div>

                {tour.mainImageUrl ? (
                  <div className="mt-5 overflow-hidden rounded-xl border bg-slate-50">
                    <Image
                      src={tour.mainImageUrl}
                      alt={tour.title}
                      width={1200}
                      height={700}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mt-5 flex h-48 items-center justify-center rounded-xl border border-dashed bg-slate-50 text-sm text-muted-foreground">
                    No preview image available
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {tour.brochureUrl ? (
                    <a
                      href={tour.brochureUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
                    >
                      Download Brochure
                    </a>
                  ) : null}

                  {tour.mainImageUrl ? (
                    <a
                      href={tour.mainImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
                    >
                      View Image
                    </a>
                  ) : null}

                  {tour.mapImageUrl ? (
                    <a
                      href={tour.mapImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
                    >
                      View Map
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}