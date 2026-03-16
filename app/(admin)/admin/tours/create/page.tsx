import { db } from "@/lib/db";
import { redirect } from "next/navigation";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

async function createTour(formData: FormData) {
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

  const slug = generateSlug(title);

  const destinations = parseCommaSeparated(formData.get("destinations"));
  const subcategories = parseCommaSeparated(formData.get("subcategories"));
  const tags = parseCommaSeparated(formData.get("tags"));
  const highlights = parseCommaSeparated(formData.get("highlights"));
  const inclusions = parseCommaSeparated(formData.get("inclusions"));
  const exclusions = parseCommaSeparated(formData.get("exclusions"));
  const accommodations = parseCommaSeparated(formData.get("accommodations"));

  await db.tour.create({
    data: {
      title,
      category,
      subcategories,
      tags,
      destinations,
      duration,
      shortDescription: parseOptionalString(formData.get("shortDescription")),
      overview: parseOptionalString(formData.get("overview")),
      tourIntroduction: parseOptionalString(formData.get("tourIntroduction")),
      tourSignificance: parseOptionalString(formData.get("tourSignificance")),
      destinationBriefs: parseOptionalString(formData.get("destinationBriefs")),
      highlights,
      inclusions,
      exclusions,
      accommodations,
      overviewItinerary: parseOptionalString(formData.get("overviewItinerary")),
      itinerary: parseOptionalString(formData.get("itinerary")),
      mainImageUrl: null,
      mapImageUrl: null,
      brochureUrl: null,
      featured: formData.get("featured") === "on",
      isPublished: formData.get("isPublished") === "on",
      requiresQuote: formData.get("requiresQuote") === "on",
    },
  });

  redirect("/admin/tours");
}

export default function CreateTourPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Tour</h1>
        <p className="text-sm text-muted-foreground">
          Add a new pilgrimage, cultural, historical, or thematic tour.
        </p>
      </div>

      <form
        action={createTour}
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
                required
                className="mt-1 w-full rounded border p-2"
                placeholder="St Paul Greece Pilgrimage"
              />
            </div>

            <div>
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue=""
                className="mt-1 w-full rounded border p-2"
              >
                <option value="" disabled>
                  Select category
                </option>
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
                required
                className="mt-1 w-full rounded border p-2"
                placeholder="10"
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
                className="mt-1 w-full rounded border p-2"
                placeholder="A short summary that agents can understand quickly."
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
                className="mt-1 w-full rounded border p-2"
                placeholder="Greece, Turkey, Italy"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple destinations with commas.
              </p>
            </div>

            <div>
              <label htmlFor="subcategories" className="text-sm font-medium">
                Subcategories
              </label>
              <input
                id="subcategories"
                name="subcategories"
                className="mt-1 w-full rounded border p-2"
                placeholder="Biblical Heritage, Early Christianity, UNESCO"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple subcategories with commas.
              </p>
            </div>

            <div>
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                className="mt-1 w-full rounded border p-2"
                placeholder="St Paul, Church History, Faith & Culture"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple tags with commas.
              </p>
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
                className="mt-1 w-full rounded border p-2"
                placeholder="Briefly introduce the purpose and focus of this tour."
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
                className="mt-1 w-full rounded border p-2"
                placeholder="Explain the spiritual, cultural, historical, or thematic importance of this tour."
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
                className="mt-1 w-full rounded border p-2"
                placeholder="Give brief information about the destinations included in the itinerary."
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
                className="mt-1 w-full rounded border p-2"
                placeholder="General overview of the tour program."
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
                className="mt-1 w-full rounded border p-2"
                placeholder="Mars Hill, Philippi, Thessaloniki, Corinth"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple highlights with commas.
              </p>
            </div>

            <div>
              <label htmlFor="inclusions" className="text-sm font-medium">
                Inclusions
              </label>
              <input
                id="inclusions"
                name="inclusions"
                className="mt-1 w-full rounded border p-2"
                placeholder="Hotels, Meals, Guide, Transportation, Entrance Fees"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple inclusions with commas.
              </p>
            </div>

            <div>
              <label htmlFor="exclusions" className="text-sm font-medium">
                Exclusions
              </label>
              <input
                id="exclusions"
                name="exclusions"
                className="mt-1 w-full rounded border p-2"
                placeholder="Flights, Insurance, Tips, Personal Expenses"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple exclusions with commas.
              </p>
            </div>

            <div>
              <label htmlFor="accommodations" className="text-sm font-medium">
                Accommodations
              </label>
              <input
                id="accommodations"
                name="accommodations"
                className="mt-1 w-full rounded border p-2"
                placeholder="4-star hotels, boutique hotels, monastery guesthouse"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate multiple accommodation notes with commas.
              </p>
            </div>
          </div>
        </section>

        {/* Itinerary */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Itinerary</h2>
            <p className="text-sm text-muted-foreground">
              Add overview itinerary notes now. We will build a more advanced day-by-day builder next.
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
                className="mt-1 w-full rounded border p-2"
                placeholder="Day 1 Athens, Day 2 Philippi, Day 3 Thessaloniki..."
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
                className="mt-1 w-full rounded border p-2"
                placeholder="Add the detailed day-by-day itinerary here for now."
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
              <input type="checkbox" name="isPublished" />
              Published
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requiresQuote" />
              Requires Quote
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
          >
            Create Tour
          </button>
        </div>
      </form>
    </div>
  );
}