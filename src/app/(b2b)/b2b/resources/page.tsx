"use server";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  Prisma,
  ResourceAudience,
  ResourceStatus,
} from "@prisma/client";
import {
  Download,
  FileText,
  FolderOpen,
  Search,
  Sparkles,
} from "lucide-react";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Props = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    destination?: string;
    tour?: string;
  }>;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  }

  const mb = kb / 1024;

  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function fileTypeLabel(fileName: string) {
  return (
    fileName
      .split(".")
      .pop()
      ?.toUpperCase() || "FILE"
  );
}

const resourceSelect = {
  id: true,
  title: true,
  description: true,
  originalFileName: true,
  fileSize: true,
  destinations: true,
  category: {
    select: {
      name: true,
      parent: {
        select: {
          name: true,
        },
      },
    },
  },
  tour: {
    select: {
      id: true,
      title: true,
    },
  },
} satisfies Prisma.ResourceSelect;

type ResourceCardData =
  Prisma.ResourceGetPayload<{
    select: typeof resourceSelect;
  }>;

export default async function B2BResourcesPage({
  searchParams,
}: Props) {
  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const user =
    await db.user.findUnique({
      where: {
        id: session.user.id,
      },

      select: {
        role: true,
        approved: true,
        status: true,
      },
    });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    redirect("/agent-login");
  }

  const params =
    (await searchParams) ?? {};

  const q =
    params.q?.trim() ?? "";

  const categoryId =
    params.category?.trim() ??
    "";

  const destination =
    params.destination?.trim() ??
    "";

  const tourId =
    params.tour?.trim() ?? "";

  const where: Prisma.ResourceWhereInput =
    {
      audience:
        ResourceAudience.AGENT,

      status:
        ResourceStatus.ACTIVE,

      ...(categoryId
        ? {
            categoryId,
          }
        : {}),

      ...(destination
        ? {
            destinations: {
              has: destination,
            },
          }
        : {}),

      ...(tourId
        ? {
            tourId,
          }
        : {}),

      ...(q
        ? {
            OR: [
              {
                title: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                description: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                tags: {
                  has: q,
                },
              },

              {
                destinations: {
                  has: q,
                },
              },

              {
                category: {
                  is: {
                    name: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
              },

              {
                tour: {
                  is: {
                    title: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

  const [
    resources,
    featuredResources,
    categories,
    filterData,
    tours,
  ] = await Promise.all([
    db.resource.findMany({
      where,

      orderBy: [
        {
          featured: "desc",
        },
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      select: resourceSelect,
    }),

    db.resource.findMany({
      where: {
        audience:
          ResourceAudience.AGENT,

        status:
          ResourceStatus.ACTIVE,

        featured: true,
      },

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: 6,

      select: resourceSelect,
    }),

    db.resourceCategory.findMany({
      where: {
        audience:
          ResourceAudience.AGENT,

        isActive: true,
      },

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        name: true,
        parentId: true,

        parent: {
          select: {
            name: true,
          },
        },
      },
    }),

    db.resource.findMany({
      where: {
        audience:
          ResourceAudience.ADMIN,

        status:
          ResourceStatus.ACTIVE,
      },

      select: {
        destinations: true,
      },
    }),

    db.tour.findMany({
      where: {
        isPublished: true,

        resources: {
          some: {
            audience:
              ResourceAudience.AGENT,

            status:
              ResourceStatus.ACTIVE,
          },
        },
      },

      orderBy: {
        title: "asc",
      },

      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const destinations =
    Array.from(
      new Set(
        filterData.flatMap(
          (item) =>
            item.destinations
        )
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );

  const topCategories =
    categories.filter(
      (category) =>
        !category.parentId
    );

  const hasFilters =
    Boolean(
      q ||
        categoryId ||
        destination ||
        tourId
    );

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#001F3F] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-200">
                Agent Workspace
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Resources
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                Find sales materials,
                destination information,
                forms, training documents
                and tour resources prepared
                for Epoch Journeys partners.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/b2b/tours"
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                Browse Tours
              </Link>

              <Link
                href="/b2b/dashboard"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-100"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {featuredResources.length > 0 &&
      !hasFilters ? (
        <section>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#8B0000]" />

            <h2 className="text-xl font-bold text-[#001F3F]">
              Featured Resources
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Important or frequently used
            materials selected by Epoch Journeys.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredResources.map(
              (resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  featured
                />
              )
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-[#001F3F]" />

          <h2 className="text-xl font-bold text-[#001F3F]">
            Find Resources
          </h2>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Search
            </span>

            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Brochure, Italy, sales guide..."
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Folder
            </span>

            <select
              name="category"
              defaultValue={categoryId}
              className={inputClass}
            >
              <option value="">
                All folders
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.parent
                      ? `${category.parent.name} / ${category.name}`
                      : category.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Destination
            </span>

            <select
              name="destination"
              defaultValue={destination}
              className={inputClass}
            >
              <option value="">
                All destinations
              </option>

              {destinations.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Related Tour
            </span>

            <select
              name="tour"
              defaultValue={tourId}
              className={inputClass}
            >
              <option value="">
                All tours
              </option>

              {tours.map(
                (tour) => (
                  <option
                    key={tour.id}
                    value={tour.id}
                  >
                    {tour.title}
                  </option>
                )
              )}
            </select>
          </label>

          <div className="flex flex-wrap gap-2 lg:col-span-4">
            <button
              type="submit"
              className="h-11 rounded-xl bg-[#8B0000] px-5 text-sm font-semibold text-white hover:bg-[#6f0000]"
            >
              Apply Filters
            </button>

            <Link
              href="/b2b/resources"
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      {!hasFilters &&
      topCategories.length > 0 ? (
        <section>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#001F3F]" />

            <h2 className="text-xl font-bold text-[#001F3F]">
              Browse by Subject
            </h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topCategories.map(
              (category) => {
                const children =
                  categories.filter(
                    (candidate) =>
                      candidate.parentId ===
                      category.id
                  );

                return (
                  <div
                    key={category.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <Link
                      href={`/b2b/resources?category=${encodeURIComponent(
                        category.id
                      )}`}
                      className="font-bold text-[#001F3F] hover:text-[#8B0000]"
                    >
                      {category.name}
                    </Link>

                    {children.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {children.map(
                          (child) => (
                            <Link
                              key={child.id}
                              href={`/b2b/resources?category=${encodeURIComponent(
                                child.id
                              )}`}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-[#8B0000]"
                            >
                              {child.name}
                            </Link>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              }
            )}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl font-bold text-[#001F3F]">
          {hasFilters
            ? "Search Results"
            : "All Resources"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {resources.length}{" "}
          {resources.length === 1
            ? "resource"
            : "resources"}{" "}
          available.
        </p>

        {resources.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-[#001F3F]">
              No resources found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try clearing or changing
              the current filters.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resources.map(
              (resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ResourceCard({
  resource,
  featured = false,
}: {
  resource: ResourceCardData;
  featured?: boolean;
}) {
  const categoryLabel =
    resource.category
      ? resource.category.parent
        ? `${resource.category.parent.name} / ${resource.category.name}`
        : resource.category.name
      : "General";

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm ${
        featured
          ? "border-amber-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5 text-[#001F3F]">
          <FileText className="h-5 w-5" />
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {fileTypeLabel(
            resource.originalFileName
          )}
        </span>
      </div>

      <div className="mt-4 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8B0000]">
          {categoryLabel}
        </p>

        <h3 className="mt-1.5 text-lg font-bold leading-6 text-[#001F3F]">
          {resource.title}
        </h3>

        {resource.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {resource.description}
          </p>
        ) : null}

        {resource.tour ? (
          <p className="mt-3 text-xs text-slate-500">
            <span className="font-semibold">
              Tour:
            </span>{" "}
            {resource.tour.title}
          </p>
        ) : null}

        {resource.destinations.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {resource.destinations
              .slice(0, 4)
              .map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                  >
                    {item}
                  </span>
                )
              )}
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="mb-3 truncate text-xs text-slate-400">
          {resource.originalFileName} ·{" "}
          {formatFileSize(
            resource.fileSize
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/b2b/resources/${resource.id}/download?mode=open`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#002b57]"
          >
            <FileText className="h-4 w-4" />
            Open
          </a>

          <a
            href={`/api/b2b/resources/${resource.id}/download?mode=download`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#8B0000] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#6f0000]"
          >
            <Download className="h-4 w-4" />
            Download
          </a>

          {resource.tour ? (
            <Link
              href={`/b2b/tours/${resource.tour.id}`}
              className="inline-flex items-center rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              View Tour
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
