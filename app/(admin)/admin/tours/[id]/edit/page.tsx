import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function joinArray(arr: string[] | null) {
  if (!arr) return "";
  return arr.join(", ");
}

function parseCommaSeparated(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function updateTour(id: string, formData: FormData) {
  "use server";

  const titleValue = formData.get("title");
  const categoryValue = formData.get("category");
  const durationValue = formData.get("duration");

  if (
    typeof titleValue !== "string" ||
    typeof categoryValue !== "string" ||
    typeof durationValue !== "string"
  ) {
    return;
  }

  const title = titleValue.trim();
  const category = categoryValue.trim();
  const duration = Number(durationValue);

  if (!title || !category || Number.isNaN(duration) || duration < 1) {
    return;
  }

  await db.tour.update({
    where: { id },
    data: {
      title,
      category,
      duration,
      destinations: parseCommaSeparated(formData.get("destinations")),
      subcategories: parseCommaSeparated(formData.get("subcategories")),
      tags: parseCommaSeparated(formData.get("tags")),
      highlights: parseCommaSeparated(formData.get("highlights")),
      inclusions: parseCommaSeparated(formData.get("inclusions")),
      exclusions: parseCommaSeparated(formData.get("exclusions")),
      accommodations: parseCommaSeparated(formData.get("accommodations")),

      shortDescription: parseOptionalString(formData.get("shortDescription")),
      overview: parseOptionalString(formData.get("overview")),
      tourIntroduction: parseOptionalString(formData.get("tourIntroduction")),
      tourSignificance: parseOptionalString(formData.get("tourSignificance")),
      destinationBriefs: parseOptionalString(formData.get("destinationBriefs")),

      overviewItinerary: parseOptionalString(formData.get("overviewItinerary")),
      itinerary: parseOptionalString(formData.get("itinerary")),

      isPublished: formData.get("isPublished") === "on",
      featured: formData.get("featured") === "on",
      requiresQuote: formData.get("requiresQuote") === "on",
    },
  });

  redirect("/admin/tours");
}

export default async function EditTourPage({ params }: PageProps) {
  const { id } = await params;

  const tour = await db.tour.findUnique({
    where: { id },
  });

  if (!tour) {
    notFound();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Tour</h1>
        <p className="text-sm text-muted-foreground">
          Update the tour details, content, and settings.
        </p>
      </div>

      <form
        action={updateTour.bind(null, tour.id)}
        className="space-y-8 rounded-lg border bg-white p-6"
      >
        {/* Basic Information */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Basic Information</h2>
            <p className="text-sm text-muted-foreground">
              Core identity and quick summary of the tour.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="title" className="text-sm font-medium">
                Tour Title
              </label>
              <input
                id="title"
                name="title"
                defaultValue={tour.title}
                required
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={tour.category}
                required
                className="mt-1 w-full rounded border p-2"
              >
                <option value="Pilgrimage">Pilgrimage</option>
                <option value="Cultural">Cultural</option>
                <option value="Historical">Historical</option>
                <option value="Thematic">Thematic</option>
                <option value="Special Interest">Special Interest</option>
              </select>
            </div>

            <div>
              <label htmlFor="duration" className="text-sm font-medium">
                Duration (Days)
              </label>
              <input
                id="duration"
                name="duration"
                type="number"
                min="1"
                defaultValue={tour.duration}
                required
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="shortDescription" className="text-sm font-medium">
                Short Description
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                rows={3}
                defaultValue={tour.shortDescription ?? ""}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
          </div>
        </section>

        {/* Classification */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Classification</h2>
            <p className="text-sm text-muted-foreground">
              Destinations, subcategories, and tags for better organization.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label htmlFor="destinations" className="text-sm font-medium">
                Destinations
              </label>
              <input
                id="destinations"
                name="destinations"
                defaultValue={joinArray(tour.destinations)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="subcategories" className="text-sm font-medium">
                Subcategories
              </label>
              <input
                id="subcategories"
                name="subcategories"
                defaultValue={joinArray(tour.subcategories)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                defaultValue={joinArray(tour.tags)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
          </div>
        </section>

        {/* Tour Meaning and Content */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Tour Meaning and Content</h2>
            <p className="text-sm text-muted-foreground">
              Explain what makes this tour important and meaningful.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label htmlFor="tourIntroduction" className="text-sm font-medium">
                Tour Introduction
              </label>
              <textarea
                id="tourIntroduction"
                name="tourIntroduction"
                rows={4}
                defaultValue={tour.tourIntroduction ?? ""}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="tourSignificance" className="text-sm font-medium">
                Why This Tour Matters
              </label>
              <textarea
                id="tourSignificance"
                name="tourSignificance"
                rows={5}
                defaultValue={tour.tourSignificance ?? ""}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="destinationBriefs" className="text-sm font-medium">
                Destination Briefs
              </label>
              <textarea
                id="destinationBriefs"
                name="destinationBriefs"
                rows={6}
                defaultValue={tour.destinationBriefs ?? ""}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="overview" className="text-sm font-medium">
                General Overview
              </label>
              <textarea
                id="overview"
                name="overview"
                rows={5}
                defaultValue={tour.overview ?? ""}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
          </div>
        </section>

        {/* Sales Content */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Sales Content</h2>
            <p className="text-sm text-muted-foreground">
              Main selling points and operational inclusions.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label htmlFor="highlights" className="text-sm font-medium">
                Highlights
              </label>
              <input
                id="highlights"
                name="highlights"
                defaultValue={joinArray(tour.highlights)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="inclusions" className="text-sm font-medium">
                Inclusions
              </label>
              <input
                id="inclusions"
                name="inclusions"
                defaultValue={joinArray(tour.inclusions)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="exclusions" className="text-sm font-medium">
                Exclusions
              </label>
              <input
                id="exclusions"
                name="exclusions"
                defaultValue={joinArray(tour.exclusions)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="accommodations" className="text-sm font-medium">
                Accommodations
              </label>
              <input
                id="accommodations"
                name="accommodations"
                defaultValue={joinArray(tour.accommodations)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
          </div>
        </section>

        {/* Itinerary */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Itinerary</h2>
            <p className="text-sm text-muted-foreground">
              Overview and detailed itinerary content.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label htmlFor="overviewItinerary" className="text-sm font-medium">
                Overview Itinerary
              </label>
              <textarea
                id="overviewItinerary"
                name="overviewItinerary"
                rows={4}
                defaultValue={tour.overviewItinerary ?? ""}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="itinerary" className="text-sm font-medium">
                Detailed Itinerary
              </label>
              <textarea
                id="itinerary"
                name="itinerary"
                rows={8}
                defaultValue={tour.itinerary ?? ""}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
          </div>
        </section>

        {/* Settings */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Control how the tour behaves in the platform.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={tour.isPublished}
              />
              Published
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={tour.featured}
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="requiresQuote"
                defaultChecked={tour.requiresQuote}
              />
              Requires Quote
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
          >
            Update Tour
          </button>
        </div>
      </form>
    </div>
  );
}