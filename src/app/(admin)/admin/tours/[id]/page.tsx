import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tour = await db.tour.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      duration: true,
      overview: true,
      mainImageUrl: true,
      isPublished: true,
      privateGroupPricingPlans: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          year: true,
        },
        orderBy: {
          year: "desc",
        },
      },
    },
  });

  if (!tour) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Admin · Tours
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            {tour.title}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {tour.category} · {tour.duration} days
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/tours/${tour.id}/private-group-pricing`}
            className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          >
            Private Group Pricing
          </Link>

          <Link
            href={`/admin/tours/${tour.id}/edit`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#001F3F] hover:text-[#001F3F]"
          >
            Edit Tour
          </Link>

          <Link
            href="/admin/tours"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#001F3F] hover:text-[#001F3F]"
          >
            Back to Tours
          </Link>
        </div>
      </div>

      {tour.mainImageUrl ? (
        <div className="relative h-72 w-full overflow-hidden rounded-2xl border bg-slate-100 shadow-sm">
          <Image
            src={tour.mainImageUrl}
            alt={tour.title}
            fill
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Overview
          </h2>

          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
            {tour.overview || "No overview"}
          </p>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Publishing
            </p>

            <p className="mt-2 font-semibold text-[#001F3F]">
              {tour.isPublished ? "Published" : "Draft"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Private Group Pricing
            </p>

            {tour.privateGroupPricingPlans.length > 0 ? (
              <>
                <p className="mt-2 font-semibold text-[#001F3F]">
                  {tour.privateGroupPricingPlans.length} active pricing year
                  {tour.privateGroupPricingPlans.length === 1 ? "" : "s"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Latest: {tour.privateGroupPricingPlans[0].year}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No private-group pricing has been created yet.
              </p>
            )}

            <Link
              href={`/admin/tours/${tour.id}/private-group-pricing`}
              className="mt-4 inline-flex text-sm font-semibold text-[#8B0000] hover:underline"
            >
              Manage pricing →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
