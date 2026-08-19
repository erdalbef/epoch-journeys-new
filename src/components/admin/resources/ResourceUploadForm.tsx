"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, FolderOpen, ShieldCheck, Users } from "lucide-react";
import { ResourceAudience } from "@prisma/client";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  audience: ResourceAudience;
  parentId: string | null;
  parent: { name: string } | null;
};

type TourOption = {
  id: string;
  title: string;
  tourCode: string | null;
  destinations: string[];
};

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
const labelClass = "block text-sm font-semibold text-slate-700";

export default function ResourceUploadForm({
  categories,
  tours,
}: {
  categories: CategoryOption[];
  tours: TourOption[];
}) {
  const router = useRouter();
  const [audience, setAudience] = useState<ResourceAudience>(ResourceAudience.AGENT);
  const [categoryId, setCategoryId] = useState("");
  const [tourId, setTourId] = useState("");
  const [destinations, setDestinations] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.audience === audience),
    [audience, categories],
  );

  function changeAudience(next: ResourceAudience) {
    setAudience(next);
    setCategoryId("");
  }

  function changeTour(id: string) {
    setTourId(id);
    const tour = tours.find((item) => item.id === id);
    if (tour && !destinations.trim() && tour.destinations.length > 0) {
      setDestinations(tour.destinations.join(", "));
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("audience", audience);
      formData.set("categoryId", categoryId);
      formData.set("tourId", tourId);
      formData.set("destinations", destinations);
      formData.set("tags", tags);

      const response = await fetch("/api/admin/resources/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Could not upload resource.");
        return;
      }

      router.push(`/admin/resources?audience=${audience}&status=ACTIVE`);
      router.refresh();
    } catch {
      setError("Could not upload resource. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl bg-[#001F3F] px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
              Epoch Journeys · Resource Library
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Upload Resource</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Upload the file once, then classify it so the right people can find it quickly.
            </p>
          </div>
          <Link
            href="/admin/resources"
            className="w-fit rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
          >
            Back to Resources
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-[#001F3F]">1. Who can access this resource?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Agent Resources are visible to approved agents. Admin Resources remain internal.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => changeAudience(ResourceAudience.AGENT)}
              className={`rounded-2xl border p-4 text-left transition ${
                audience === ResourceAudience.AGENT
                  ? "border-[#8B0000] bg-red-50 ring-2 ring-red-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Users className="h-5 w-5 text-[#001F3F]" />
              <p className="mt-3 font-bold text-slate-900">Agent Resource</p>
              <p className="mt-1 text-sm text-slate-500">Available to agents in their resource library.</p>
            </button>

            <button
              type="button"
              onClick={() => changeAudience(ResourceAudience.ADMIN)}
              className={`rounded-2xl border p-4 text-left transition ${
                audience === ResourceAudience.ADMIN
                  ? "border-[#8B0000] bg-red-50 ring-2 ring-red-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <ShieldCheck className="h-5 w-5 text-[#001F3F]" />
              <p className="mt-3 font-bold text-slate-900">Admin Resource</p>
              <p className="mt-1 text-sm text-slate-500">Internal material. Agents cannot access it.</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#8B0000]" />
            <h2 className="text-lg font-bold text-[#001F3F]">2. File & classification</h2>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className={`${labelClass} md:col-span-2`}>
              Title *
              <input name="title" required maxLength={180} className={inputClass} placeholder="e.g. Italy Pilgrimage Sales Guide 2027" />
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Description
              <textarea name="description" className={`${inputClass} min-h-24 py-3`} placeholder="Short explanation of what this file contains and when it should be used." />
            </label>

            <label className={labelClass}>
              Folder / Category *
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                className={inputClass}
              >
                <option value="">Select folder</option>
                {visibleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parent ? `${category.parent.name} / ${category.name}` : category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Related Tour (optional)
              <select value={tourId} onChange={(event) => changeTour(event.target.value)} className={inputClass}>
                <option value="">No specific tour</option>
                {tours.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.tourCode ? `${tour.tourCode} — ` : ""}{tour.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Destinations
              <input
                value={destinations}
                onChange={(event) => setDestinations(event.target.value)}
                className={inputClass}
                placeholder="Italy, Rome, Assisi"
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">Separate with commas.</span>
            </label>

            <label className={labelClass}>
              Tags
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className={inputClass}
                placeholder="Catholic, sales, brochure"
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">Separate with commas.</span>
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              File *
              <div className="mt-1.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-white p-2.5 text-[#001F3F] shadow-sm">
                    <FileUp className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <input
                      name="file"
                      type="file"
                      required
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.zip"
                      className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#001F3F] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#002b57]"
                      onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      PDF, Office documents, images or ZIP. Maximum 25 MB.
                    </p>
                    {fileName ? <p className="mt-2 text-xs font-semibold text-[#001F3F]">Selected: {fileName}</p> : null}
                  </div>
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 md:col-span-2">
              <input name="featured" type="checkbox" value="true" className="mt-1 h-4 w-4" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Featured resource</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Featured files appear before normal resources in the library.
                </span>
              </span>
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/admin/resources" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Uploading..." : "Upload Resource"}
          </button>
        </div>
      </form>
    </div>
  );
}
