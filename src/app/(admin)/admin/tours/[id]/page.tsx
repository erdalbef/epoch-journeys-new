import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tour = await db.tour.findUnique({
    where: { id },
  });

  if (!tour) return notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{tour.title}</h1>

      {tour.mainImageUrl && (
        <div className="relative h-64 w-full">
          <Image
            src={tour.mainImageUrl}
            alt={tour.title}
            fill
            className="object-cover rounded"
          />
        </div>
      )}

      <p className="text-gray-600">
        {tour.category} • {tour.duration} days
      </p>

      <div className="space-y-2">
        <h2 className="font-medium">Overview</h2>
        <p>{tour.overview || "No overview"}</p>
      </div>
    </div>
  );
}