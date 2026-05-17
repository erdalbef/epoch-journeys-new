"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import DeleteTourButton from "@/components/admin/DeleteTourButton";
import ArchiveTourButton from "@/components/admin/ArchiveTourButton";
import RepublishTourButton from "@/components/admin/RepublishTourButton";

type TourCardItem = {
  id: string;
  title: string;
  category: string;
  duration: number;
  mainImageUrl: string | null;
  isPublished: boolean;
  featured: boolean;
  isProtected: boolean;
};

type Props = {
  tours: TourCardItem[];
};

export default function ToursBulkActions({ tours }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState<"archive" | "republish" | "delete">(
    "archive"
  );

  const selectedCount = selectedIds.length;

  const allSelected =
    tours.length > 0 && selectedIds.length === tours.length;

  const selectableForDelete = useMemo(
    () => tours.filter((tour) => !tour.isProtected).map((tour) => tour.id),
    [tours]
  );

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(tours.map((tour) => tour.id));
  }

  function handleBulkSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (selectedIds.length === 0) {
      e.preventDefault();
      window.alert("Please select at least one tour.");
      return;
    }

    if (action === "delete") {
      const invalidDelete = selectedIds.some(
        (id) => !selectableForDelete.includes(id)
      );

      if (invalidDelete) {
        e.preventDefault();
        window.alert(
          "One or more selected tours cannot be deleted because they are already in use."
        );
        return;
      }
    }

    const confirmed = window.confirm(
      `Apply "${action}" to ${selectedIds.length} selected tour${
        selectedIds.length === 1 ? "" : "s"
      }?`
    );

    if (!confirmed) {
      e.preventDefault();
    }
  }

  return (
    <div className="space-y-6">
      <form
        action="/api/tours/bulk-action"
        method="POST"
        onSubmit={handleBulkSubmit}
        className="rounded-lg border bg-white p-4"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAll}
              className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
            >
              {allSelected ? "Unselect All" : "Select All"}
            </button>

            <div className="text-sm text-muted-foreground">
              {selectedCount} selected
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              name="actionType"
              value={action}
              onChange={(e) =>
                setAction(
                  e.target.value as "archive" | "republish" | "delete"
                )
              }
              className="rounded border p-2 text-sm"
            >
              <option value="archive">Archive</option>
              <option value="republish">Republish</option>
              <option value="delete">Delete</option>
            </select>

            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="tourIds" value={id} />
            ))}

            <button
              type="submit"
              className="rounded bg-[#001F3F] px-4 py-2 text-sm text-white hover:opacity-90"
            >
              Apply Bulk Action
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Delete works only for tours that are not linked to bookings, quotes,
          or used departures.
        </div>
      </form>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tours.map((tour) => {
          const isArchived = !tour.isPublished;
          const isChecked = selectedIds.includes(tour.id);

          return (
            <div
              key={tour.id}
              className={`overflow-hidden rounded-lg border bg-white shadow-sm ${
                isChecked ? "ring-2 ring-[#001F3F]" : ""
              }`}
            >
              <div className="relative h-48 w-full bg-gray-100">
                {tour.mainImageUrl ? (
                  <Image
                    src={tour.mainImageUrl}
                    alt={tour.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No Image
                  </div>
                )}

                <div className="absolute left-2 top-2 flex gap-2">
                  {tour.isPublished ? (
                    <span className="rounded bg-green-600 px-2 py-1 text-xs text-white">
                      Published
                    </span>
                  ) : (
                    <span className="rounded bg-gray-600 px-2 py-1 text-xs text-white">
                      Archived
                    </span>
                  )}

                  {tour.featured && (
                    <span className="rounded bg-yellow-500 px-2 py-1 text-xs text-white">
                      Featured
                    </span>
                  )}

                  {tour.isProtected && (
                    <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
                      In Use
                    </span>
                  )}
                </div>

                <label className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOne(tour.id)}
                    className="mr-2"
                  />
                  Select
                </label>
              </div>

              <div className="space-y-2 p-4">
                <h2 className="line-clamp-2 text-lg font-semibold">
                  {tour.title}
                </h2>

                <p className="text-sm text-gray-500">
                  {tour.category} • {tour.duration} days
                </p>

                <div className="pt-1 text-xs text-muted-foreground">
                  {tour.isProtected
                    ? "This tour is linked to bookings, quotes, or used departures."
                    : "This tour can be deleted safely."}
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="flex gap-3 text-sm">
                    <Link
                      href={`/admin/tours/${tour.id}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>

                    <Link
                      href={`/admin/tours/${tour.id}`}
                      className="text-gray-600 hover:underline"
                    >
                      View
                    </Link>
                  </div>

                  <div className="text-sm">
                    {isArchived ? (
                      <RepublishTourButton
                        tourId={tour.id}
                        tourTitle={tour.title}
                      />
                    ) : tour.isProtected ? (
                      <ArchiveTourButton
                        tourId={tour.id}
                        tourTitle={tour.title}
                      />
                    ) : (
                      <DeleteTourButton
                        tourId={tour.id}
                        tourTitle={tour.title}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}