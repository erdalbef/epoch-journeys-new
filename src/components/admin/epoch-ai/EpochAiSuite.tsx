"use client";

import { useEffect, useState } from "react";
import EpochAiWorkspace from "./EpochAiWorkspace";
import EpochItineraryAssistant from "./EpochItineraryAssistant";
import EpochPilgrimageStoryAssistant from "./EpochPilgrimageStoryAssistant";
import EpochTourDocumentImport from "./EpochTourDocumentImport";
import type { TourImportDraft } from "@/lib/epoch-ai/tourImportDraft";
import type { PilgrimageStoryDraft } from "@/lib/epoch-ai/pilgrimageStoryDraft";

type Tab = "chat" | "import" | "itinerary" | "story";

const tabs: { id: Tab; label: string }[] = [
  { id: "chat", label: "Chat & Analysis" },
  { id: "import", label: "Tour Import" },
  { id: "itinerary", label: "Itinerary Builder" },
  { id: "story", label: "Pilgrimage Story" },
];

const DRAFT_STORAGE_KEY = "epoch-ai-working-draft-v1";

type StoredDraft = {
  revise?: boolean;
  version: 1;
  title: string;
  duration: number;
  destinations: string;
  arrivalCity: string;
  departureCity: string;
  itinerary: string;
  overview: string;
};

