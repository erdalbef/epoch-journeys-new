"use client";

import { useState } from "react";
import { getItineraryApplyPermission } from "@/lib/epoch-ai/itineraryApplyPermission";
import { reviewWrittenItineraryChanges } from "@/lib/epoch-ai/unifiedItineraryChangeReview";
import HereFullItineraryReview from "./HereFullItineraryReview";
import type { MouseEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { explicitDaysFromBrief } from "@/lib/epoch-ai/itineraryReview";
import type { FlightConvention, ItineraryDay, ItineraryDraft, ItineraryReview } from "@/lib/epoch-ai/itineraryReview";
import type { TourImportDraft } from "@/lib/epoch-ai/tourImportDraft";

type Props = {
  workingDraftMode?: boolean;
  revisionMode?: boolean;
  onRevisionModeChange?: (checked: boolean) => void;
  importedTour?: TourImportDraft | null;
  currentItinerary: string;
  currentOverview: string;
  isPublished: boolean;
  tourDuration: number;
  onApply: (itinerary: string, overview: string) => void;
};

function asText(form: FormData, field: string): string {
  return String(form.get(field) ?? "").trim();
}

/** Agency-facing itinerary: keep unverified supplier and operational details in the review panel. */
function formatDay(day: ItineraryDay): string {
  return [
    `Day ${day.day} — ${day.title}`,
    day.description,
    day.dayType !== "flight_only" ? `Mass: ${day.massPlan}` : "",
    `Overnight: ${day.overnight}`,
  ].filter(Boolean).join("\n");
}

/** Nothing is priced, saved or published by this client draft assistant. */
export default function EpochItineraryAssistant({ importedTour, currentItinerary, currentOverview, isPublished, tourDuration, onApply, revisionMode, onRevisionModeChange, workingDraftMode = false }: Props) {
  const [brief, setBrief] = useState("");
  const [enableRedesign, setEnableRedesign] = useState(false);
  const [localRevise, setLocalRevise] = useState(false);
  const revise = revisionMode ?? localRevise;
  const setRevise = onRevisionModeChange ?? setLocalRevise;
  const [flightConvention, setFlightConvention] = useState<FlightConvention>("usa_outbound");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [inserted, setInserted] = useState(false);
  const [draft, setDraft] = useState<ItineraryDraft | null>(null);
  const [review, setReview] = useState<ItineraryReview | null>(null);
  const [generatedForDuration, setGeneratedForDuration] = useState<number | null>(null);
  const [originalAtGeneration, setOriginalAtGeneration] = useState("");
  const [overviewAtGeneration, setOverviewAtGeneration] = useState("");
  const [approvedReplacement, setApprovedReplacement] = useState(false);
  const [revisionAtGeneration, setRevisionAtGeneration] = useState(false);
  const originalChanged =
    currentItinerary !== originalAtGeneration ||
    currentOverview !== overviewAtGeneration;
  const replacementNeeded =
    Boolean(currentItinerary.trim() || currentOverview.trim());
  const applyPermission = getItineraryApplyPermission({
    hasDraft: Boolean(draft),
    hasReview: Boolean(review),
    blockingErrors: review?.blocking.length ?? 0,
    generatedForDuration,
    tourDuration,
    currentItinerary,
    currentOverview,
    originalAtGeneration,
    overviewAtGeneration,
    revisionMode: revise,
    revisionAtGeneration,
    approvedReplacement,
  });
  const proposedItineraryText = draft
    ? draft.days.map(formatDay).join("\n\n")
    : "";

  // Read-only comparison against the generation-time original.
  // The review does not grant replacement permission.
  const unifiedChangeReview = draft && replacementNeeded
    ? reviewWrittenItineraryChanges(
        originalAtGeneration,
        proposedItineraryText,
        tourDuration,
      )
    : null;

  const briefDays = explicitDaysFromBrief(brief);
  const durationConflict = briefDays !== null && briefDays !== tourDuration;
  const requestedNights = Number.isInteger(tourDuration) ? tourDuration - (flightConvention === "usa_outbound" ? 2 : 1) : 0;

  async function generate(event: MouseEvent<HTMLButtonElement>) {
    if (importedTour && !enableRedesign) { setError("The imported itinerary is protected. Explicitly enable redesign to generate a replacement."); return; }
    if (importedTour && !revise) { setError("To revise an imported program, select 'Revise the existing itinerary' so the uploaded itinerary is sent as the reference."); return; }
    if (importedTour?.dayOnePattern === "same_day_flight_and_arrival") { setError("The generator does not yet support a flight and arrival on the same Day 1. Edit the imported text directly; do not replace it with a different flight convention."); return; }
    const form = event.currentTarget.closest("form");
    if (!form) { setError("Tour form not found."); return; }
    const data = new FormData(form);
    const duration = Number(asText(data, "duration"));
    if (!Number.isInteger(duration) || duration < 2 || duration > 30) {
      setError("Enter a duration of 2–30 days in Section 01 — Tour Identity first."); return;
    }
    const statedDays = explicitDaysFromBrief(brief);
    if (statedDays !== null && statedDays !== duration) {
      setError(`Duration conflict: the Tour Identity field says ${duration} days, but your instructions say ${statedDays}. Change the duration field in Section 01 before generating.`); return;
    }
    if (brief.trim().length < 12) {
      setError("Enter an itinerary brief of at least 12 characters."); return;
    }
    setOriginalAtGeneration(currentItinerary);
    setOverviewAtGeneration(currentOverview);
    setRevisionAtGeneration(revise);
    setApprovedReplacement(false);
    setWorking(true); setError(""); setDraft(null); setReview(null); setGeneratedForDuration(null); setInserted(false);
    try {
      const response = await fetch("/api/admin/epoch-ai/itinerary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({
          title: asText(data, "title"), duration, flightConvention,
          arrivalCity: asText(data, "arrivalCity"),
          departureCity: asText(data, "departureCity"),
          destinations: asText(data, "destinations"),
          instructions: brief.trim(),
          existingItinerary: revise ? currentItinerary : "",
        }),
      });
      const result: { error?: string; draft?: ItineraryDraft; review?: ItineraryReview } = await response.json();
      if (!response.ok || !result.draft || !result.review) throw new Error(result.error || "AI did not return a valid itinerary.");
      setDraft(result.draft);
      setReview(result.review);
      setGeneratedForDuration(duration);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate itinerary.");
    } finally { setWorking(false); }
  }

  function applyDraft() {
    if (!draft || !review) return;
    if (!applyPermission.allowed) {
      setError(applyPermission.reason);
      return;
    }
    if ((currentItinerary.trim() || currentOverview.trim()) && !window.confirm(workingDraftMode ? "Replace the temporary Epoch AI Working Draft? The change will be saved in this browser only." : "Replace the current itinerary and journey overview with this draft? Changes will not be saved until you save the Tour form.")) return;
    if (isPublished && !window.confirm("WARNING: This master tour is already PUBLISHED. Saving this form later may immediately change what agents see. Continue inserting into the editor?")) return;
    onApply(draft.days.map(formatDay).join("\n\n"), draft.journeyOverview);
    setInserted(true); setError("");
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#001F3F]/20 bg-slate-50 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[#001F3F]">
        <Sparkles className="h-5 w-5" />
        <h3 className="text-base font-bold">Epoch AI — Itinerary Designer v2</h3>
      </div>
      {isPublished && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-900">This tour is published. Saving a changed itinerary may update the Agent Dashboard immediately. Test with an unpublished tour first.</p>}
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Draft according to The Epoch Standard: daily Catholic Mass, realistic hotel nights, preferred two-night bases,
        90-minute lunches, ~30-minute breaks after roughly two hours of driving, elderly-friendly pacing and the Three Pillars of Tour Success.
        AI has <strong>no live supplier, road, hotel-review or booking verification</strong> in this pilot.
      </p>

      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
        <strong>Tour Identity duration: {tourDuration} days</strong> (Section 01). The generator always uses this field.
        <p className="mt-1 text-xs">Change the Duration in Section 01 if your brief requires a different number. The last day is departure with no new hotel night.</p>
      </div>
      {importedTour && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
        <strong>Imported itinerary — source controls the day numbering</strong>
        <p className="mt-1">Day 1: {({ overnight_flight: "Flight only; arrival on Day 2", same_day_flight_and_arrival: "Depart and arrive on Day 1", arrival_only: "Arrival on Day 1", unclear: "Not established; verify the document" } as const)[importedTour.dayOnePattern]}.</p>
        <p className="mt-1">Hotel nights documented: <strong>{importedTour.hotelNights ?? "Unconfirmed"}</strong>. This count comes from the uploaded itinerary, not the generator's default.</p>
        <p className="mt-1">The original imported day-by-day itinerary below is unchanged. The generator settings are for a <strong>new draft only</strong>. If the flight convention does not match the source, do not generate a replacement.</p>
        {importedTour.dayOnePattern === "same_day_flight_and_arrival" && <p className="mt-2 font-semibold text-amber-900">Same-day flight + arrival is not supported by the current generator. The imported itinerary remains editable below; AI redesign is blocked to prevent changing Day 1.</p>}
        <label className="mt-3 flex items-center gap-2 font-semibold"><input type="checkbox" checked={enableRedesign} onChange={(event) => { setEnableRedesign(event.target.checked); setDraft(null); setReview(null); setInserted(false); }} /> I explicitly want to revise / redesign this imported itinerary</label>
      </div>}
      {(!importedTour || enableRedesign) && <>
      <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="epoch-flight-convention">New draft: how is Day 1 counted?</label>
      <select id="epoch-flight-convention" value={flightConvention} onChange={(event) => { setFlightConvention(event.target.value as FlightConvention); setDraft(null); setReview(null); setGeneratedForDuration(null); setInserted(false); }}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900">
        <option value="usa_outbound">Day 1 — Depart USA on overnight flight; Day 2 — Arrive</option>
        <option value="arrival_day1">Day 1 — Arrive at destination (international flight not counted)</option>
      </select>
      <p className="mt-2 text-xs text-slate-600">Expected hotel nights: <strong>{requestedNights >= 0 ? requestedNights : "—"}</strong>. This affects both the itinerary and its automatic checks.</p>

      </>}
      {(!importedTour || enableRedesign) && <>
      <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="epoch-itinerary-brief">{importedTour ? "Your requested revisions (uploaded itinerary is the reference)" : "Your itinerary instructions"}</label>
      <textarea id="epoch-itinerary-brief" value={brief} onChange={(event) => { setBrief(event.target.value); setDraft(null); setReview(null); setGeneratedForDuration(null); setInserted(false); }} rows={4} maxLength={3500}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#001F3F]"
        placeholder={importedTour ? "Describe only the revisions you want. Original dates, Day 1 pattern, nights and routes must remain unchanged unless explicitly requested." : "Describe the pilgrimage route, day count, Day 1 flight arrangement, sacred sites, pacing and any required activities."} />
      {durationConflict && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">The brief asks for {briefDays} days, but Tour Identity is set to {tourDuration}. Please change Section 01 before generating.</p>}
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={revise} onChange={(event) => { setRevise(event.target.checked); setDraft(null); setReview(null); setGeneratedForDuration(null); }} />
        Revise the existing itinerary rather than create a new draft
      </label>
      <button type="button" onClick={generate} disabled={working || durationConflict || Boolean(importedTour && (!revise || importedTour.dayOnePattern === "same_day_flight_and_arrival"))}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {working ? "Preparing draft..." : `Generate ${tourDuration}-day draft`}
      </button>
      </>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {draft && review && (
        <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#001F3F]">
            <CheckCircle2 className="h-4 w-4" /> Draft received — review before inserting
          </div>
          <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">
            <strong>{draft.days.length} / {tourDuration} days</strong> · <strong>{review.hotelNights} / {review.expectedHotelNights} hotel nights</strong> · {review.blocking.length ? "Structural checks failed" : "Structural checks passed"}
          </div>
          {review.blocking.length > 0 && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
            <strong>Must correct before insertion:</strong>
            <ul className="mt-2 list-disc pl-5">{review.blocking.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>}
          {review.cautions.length > 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Automatic routing and comfort cautions:</strong>
            <ul className="mt-2 list-disc pl-5">{review.cautions.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </div>}
          <p className="text-sm leading-6 text-slate-700">{draft.journeyOverview}</p>
          <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
            {draft.days.map((day) => (
              <article key={day.day} className="rounded-lg border border-slate-200 p-3">
                <h4 className="font-bold text-[#001F3F]">Day {day.day} — {day.title}</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{day.description}</p>
                <p className="mt-2 text-xs text-slate-600"><strong>Mass plan:</strong> {day.massPlan}</p>
                <p className="mt-1 text-xs text-slate-600"><strong>Overnight:</strong> {day.overnight}</p>
                <p className="mt-1 text-xs text-slate-600"><strong>Lunch plan:</strong> {day.lunchPlan}</p>
                <p className="mt-1 text-xs text-slate-600"><strong>Coach comfort breaks:</strong> {day.comfortBreakPlan}</p>
                <p className="mt-1 text-xs text-slate-600"><strong>Logistics / verify:</strong> {day.logistics}</p>
              </article>
            ))}
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="h-4 w-4"/> Operational checks — NOT verified</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
              {draft.reviewNotes.map((note, index) => <li key={index}>{note}</li>)}
              <li>Independently confirm accurate route times, 90-minute lunch stops, Mass permissions and accessibility.</li>
            </ul>
          </div>
          <HereFullItineraryReview key={draft.days.map((day) => `${day.day}:${day.title}:${day.overnightCity}`).join("|")} days={draft.days} />
          <section className="rounded-xl border border-[#001F3F]/20 p-3 text-xs leading-5 text-slate-700">
            <h4 className="mb-2 text-sm font-bold text-[#001F3F]">Epoch Three Pillars — pre-approval quality checklist</h4>
            <p><strong>1. Tour Manager & local guides:</strong> language, group and pilgrimage expertise, reliability, senior-group empathy, relevant internal feedback and assignments.</p>
            <p className="mt-2"><strong>2. Hotels:</strong> safe location, real accessible walking distance to attractions, room area and lobby capacity, walk-in showers, lifts, legal coach drop-off and parking, porterage and cost. Verify dated Google and Tripadvisor ratings, review counts and representative recent positive/negative comments from authentic sources.</p>
            <p className="mt-2"><strong>3. Coach & driver:</strong> vehicle safety/condition, AC, seats and legroom, luggage volume, driver credentials, appropriate rest and legal city access.</p>
            <p className="mt-2 font-semibold text-amber-800">All checklist items require supplier, operational or reliable external confirmation. This AI draft does not verify them.</p>
          </section>
          {replacementNeeded && (
            <section
              className="rounded-xl border border-amber-300 bg-amber-50 p-4"
              aria-label="Original itinerary change review"
            >
              <h4 className="font-bold text-amber-950">
                Mandatory Change Review
              </h4>
              <p className="mt-2 text-sm text-amber-950">
                Review the original and proposed itineraries before approving
                replacement. Automatic detection is limited to explicitly
                labeled arrangements and visits. Missing or differently worded
                information requires manual verification.
              </p>
              {unifiedChangeReview && (
                <section
                  aria-label="Automatic itinerary change findings"
                  className="mt-3 rounded-lg border border-amber-300 bg-white p-3 text-sm text-slate-800"
                >
                  <h5 className="font-bold text-[#001F3F]">
                    Automatic Change Findings - Review Required
                  </h5>
                  <p className="mt-2 text-xs text-slate-600">
                    These findings are preliminary. Zero detected differences
                    does not establish that the itineraries are equivalent.
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border p-2">
                      <strong className="block text-lg">
                        {unifiedChangeReview.summary.detectedChanges}
                      </strong>
                      <span className="text-xs">Detected differences</span>
                    </div>
                    <div className="rounded-lg border p-2">
                      <strong className="block text-lg">
                        {unifiedChangeReview.summary.possibleSiteChanges}
                      </strong>
                      <span className="text-xs">Possible shrine changes</span>
                    </div>
                    <div className="rounded-lg border p-2">
                      <strong className="block text-lg">
                        {unifiedChangeReview.summary.unverifiedDetails}
                      </strong>
                      <span className="text-xs">Unverified details</span>
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer font-semibold">
                      Detected overnight / Mass differences
                    </summary>
                    {unifiedChangeReview.detectedChanges.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                        {unifiedChangeReview.detectedChanges.map((item, index) => (
                          <li key={index}>
                            Day {item.day}, {item.category}:
                            {" "}{item.original} - proposed: {item.proposed}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs">
                        No explicitly labeled differences detected.
                        This does not verify missing information.
                      </p>
                    )}
                  </details>

                  <details className="mt-3">
                    <summary className="cursor-pointer font-semibold">
                      Possible pilgrimage-site changes
                    </summary>
                    {unifiedChangeReview.possibleSiteChanges.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                        {unifiedChangeReview.possibleSiteChanges.map((item, index) => (
                          <li key={index}>
                            Day {item.day}: {item.original}.
                            {" "}{item.message}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs">
                        No same-day labeled shrine differences detected.
                        Narrative visits and alternate names remain unverified.
                      </p>
                    )}
                  </details>

                  <details className="mt-3">
                    <summary className="cursor-pointer font-semibold">
                      Unverified details ({unifiedChangeReview.unverifiedDetails.length})
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      {unifiedChangeReview.unverifiedDetails.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </details>
                </section>
              )}
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <strong className="text-sm">Original working itinerary</strong>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-white p-3 text-xs">
                    {originalAtGeneration || overviewAtGeneration || "No original itinerary text"}
                  </pre>
                </div>
                <div>
                  <strong className="text-sm">Proposed itinerary</strong>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-white p-3 text-xs">
                    {draft.days.map(formatDay).join("\n\n")}
                  </pre>
                </div>
              </div>
              {originalChanged && (
                <p role="alert" className="mt-3 font-semibold text-red-800">
                  The original working draft changed after generation.
                  Regenerate before applying this proposal.
                </p>
              )}
              <label className="mt-4 flex items-start gap-2 text-sm font-medium text-amber-950">
                <input
                  id="epoch-change-review-approval"
                  type="checkbox"
                  checked={approvedReplacement}
                  disabled={originalChanged}
                  onChange={(event) => setApprovedReplacement(event.target.checked)}
                />
                I have compared the original and proposed itineraries,
                reviewed the pilgrimage destinations, overnight arrangements
                and Mass plans, and explicitly approve replacing the working draft.
              </label>
            </section>
          )}
          {generatedForDuration !== tourDuration && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Tour Identity duration has changed. Regenerate to get a correctly sized draft.</p>}
          <button type="button" onClick={applyDraft} disabled={!applyPermission.allowed}
            className="rounded-lg border border-[#001F3F] px-4 py-2 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Insert draft into Tour Editor
          </button>
          {inserted && <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-900">{workingDraftMode ? "Proposal applied to the temporary Working Draft. Browser-local recovery is enabled; nothing was published." : "Draft inserted into the Tour Editor. Review and save the Tour form separately. No supplier facts were verified and nothing was published automatically."}</p>}
          <p className="text-xs text-slate-500">Inserts only day descriptions and the journey overview after your approval. Internal notes, ratings, and unverified logistics stay in the preview; no automated pricing, bookings, supplier or finance changes.</p>
        </div>
      )}
    </div>
  );
}
