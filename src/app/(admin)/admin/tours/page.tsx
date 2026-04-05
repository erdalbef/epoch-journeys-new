import { db } from "@/lib/db";
import Link from "next/link";

function getPricingTypeLabel(pricingType: string) {
  switch (pricingType) {
    case "FIXED_GROUP":
      return "Scheduled Departure";
    case "GROUP_BASED":
      return "Group Based / Quote";
    case "FIT_DYNAMIC":
      return "Private On Request";
    case "FIT_FIXED":
      return "Private Fixed";
    case "FIT_TIERED":
      return "Private 1–8 Pax";
    default:
      return pricingType;
  }
}

function getCommercialSummary(tour: {
  pricingType: string;
  requiresQuote: boolean;
  privatePricing: unknown;
}) {
  if (tour.pricingType === "FIXED_GROUP") {
    return "Departure dates pricing";
  }

  if (tour.pricingType === "FIT_TIERED") {
    return "Private pricing 1–8 pax";
  }

  if (tour.pricingType === "FIT_FIXED") {
    return "Private fixed structure";
  }

  if (tour.pricingType === "GROUP_BASED") {
    return tour.requiresQuote ? "Quote required" : "Group pricing";
  }

  if (tour.pricingType === "FIT_DYNAMIC") {
    return "Private on request";
  }

  if (tour.privatePricing) {
    return "Private pricing configured";
  }

  return "Not configured";
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "muted" | "info";
}) {
  const styles =
    variant === "success"
      ? "bg-green-100 text-green-700"
      : variant === "info"
      ? "bg-blue-100 text-blue-700"
      : variant === "muted"
      ? "bg-gray-100 text-gray-600"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

export default async function AdminToursPage() {
  const tours = await db.tour.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      category: true,
      destinations: true,
      duration: true,
      pricingType: true,
      privatePricing: true,
      requiresQuote: true,
      isPublished: true,
      featured: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tours</h1>
          <p className="text-sm text-muted-foreground">
            Manage pilgrimage, cultural, historical, and thematic tours.
          </p>
        </div>

        <Link
          href="/admin/tours/create"
          className="rounded-md bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800"
        >
          + Create Tour
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Destinations</th>
                <th className="p-3 text-left">Duration</th>
                <th className="p-3 text-left">Pricing Type</th>
                <th className="p-3 text-left">Commercial Setup</th>
                <th className="p-3 text-left">Published</th>
                <th className="p-3 text-left">Featured</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {tours.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    No tours created yet.
                  </td>
                </tr>
              ) : (
                tours.map((tour) => (
                  <tr key={tour.id} className="border-b last:border-b-0">
                    <td className="p-3 font-medium text-[#001F3F]">
                      {tour.title}
                    </td>

                    <td className="p-3">
                      {tour.category}
                    </td>

                    <td className="p-3 text-muted-foreground">
                      {tour.destinations?.length > 0
                        ? tour.destinations.join(", ")
                        : "-"}
                    </td>

                    <td className="p-3">
                      {tour.duration} days
                    </td>

                    <td className="p-3">
                      <Badge>
                        {getPricingTypeLabel(tour.pricingType)}
                      </Badge>
                    </td>

                    <td className="p-3 text-muted-foreground">
                      {getCommercialSummary(tour)}
                    </td>

                    <td className="p-3">
                      {tour.isPublished ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="muted">Draft</Badge>
                      )}
                    </td>

                    <td className="p-3">
                      {tour.featured ? (
                        <Badge variant="info">Featured</Badge>
                      ) : (
                        <Badge variant="muted">No</Badge>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-4">
                        <Link
                          href={`/admin/tours/${tour.id}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>

                        <Link
                          href={`/admin/tours/${tour.id}/departures`}
                          className="text-blue-600 hover:underline"
                        >
                          Departures
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}