function isStoredDraft(value: unknown): value is StoredDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;

  return (
    draft.version === 1 &&
    (draft.revise === undefined || typeof draft.revise === "boolean") &&
    typeof draft.title === "string" &&
    draft.title.length <= 180 &&
    typeof draft.duration === "number" &&
    Number.isInteger(draft.duration) &&
    draft.duration >= 1 &&
    draft.duration <= 40 &&
    typeof draft.destinations === "string" &&
    draft.destinations.length <= 2000 &&
    typeof draft.arrivalCity === "string" &&
    draft.arrivalCity.length <= 120 &&
    typeof draft.departureCity === "string" &&
    draft.departureCity.length <= 120 &&
    typeof draft.itinerary === "string" &&
    draft.itinerary.length <= 24000 &&
    typeof draft.overview === "string" &&
    draft.overview.length <= 5000
  );
}
export default function EpochAiSuite() {
  const [tab, setTab] = useState<Tab>("chat");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(12);
  const [destinations, setDestinations] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [itinerary, setItinerary] = useState("");
  const [overview, setOverview] = useState("");
  const [revise, setRevise] = useState(false);
  const [importedTour, setImportedTour] = useState<TourImportDraft | null>(null);
  const [story, setStory] = useState<PilgrimageStoryDraft | null>(null);

  const [draftLoaded, setDraftLoaded] = useState(false);
  const [storageStatus, setStorageStatus] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        if (isStoredDraft(parsed)) {
          setTitle(parsed.title);
          setDuration(parsed.duration);
          setDestinations(parsed.destinations);
          setArrivalCity(parsed.arrivalCity);
          setDepartureCity(parsed.departureCity);
          setItinerary(parsed.itinerary);
          setOverview(parsed.overview);
          setRevise(parsed.revise === true);
          setStorageStatus("Working draft restored from this browser.");
        } else {
          setStorageStatus("Saved draft format was not recognized.");
        }
      }
    } catch {
      setStorageStatus("Browser draft recovery is unavailable.");
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;

    try {
      if (
        !title.trim() &&
        !destinations.trim() &&
        !arrivalCity.trim() &&
        !departureCity.trim() &&
        !itinerary.trim() &&
        !overview.trim()
      ) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }

      const draft: StoredDraft = {
        version: 1,
        revise,
        title,
        duration,
        destinations,
        arrivalCity,
        departureCity,
        itinerary,
        overview,
      };

      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(draft),
      );
      setStorageStatus("Working draft saved in this browser.");
    } catch {
      setStorageStatus("Unable to save draft in this browser.");
    }
  }, [
    draftLoaded,
    revise,
    title,
    duration,
    destinations,
    arrivalCity,
    departureCity,
    itinerary,
    overview,
  ]);

  function clearWorkingDraft() {
    if (!window.confirm(
      "Clear the temporary Epoch AI working draft from this browser? This cannot be undone."
    )) return;

    setTitle("");
    setDuration(12);
    setDestinations("");
    setArrivalCity("");
    setDepartureCity("");
    setItinerary("");
    setOverview("");
    setImportedTour(null);
    setRevise(false);
    setStory(null);

    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setStorageStatus("Working draft cleared.");
    } catch {
      setStorageStatus("Unable to clear stored draft.");
    }
  }
  function applyImport(draft: TourImportDraft) {
    setTitle(draft.title);
    setDuration(draft.duration);
    setDestinations(draft.destinations.join(", "));
    setArrivalCity(draft.arrivalCity);
    setDepartureCity(draft.departureCity);
    setItinerary(draft.itinerary);
    setOverview(draft.overviewItinerary);
    setImportedTour(draft);
    setStory(null);
    setTab("itinerary");
  }

  function applyItinerary(nextItinerary: string, nextOverview: string) {
    setItinerary(nextItinerary);
    setOverview(nextOverview);
    setStory(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <p role="status" className="text-xs text-slate-600">
          {storageStatus || "Working draft is temporary and browser-local."}
        </p>
        <button
          type="button"
          onClick={clearWorkingDraft}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Clear Draft
        </button>
      </div>
      <nav
        aria-label="Epoch AI tools"
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={
              "rounded-lg px-4 py-2 text-sm font-semibold " +
              (tab === item.id
                ? "bg-[#001F3F] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200")
            }
          >
            {item.label}
          </button>
        ))}
      </nav>

      <p className="text-sm text-slate-600">
        AI working drafts are temporary. Applying a proposal updates only
        this page. Nothing is saved to the Tours database or published.
      </p>

      <div className={tab === "chat" ? "" : "hidden"}>
        <EpochAiWorkspace />
      </div>

      <div className={tab === "import" ? "" : "hidden"}>
        <EpochTourDocumentImport onApply={applyImport} workingDraftMode />
      </div>

      <div className={tab === "itinerary" ? "space-y-4" : "hidden"}>
        <form
          className="space-y-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-bold text-[#001F3F]">
              Temporary Tour Identity
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Tour title
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="text-sm">
                Duration (days)
                <input
                  name="duration"
                  type="number"
                  min={2}
                  max={30}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="text-sm">
                Arrival city
                <input
                  name="arrivalCity"
                  value={arrivalCity}
                  onChange={(e) => setArrivalCity(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="text-sm">
                Departure city
                <input
                  name="departureCity"
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm">
              Destinations
              <input
                name="destinations"
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h2 className="font-bold text-[#001F3F]">
              Editable Working Draft
            </h2>
            <p className="text-sm text-slate-600">
              Review and edit the itinerary here. Changes remain in this
              browser session and are not saved or published.
            </p>
            <label className="block text-sm font-medium">
              Day-by-day itinerary
              <textarea
                value={itinerary}
                onChange={(event) => {
                  setItinerary(event.target.value);
                  setStory(null);
                }}
                rows={12}
                className="mt-2 w-full rounded-lg border p-3 font-normal"
                placeholder="Enter or import the day-by-day itinerary."
              />
            </label>
            <label className="block text-sm font-medium">
              Journey overview
              <textarea
                value={overview}
                onChange={(event) => {
                  setOverview(event.target.value);
                  setStory(null);
                }}
                rows={4}
                className="mt-2 w-full rounded-lg border p-3 font-normal"
                placeholder="Optional journey overview."
              />
            </label>
          </div>
          <EpochItineraryAssistant
            workingDraftMode
            revisionMode={revise}
            onRevisionModeChange={setRevise}
            importedTour={importedTour}
            currentItinerary={itinerary}
            currentOverview={overview}
            isPublished={false}
            tourDuration={duration}
            onApply={applyItinerary}
          />
        </form>
      </div>

      <div className={tab === "story" ? "space-y-4" : "hidden"}>
        <EpochPilgrimageStoryAssistant
          title={title}
          duration={duration}
          destinations={destinations}
          itinerary={itinerary}
          onApply={setStory}
        />

        {story && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold">Applied story draft</h3>
            <p className="mt-2 font-semibold">{story.subtitle}</p>
            <p className="mt-2 text-sm">{story.overview}</p>
            <p className="mt-2 text-sm">
              Saved only in browser memory for this session.
            </p>
          </div>
        )}
      </div>

      {tab !== "chat" && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold text-[#001F3F]">
            Current working draft
          </h2>

          <p className="mt-2 text-sm">
            {title || "Untitled pilgrimage"} — {duration} days
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {destinations || "Destinations not entered"}
          </p>

          <details className="mt-3">
            <summary className="cursor-pointer font-semibold">
              Review itinerary and overview
            </summary>

            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm">
              {itinerary || "No itinerary loaded yet."}
            </pre>

            {overview && (
              <p className="mt-3 whitespace-pre-wrap text-sm">
                {overview}
              </p>
            )}
          </details>
        </section>
      )}
    </div>
  );
}