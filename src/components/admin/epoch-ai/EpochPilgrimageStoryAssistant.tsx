"use client";
import { useState } from "react";
import type { PilgrimageStoryDraft } from "@/lib/epoch-ai/pilgrimageStoryDraft";

type Props = {
  title: string; duration: number; destinations: string; itinerary: string;
  onApply: (proposal: PilgrimageStoryDraft) => void;
};
export default function EpochPilgrimageStoryAssistant({title,duration,destinations,itinerary,onApply}:Props) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [proposal,setProposal]=useState<PilgrimageStoryDraft|null>(null);
  async function generate() {
    if (busy || !itinerary.trim()) return;
    setBusy(true);setError("");setProposal(null);
    try {
      const reply=await fetch("/api/admin/epoch-ai/pilgrimage-story",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({title,duration,destinations,itinerary}), cache:"no-store",
      });
      const body=await reply.json() as {draft?:PilgrimageStoryDraft; error?:string};
      if (!reply.ok || !body.draft) throw new Error(body.error || "Story preparation failed.");
      setProposal(body.draft);
    } catch (cause) {setError(cause instanceof Error?cause.message:"Story preparation failed.");}
    finally {setBusy(false);}
  }
  return <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
    <h3 className="font-bold text-[#001F3F]">Epoch AI — Pilgrimage Story & Daily Meals</h3>
    <p className="text-sm text-slate-700">Prepare a distinctive pilgrimage story grounded in the actual itinerary. Breakfast and dinner are the Epoch standard where applicable; lunches are at pilgrims' expense unless specifically included. You can approve individual lunches after applying the proposal. No source program or saved Tour is modified by generating a proposal.</p>
    <button type="button" disabled={busy || !itinerary.trim()} onClick={generate} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Preparing story...":"Prepare Pilgrimage Story"}</button>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    {proposal && <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <p className="font-semibold text-[#001F3F]">{proposal.subtitle}</p>
      <p>{proposal.overview}</p>
      <p><strong>Themes:</strong> {proposal.themes.join(", ")}</p>
      <p><strong>Internal tags:</strong> {proposal.tags.join(", ")}</p>
      <p><strong>Meal plan:</strong> {proposal.mealPlan}</p>
      <details><summary className="cursor-pointer font-semibold">Read complete proposed story and daily B/L/D</summary>
        <div className="mt-2 space-y-2">
          <p><strong>Short description:</strong> {proposal.shortDescription}</p>
          <p><strong>Introduction:</strong> {proposal.tourIntroduction}</p>
          <p><strong>Spiritual significance:</strong> {proposal.tourSignificance}</p>
          <p><strong>Why Epoch offers this pilgrimage:</strong> {proposal.whyWeOfferThisTour}</p>
          <p><strong>Destinations:</strong> {proposal.destinationBriefs}</p>
          <p><strong>Highlights:</strong> {proposal.highlights.join(" · ")}</p>
          {proposal.dailyMeals.map((meal)=><p key={meal.day}>Day {meal.day}: 🍳 B {meal.breakfast} · 🥗 L {meal.lunch} · 🍽️ D {meal.dinner}</p>)}
        </div>
      </details>
      {proposal.reviewNotes.length>0 && <div className="rounded-lg border border-amber-200 p-3"><strong>Review before publishing</strong><ul className="list-disc pl-5">{proposal.reviewNotes.map((note,i)=><li key={i}>{note}</li>)}</ul></div>}
      <button type="button" onClick={()=>{if(window.confirm("Apply this proposed story and meal review to the editable Tour form? No save or publication will occur.")){onApply(proposal);setProposal(null);}}} className="rounded-lg bg-[#8B0000] px-4 py-2 font-semibold text-white">Apply Story to Tour Form (not saved)</button>
    </div>}
  </section>;
}
