import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  Archive,
  FileText,
  FolderOpen,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ResourceAudience,
  ResourceStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import InitializeResourceCategoriesButton from "@/components/admin/resources/InitializeResourceCategoriesButton";
import ResourceActions from "@/components/admin/resources/ResurceActions";

type PageProps = {
  searchParams: Promise<{
    audience?: string;
    status?: string;
    category?: string;
    q?: string;
  }>;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function isAudience(value: string | undefined): value is ResourceAudience {
  return Boolean(
    value && Object.values(ResourceAudience).includes(value as ResourceAudience),
  );
}

function isStatus(value: string | undefined): value is ResourceStatus {
  return Boolean(
    value && Object.values(ResourceStatus).includes(value as ResourceStatus),
  );
}

export default async function AdminResourcesPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const query = await searchParams;
  const audience = isAudience(query.audience)
    ? query.audience
    : ResourceAudience.AGENT;
  const status = isStatus(query.status) ? query.status : ResourceStatus.ACTIVE;
  const categorySlug = query.category?.trim() || "";
  const search = query.q?.trim() || "";

  const categories = await db.resourceCategory.findMany({
    where: {
      audience,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { resources: true },
          },
        },
      },
      _count: {
        select: { resources: true },
      },
    },
  });

  const selectedCategory = categorySlug
    ? await db.resourceCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true, slug: true, name: true, audience: true },
      })
    : null;

  const resources = await db.resource.findMany({
    where: {
      audience,
      status,
      ...(selectedCategory && selectedCategory.audience === audience
        ? { categoryId: selectedCategory.id }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { originalFileName: { contains: search, mode: "insensitive" } },
              { tags: { has: search } },
              { destinations: { has: search } },
            ],
          }
        : {}),
    },
    orderBy: [
      { featured: "desc" },
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      category: {
        select: {
          name: true,
          slug: true,
          parent: { select: { name: true } },
        },
      },
      tour: {
        select: { id: true, title: true, tourCode: true },
      },
      uploadedBy: {
        select: { fullName: true, email: true },
      },
    },
  });

  const [agentActive, agentArchived, adminActive, adminArchived] =
    await Promise.all([
      db.resource.count({
        where: { audience: ResourceAudience.AGENT, status: ResourceStatus.ACTIVE },
      }),
      db.resource.count({
        where: { audience: ResourceAudience.AGENT, status: ResourceStatus.ARCHIVED },
      }),
      db.resource.count({
        where: { audience: ResourceAudience.ADMIN, status: ResourceStatus.ACTIVE },
      }),
      db.resource.count({
        where: { audience: ResourceAudience.ADMIN, status: ResourceStatus.ARCHIVED },
      }),
    ]);

  const rootCategories = categories.filter((category) => !category.parentId);
  const categoryCount = categories.length;

  const buildHref = (overrides: {
    audience?: ResourceAudience;
    status?: ResourceStatus;
    category?: string | null;
    q?: string | null;
  }) => {
    const params = new URLSearchParams();
    const nextAudience = overrides.audience ?? audience;
    const nextStatus = overrides.status ?? status;
    const nextCategory =
      overrides.category === undefined ? categorySlug : overrides.category;
    const nextSearch = overrides.q === undefined ? search : overrides.q;

    params.set("audience", nextAudience);
    params.set("status", nextStatus);
    if (nextCategory) params.set("category", nextCategory);
    if (nextSearch) params.set("q", nextSearch);

    return `/admin/resources?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl bg-[#001F3F] px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
              Epoch Journeys · Resource Library
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Resources
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Upload once, organize by subject, destination and tour, and keep
              Agent and Admin materials safely separated.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/resources/upload"
              className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Upload Resource
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Agent · Active"
          value={agentActive}
          icon={Users}
          href={buildHref({
            audience: ResourceAudience.AGENT,
            status: ResourceStatus.ACTIVE,
            category: null,
          })}
        />
        <SummaryCard
          label="Agent · Archived"
          value={agentArchived}
          icon={Archive}
          href={buildHref({
            audience: ResourceAudience.AGENT,
            status: ResourceStatus.ARCHIVED,
            category: null,
          })}
        />
        <SummaryCard
          label="Admin · Active"
          value={adminActive}
          icon={ShieldCheck}
          href={buildHref({
            audience: ResourceAudience.ADMIN,
            status: ResourceStatus.ACTIVE,
            category: null,
          })}
        />
        <SummaryCard
          label="Admin · Archived"
          value={adminArchived}
          icon={Archive}
          href={buildHref({
            audience: ResourceAudience.ADMIN,
            status: ResourceStatus.ARCHIVED,
            category: null,
          })}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Library
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={buildHref({
                  audience: ResourceAudience.AGENT,
                  category: null,
                })}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                  audience === ResourceAudience.AGENT
                    ? "border-[#8B0000] bg-red-50 text-[#8B0000]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                Agent
              </Link>

              <Link
                href={buildHref({
                  audience: ResourceAudience.ADMIN,
                  category: null,
                })}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                  audience === ResourceAudience.ADMIN
                    ? "border-[#001F3F] bg-slate-50 text-[#001F3F]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                Admin
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={buildHref({ status: ResourceStatus.ACTIVE })}
                className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${
                  status === ResourceStatus.ACTIVE
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                Active
              </Link>
              <Link
                href={buildHref({ status: ResourceStatus.ARCHIVED })}
                className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${
                  status === ResourceStatus.ARCHIVED
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                Archived
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Subject Folders
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {categoryCount} categories / subfolders
                </p>
              </div>
              <FolderOpen className="h-5 w-5 text-[#001F3F]" />
            </div>

            {categoryCount === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  No resource folders yet.
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Create the default Agent and Admin folder structure once.
                </p>
                <div className="mt-4">
                  <InitializeResourceCategoriesButton />
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <Link
                  href={buildHref({ category: null })}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold ${
                    !categorySlug
                      ? "bg-[#001F3F] text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All {audience === ResourceAudience.AGENT ? "Agent" : "Admin"} Resources
                </Link>

                {rootCategories.map((category) => (
                  <div key={category.id} className="rounded-xl border border-slate-100 p-2">
                    <Link
                      href={buildHref({ category: category.slug })}
                      className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold ${
                        categorySlug === category.slug
                          ? "bg-red-50 text-[#8B0000]"
                          : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span>{category.name}</span>
                      <span className="text-xs font-medium text-slate-400">
                        {category._count.resources}
                      </span>
                    </Link>

                    {category.children.length > 0 ? (
                      <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-3">
                        {category.children.map((child) => (
                          <Link
                            key={child.id}
                            href={buildHref({ category: child.slug })}
                            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs ${
                              categorySlug === child.slug
                                ? "bg-slate-100 font-semibold text-[#001F3F]"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span>{child.name}</span>
                            <span className="text-slate-400">{child._count.resources}</span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <form className="flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="audience" value={audience} />
              <input type="hidden" name="status" value={status} />
              {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={search}
                  placeholder="Search title, file name, tag or destination..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002b57]"
              >
                Search
              </button>

              {search ? (
                <Link
                  href={buildHref({ q: null })}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300"
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
                  {audience === ResourceAudience.AGENT ? "Agent Resources" : "Admin Resources"}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  {selectedCategory?.name || (status === ResourceStatus.ACTIVE ? "Active Library" : "Archive")}
                </h2>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {resources.length} {resources.length === 1 ? "resource" : "resources"}
              </div>
            </div>

            {resources.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <FileText className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">No resources found.</p>
                <p className="mt-1 text-sm text-slate-500">
                  {categoryCount === 0
                    ? "Create the folder structure first, then upload resources."
                    : status === ResourceStatus.ARCHIVED
                      ? "Archived resources will appear here."
                      : "Upload the first resource for this library."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {resources.map((resource) => (
                  <div key={resource.id} className="px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{resource.title}</p>
                          {resource.featured ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              Featured
                            </span>
                          ) : null}
                        </div>

                        {resource.description ? (
                          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                            {resource.description}
                          </p>
                        ) : null}

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{resource.originalFileName}</span>
                          <span>· {formatFileSize(resource.fileSize)}</span>
                          <span>· {formatDate(resource.createdAt)}</span>
                          {resource.category ? (
                            <span>
                              · {resource.category.parent?.name ? `${resource.category.parent.name} / ` : ""}
                              {resource.category.name}
                            </span>
                          ) : null}
                          {resource.tour ? (
                            <span>· {resource.tour.tourCode ? `${resource.tour.tourCode} — ` : ""}{resource.tour.title}</span>
                          ) : null}
                        </div>

                        {resource.destinations.length > 0 || resource.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {resource.destinations.map((destination) => (
                              <span key={`destination-${resource.id}-${destination}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {destination}
                              </span>
                            ))}
                            {resource.tags.map((tag) => (
                              <span key={`tag-${resource.id}-${tag}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <a
                          href={`/api/admin/resources/${resource.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50"
                        >
                          Open
                        </a>
                        <ResourceActions
                          resourceId={resource.id}
                          title={resource.title}
                          status={resource.status}
                          editHref={`/admin/resources/${resource.id}/edit`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-slate-100 p-2.5 text-[#001F3F]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-2xl font-bold text-slate-950">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700">{label}</p>
    </Link>
  );
}
