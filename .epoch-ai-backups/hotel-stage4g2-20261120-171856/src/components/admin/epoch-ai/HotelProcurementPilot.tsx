"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import HotelInquiryWorkspace from "./HotelInquiryWorkspace";
import { hotelResearchSearchUrl, compareLeadToCrm } from "@/lib/epoch-ai/hotelDiscoveryLeads";
import { leadEvidence, screenGroupCapacity } from "@/lib/epoch-ai/hotelLeadScreening";
import { assessHotelCoverage, reviewHotelCandidates } from "@/lib/epoch-ai/hotelDiscoveryReview";
import type { WebHotelResult, DiscoveredHotelLead } from "@/lib/epoch-ai/hotelWebResearch";
import { publishedHotelVerification } from "@/lib/epoch-ai/hotelPublicVerification";
import { balkanStays, contactEmail, inquiry, searchCrmHotels, nights, type HotelContact, type Stay } from "@/lib/epoch-ai/hotelProcurement";

export default function HotelProcurementPilot({tourId,tourTitle,destinations,hotels}:{tourId:string;tourTitle:string;destinations:string[];hotels:HotelContact[]}) {
  const isBalkan=/balkan|mother teresa/i.test(tourTitle);
  const [stays,setStays]=useState<Stay[]>(()=>isBalkan?balkanStays.map(s=>({...s})):destinations.slice(0,20).map(city=>({city,checkIn:"",checkOut:"",rooms:20,massRoom:false})));
  const [active,setActive]=useState(0);
  const [crmSearch,setCrmSearch]=useState<Record<number,string>>({});
  const [supplierId,setSupplierId]=useState<Record<number,string>>({});
  const [leadByStay,setLeadByStay]=useState<Record<number,string>>({});
  const [manualLead,setManualLead]=useState<Record<number,string>>({});
  const [verifiedEmail,setVerifiedEmail]=useState<Record<number,string>>({});
  const [researchCountry,setResearchCountry]=useState<Record<number,string>>({});
  const [researchPhone,setResearchPhone]=useState<Record<number,string>>({});
  const [contactSource,setContactSource]=useState<Record<number,string>>({});
  const [facilitiesSource,setFacilitiesSource]=useState<Record<number,string>>({});
  const [contactChecked,setContactChecked]=useState<Record<number,boolean>>({});
  const [facilitiesChecked,setFacilitiesChecked]=useState<Record<number,boolean>>({});
  const [checkStatus,setCheckStatus]=useState<Record<number,Record<string,boolean>>>({});
  const countryForCity:Record<string,string>={"Sarajevo":"Bosnia and Herzegovina","Kotor Bay":"Montenegro","Tirana":"Albania","Ohrid":"North Macedonia","Pristina":"Kosovo","Skopje":"North Macedonia","Belgrade":"Serbia"};
  const publicEvidenceChecklist = ["4-star standard verified", "Walk-in showers and lifts confirmed", "Coach access and parking confirmed", "Porterage confirmed"];
  const hotelConfirmationChecklist = ["20 rooms / allotment confirmed", "Group dinners and beverages confirmed", "Private Mass room confirmed where required"];

  const [copyStatus,setCopyStatus]=useState("");
  const [crmSaveState,setCrmSaveState]=useState("");
  const [crmSaving,setCrmSaving]=useState(false);
  const [savedSupplierByStay,setSavedSupplierByStay]=useState<Record<number,string>>({});
  const [liveByStay,setLiveByStay]=useState<Record<number,WebHotelResult[]>>({});
  const [foundByStay,setFoundByStay]=useState<Record<number,DiscoveredHotelLead[]>>({});
  const [linksByStay,setLinksByStay]=useState<Record<number,{label:string;url:string}[]>>({});
  const [researchMode,setResearchMode]=useState<Record<number,string>>({});
  const [liveError,setLiveError]=useState<Record<number,string>>({});
  const [liveLoading,setLiveLoading]=useState(false);
  async function searchLiveHotels(){
    const index=active;const current=stays[index];
    if(!current?.city.trim()){setLiveError(p=>({...p,[index]:"Enter destination first."}));return;}
    setLiveLoading(true);setLiveError(p=>({...p,[index]:""}));
    try {
      const response=await fetch("/api/admin/epoch-ai/hotel-research/live",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({city:current.city,country:researchCountry[index]||countryForCity[current.city]||"",
          knownNames:[...new Set([...hotels.map(h=>h.name),...reviewHotelCandidates(current,hotels).map(c=>c.name)])]})
      });
      const result=await response.json() as {error?:string;leads?:WebHotelResult[];searchLinks?:{label:string;url:string}[];mode?:string;candidates?:DiscoveredHotelLead[]};
      if(!response.ok)throw Error(result.error||"Live hotel search unavailable");
      setLiveByStay(p=>({...p,[index]:result.leads||[]}));
      setFoundByStay(p=>({...p,[index]:result.candidates||[]}));
      setLinksByStay(p=>({...p,[index]:result.searchLinks||[]}));
      setResearchMode(p=>({...p,[index]:result.mode||"manual"}));
    }catch(err){setLiveError(p=>({...p,[index]:err instanceof Error?err.message:"Hotel research unavailable"}));}
    finally{setLiveLoading(false);}
  }

  async function saveApprovedLead() {
    const selected = selectedLeadName;
    const profile = publishedHotelVerification(selected);
    const recipient = verifiedEmail[active]?.trim() || profile?.email || "";
    const phone = researchPhone[active]?.trim() || profile?.phone || "";
    const source = contactSource[active]?.trim() || profile?.source || "";
    const facilities = facilitiesSource[active]?.trim() || profile?.facilitiesSource || "";
    const country = researchCountry[active]?.trim() || (stay ? countryForCity[stay.city] : "") || "";
    if (!stay || !selected || !recipient || !phone || !country || !source || !facilities ||
       !contactChecked[active] || !facilitiesChecked[active]) {
      setCrmSaveState("Verify hotel country, email, phone and both public evidence URLs; tick both review confirmations before registration."); return;
    }
    const confirmation = `Register ${selected} in ${stay.city}, ${country} as an INACTIVE research candidate?\n\nContact: ${recipient}\nContact evidence: ${source}\nFacilities evidence: ${facilities}\n\nThis creates a CRM candidate only. No email will be sent.`;
    if (!window.confirm(confirmation)) return;
    setCrmSaving(true); setCrmSaveState("");
    try {
      const response = await fetch("/api/admin/epoch-ai/hotel-research/register", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({name:selected,city:stay.city,country,email:recipient,phone,source,facilitiesSource:facilities,adminVerification:{confirmation:"REGISTER VERIFIED RESEARCH LEAD",contactChecked:true,facilitiesChecked:true},hotelStay:{checkIn:stay.checkIn,checkOut:stay.checkOut,rooms:stay.rooms}}),
      });
      const result = await response.json() as {error?:string;supplierId?:string;alreadyExists?:boolean};
      if (!response.ok || !result.supplierId) throw new Error(result.error || "CRM registration did not complete.");
      setSavedSupplierByStay(current=>({...current,[active]:result.supplierId!}));
      setCrmSaveState(result.alreadyExists ? "Hotel already exists in CRM; no duplicate created." : "Approved research candidate added to Supplier CRM (INACTIVE). No inquiry sent.");
    } catch(err) {setCrmSaveState(err instanceof Error ? err.message : "Could not register supplier.");}
    finally {setCrmSaving(false);}
  }
  const stay=stays[active];
  const referenceStay=isBalkan?balkanStays[active]:undefined;
  const referenceMismatch=Boolean(referenceStay&&stay&&(stay.city!==referenceStay.city||stay.checkIn!==referenceStay.checkIn||stay.checkOut!==referenceStay.checkOut||stay.rooms!==referenceStay.rooms));
  const matches=useMemo(()=>stay?searchCrmHotels(hotels,stay.city,crmSearch[active]||""):[],[stay,hotels,crmSearch,active]);
  const chosen=hotels.find(h=>h.id===supplierId[active]);
  const selectedLeadName=manualLead[active]?.trim() || leadByStay[active] || "";
  const draft=stay?inquiry(stay,chosen?.name||selectedLeadName):null;
  const selectedName=chosen?.name||selectedLeadName;
  const leadEmail=verifiedEmail[active]?.trim()||"";
  const coverage=stay?assessHotelCoverage(stay,hotels):null;
  const candidateReviews=stay?reviewHotelCandidates(stay,hotels):[];
  const newWebResults=(liveByStay[active]||[]);
  const discovered=(foundByStay[active]||[]).filter(item=>
    !candidateReviews.some(candidate=>compareLeadToCrm(item.name,[candidate.name])) &&
    !hotels.some(hotel=>compareLeadToCrm(item.name,[hotel.name])));
  function useResearchLead(name:string){
    setLeadByStay(p=>({...p,[active]:name}));
    setManualLead(p=>({...p,[active]:""}));
    setSupplierId(p=>({...p,[active]:""}));
    setVerifiedEmail(p=>({...p,[active]:""}));
    setContactChecked(p=>({...p,[active]:false}));
    setFacilitiesChecked(p=>({...p,[active]:false}));
    setSavedSupplierByStay(p=>{const next={...p};delete next[active];return next;});
    setCrmSaveState("");setCopyStatus("");
  }
  function update<K extends keyof Stay>(field:K,value:Stay[K]) {setStays(current=>current.map((s,i)=>i===active?{...s,[field]:value}:s));if(field==="city"){setFoundByStay(p=>({...p,[active]:[]}));setLiveByStay(p=>({...p,[active]:[]}));setResearchMode(p=>({...p,[active]:""}));}setCopyStatus("")}
  async function copy(text:string,label:string){try{await navigator.clipboard.writeText(text);setCopyStatus(label+" copied. Review and add approved email signature before sending.")}catch{setCopyStatus("Clipboard unavailable; select and copy the draft manually.")}}
  return <div className="space-y-5">
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Preparation only.</strong> This page does not send email, book hotels or change supplier rates. Saving a draft records it in Hotel Inquiry History only. {isBalkan?"The seven Balkan stays below are editable reference dates, not confirmed hotel bookings.":"Add and verify the hotel dates before preparing inquiries."} Include the official Epoch Journeys signature in any approved message.</div>
    <div className="flex flex-wrap gap-2">{stays.map((s,i)=><button key={i} type="button" onClick={()=>{setActive(i);setCopyStatus("")}} className={`rounded-lg px-3 py-2 text-sm font-medium ${active===i?"bg-[#001F3F] text-white":"border border-slate-200 bg-white text-slate-700"}`}>{s.city||`Stay ${i+1}`}</button>)}</div>
    {stay?<div className="grid gap-6 lg:grid-cols-2"><div className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold text-[#001F3F]">Stay details — review before use</h2>
      <label className="block text-sm font-medium">Destination<input className="mt-1 w-full rounded-lg border p-2" value={stay.city} onChange={e=>update("city",e.target.value)}/></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Check-in<input className="mt-1 w-full rounded-lg border p-2" type="date" value={stay.checkIn} onChange={e=>update("checkIn",e.target.value)}/></label><label className="text-sm font-medium">Check-out<input className="mt-1 w-full rounded-lg border p-2" type="date" value={stay.checkOut} onChange={e=>update("checkOut",e.target.value)}/></label></div>
      {referenceStay?<section className={`rounded-lg border p-3 text-xs ${referenceMismatch?"border-amber-400 bg-amber-50 text-amber-950":"border-sky-200 bg-sky-50 text-sky-950"}`}>
        <strong>2027 Balkan reference schedule (not a confirmed hotel booking):</strong> {referenceStay.city} · check-in {referenceStay.checkIn} · check-out {referenceStay.checkOut} · {referenceStay.rooms} rooms.
        {referenceMismatch?<><p className="mt-1 font-semibold">The editable stay fields differ from the 2027 reference. Verify the intended tour schedule before saving any inquiry.</p><button type="button" className="mt-2 rounded border border-amber-600 bg-white px-2 py-1 font-semibold" onClick={()=>{setStays(current=>current.map((s,i)=>i===active?{...referenceStay}:s));setCopyStatus("")}}>Restore 2027 reference stay (no database write)</button></>:<p className="mt-1">Current editable stay fields match the reference. Check the year and dates before approving.</p>}
      </section>:null}
      <p className="text-sm text-slate-600">Calculated nights: {nights(stay)||"Review dates"}</p>
      <label className="block text-sm font-medium">Number of rooms<input type="number" min={1} max={250} className="mt-1 w-full rounded-lg border p-2" value={stay.rooms} onChange={e=>update("rooms",Number(e.target.value))}/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={stay.massRoom} onChange={e=>update("massRoom",e.target.checked)}/> Ask about private Mass meeting room (only where needed)</label>
      {coverage?<section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm" aria-label="Hotel research and supplier selection">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#001F3F]">Hotel Research &amp; Supplier Selection</h3>
          <p className="text-xs text-slate-600">{stay.city} · {stay.checkIn||"Check-in not set"} to {stay.checkOut||"Check-out not set"} · {stay.rooms} rooms requested</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border bg-white p-2"><p className="text-xs text-slate-500">CRM hotels</p><p className="text-xl font-bold text-[#001F3F]">{coverage.crmCount}</p></div>
          <div className="rounded-lg border bg-white p-2"><p className="text-xs text-slate-500">Known leads</p><p className="text-xl font-bold text-[#001F3F]">{candidateReviews.filter(item=>!item.inCrm).length}</p></div>
          <div className="rounded-lg border bg-white p-2"><p className="text-xs text-slate-500">Contact profiles</p><p className="text-xl font-bold text-[#001F3F]">{candidateReviews.filter(item=>item.contactEvidence).length}</p></div>
        </div>
        <p className="text-xs text-slate-700">{coverage.crmCount===0?"No hotel in Supplier CRM for this stay. Review known leads or research additional options.":"CRM hotels appear alongside research leads below. Check their contact details and suitability before preparing inquiries."} A saved email or published contact profile is not proof of current validity.</p>
        <div className="space-y-2 rounded-lg border bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#001F3F]">Discover additional hotels</p><span className="text-xs text-slate-500">No Google Cloud needed</span></div>
          <p className="text-xs text-slate-600">Searches public websites for additional hotel names. Existing CRM hotels and known leads are excluded from suggested names. No Google Cloud account required. Automatic results need a server-side Brave Search API key; otherwise use manual links.</p>
          <button type="button" disabled={liveLoading} onClick={()=>void searchLiveHotels()} className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{liveLoading?"Preparing research...":"Research more hotels"}</button>
          {liveError[active]?<p role="alert" className="text-xs text-amber-900">{liveError[active]}</p>:null}
          {researchMode[active]?<p role="status" className="text-xs text-slate-600">{researchMode[active]==="brave"?`${discovered.length} possible new hotel names found; all require independent identity and suitability checks.`:"No search provider configured; use the public research links below."}</p>:null}
          {(linksByStay[active]||[]).length?<details className="text-xs"><summary className="cursor-pointer font-medium text-blue-800">Manual web-search links ({(linksByStay[active]||[]).length})</summary><div className="mt-2 space-y-1">{(linksByStay[active]||[]).map(link=><p key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{link.label}</a></p>)}</div></details>:null}
          {discovered.length?<div className="space-y-2"><p className="text-xs font-semibold text-[#001F3F]">Possible new hotels — not yet verified ({discovered.length})</p>
            {discovered.map(result=><div key={`${result.name}:${result.sourceUrl}`} className="rounded border p-2 text-xs"><p className="font-semibold">{result.name}</p>
              <p className="text-slate-500">{result.sourceType==="possible-official-site"?"Possible hotel website":"Third-party mention"} · {result.sourceHost}</p>
              <p className="text-slate-600">{result.snippet||"No source excerpt"}</p>
              <div className="mt-1 flex flex-wrap gap-2"><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Inspect source</a>
                <button type="button" onClick={()=>{useResearchLead(result.name);setContactSource(p=>({...p,[active]:""}));setFacilitiesSource(p=>({...p,[active]:""}));}} className="rounded border px-2 py-1 font-semibold">Review candidate</button></div>
              <p className="mt-1 text-amber-800">Verify hotel identity, address and official website before using this name; group capacity and contact remain unknown.</p></div>)}</div>:null}
          {newWebResults.length?<details className="text-xs"><summary className="cursor-pointer font-medium text-blue-800">All search pages ({newWebResults.length}) — including non-hotel pages</summary><div className="mt-2 space-y-2">{newWebResults.map(result=><div key={result.url} className="border-t pt-2"><p className="font-semibold">{result.title}</p><p className="text-slate-600">{result.description||"Unverified search result"}</p><a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Inspect source</a></div>)}</div></details>:null}
          {researchMode[active]==="brave"&&!discovered.length?<p className="text-xs text-slate-500">No distinct hotel names could be identified from this search. Review the source pages or use manual search.</p>:null}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-[#001F3F]">Hotel candidates</h4><span className="text-xs text-slate-600">{candidateReviews.length} known candidates · {discovered.length} possible new names</span></div>
          <p className="text-xs text-slate-600">Research candidates are not approved suppliers. Confirm room availability and group terms with each hotel.</p>
          <div className="space-y-2">{candidateReviews.map(item=>{
            const crmHotel=hotels.find(h=>item.crmIds.includes(h.id));
            const activeItem=selectedName.toLocaleLowerCase()===item.name.toLocaleLowerCase();
            return <div key={item.name} className={`rounded-lg border p-3 ${activeItem?"border-blue-400 bg-blue-50":"border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="font-semibold text-[#001F3F]">{item.name}</p><p className="mt-1 text-xs text-slate-600">{item.inCrm?"Supplier CRM":"Research lead"} · {item.contactEvidence?"Contact source on file":"Contact needs verification"} · {item.capacityStatus==="unknown"?"Capacity unknown":item.capacityStatus==="capacity-caution"?"Capacity caution":"Size screen only"}</p>{activeItem?<p className="mt-1 text-xs text-blue-800">Next: {item.questions[0]}</p>:null}</div>
                <div className="flex flex-wrap gap-2"><a href={hotelResearchSearchUrl(stay.city,item.name)} target="_blank" rel="noopener noreferrer" className="rounded border px-2 py-1 text-xs text-blue-700">Research</a><button type="button" onClick={()=>{if(crmHotel){setSupplierId(p=>({...p,[active]:crmHotel.id}));setCopyStatus("");}else{useResearchLead(item.name);}}} className="rounded bg-[#001F3F] px-2 py-1 text-xs font-semibold text-white">{activeItem?"Selected":item.inCrm?"Select CRM":"Review lead"}</button></div>
              </div>
            </div>;
          })}</div>
          {!candidateReviews.length?<p className="rounded-lg border bg-white p-3 text-xs">No known hotel candidates for this destination. Research hotels and enter independently verified details below.</p>:null}
        </div>
        <details className="rounded-lg border bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold text-[#001F3F]">Find another hotel in Supplier CRM</summary>
          <div className="mt-3 space-y-2"><label className="block font-medium">Search by hotel name, city or country<input type="search" className="mt-1 w-full rounded border p-2" value={crmSearch[active]||""} onChange={e=>setCrmSearch(p=>({...p,[active]:e.target.value}))}/></label>
          <select className="w-full rounded border p-2" value={supplierId[active]||""} onChange={e=>{setSupplierId(p=>({...p,[active]:e.target.value}));setCopyStatus("")}}><option value="">Choose a CRM hotel (optional)</option>{chosen&&!matches.some(h=>h.id===chosen.id)?<option value={chosen.id}>{chosen.name} (selected)</option>:null}{matches.map(h=><option key={h.id} value={h.id}>{h.name} — {h.city||"City not recorded"}</option>)}</select>
          <Link href="/admin/suppliers?type=HOTEL" className="inline-block text-blue-700 underline">Open all hotel suppliers in CRM</Link></div>
        </details>
        <p className="text-xs text-slate-600">Review → verify evidence → explicitly approve CRM registration → prepare inquiry draft. Nothing on this screen approves a booking, price or supplier email.</p>
      </section>:null}
        <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm"><summary className="cursor-pointer font-semibold text-[#001F3F]">Enter a hotel found outside the shortlist</summary><label className="mt-3 block text-sm font-medium">Verified hotel name<input value={manualLead[active]||""} onChange={e=>{setManualLead(p=>({...p,[active]:e.target.value}));setSupplierId(p=>({...p,[active]:""}));setSavedSupplierByStay(p=>{const next={...p};delete next[active];return next;});setContactChecked(p=>({...p,[active]:false}));setFacilitiesChecked(p=>({...p,[active]:false}));setCopyStatus("")}} placeholder="Enter the exact verified hotel name" className="mt-1 w-full rounded-lg border bg-white p-2" /></label></details>
        {selectedName ? <details key={`${active}:${selectedName}`} open className="space-y-2 rounded-lg border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-[#001F3F]">Verify selected hotel: {selectedName} {chosen?"(CRM)":"(research lead)"}</summary><div className="mt-3 space-y-3">
          {(() => { const profile=publishedHotelVerification(selectedName); return profile ? <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-slate-800 space-y-2">
            <p className="font-bold text-[#001F3F]">Public-source verification (18 Nov 2026)</p>
            <p><strong>Published contact:</strong> {profile.email} ({profile.contactType})</p>
            <p><strong>Phone:</strong> {profile.phone}</p>
            <p><strong>Publicly advertised:</strong> {profile.publishedFacts.join("; ")}</p>
            <p className="text-amber-900"><strong>Confirm with hotel:</strong> {profile.openQuestions.join("; ")}</p>
            <div className="flex flex-wrap items-center gap-2"><a href={profile.source} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Contact evidence</a><a href={profile.facilitiesSource} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Facilities evidence</a>
              <button type="button" onClick={()=>setVerifiedEmail(p=>({...p,[active]:profile.email}))} className="rounded border border-blue-300 bg-white px-2 py-1 font-semibold">Use published contact in draft</button></div>
            <p className="text-slate-600">This research snapshot is not live monitoring, and the published address may be a general inbox. Check recipient and terms before approval. No message is sent or CRM record created.</p>
          </div>:<p className="text-xs text-amber-800">No reviewed public contact profile yet for this hotel. Research its official site before entering a contact.</p>; })()}
          <label className="block text-sm font-medium">Verified reservations email (optional; no sending)<input type="email" value={verifiedEmail[active]||""} onChange={e=>setVerifiedEmail(p=>({...p,[active]:e.target.value}))} placeholder="Only enter after checking an official source" className="mt-1 w-full rounded-lg border p-2"/></label>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><strong>Preliminary capacity screen:</strong> {screenGroupCapacity(stay.rooms,leadEvidence(selectedName)?.totalRooms).message} {leadEvidence(selectedName)?.totalRooms ? `(${stay.rooms} rooms requested / ${leadEvidence(selectedName)?.totalRooms} published rooms)` : ""} <span className="block mt-1">Do not mark the 20-room allotment confirmed until the hotel replies.</span></div>
          <div className="rounded-lg border p-3 text-xs space-y-2">
            <p className="font-semibold text-[#001F3F]">Public evidence review</p>
            <p className="text-slate-600">Only check items supported by a reviewed public source. These checks do not establish hotel availability.</p>
            {publicEvidenceChecklist.map(item=><label key={item} className="flex items-start gap-2"><input type="checkbox" checked={Boolean(checkStatus[active]?.[item])} onChange={e=>setCheckStatus(prev=>({...prev,[active]:{...(prev[active]||{}),[item]:e.target.checked}}))}/>{item}</label>)}
          </div>
          <div className="rounded-lg border p-3 text-xs space-y-2">
            <p className="font-semibold text-[#001F3F]">Requires direct hotel confirmation</p>
            <p className="text-slate-600">Mark confirmed only after receiving attributable hotel evidence. A total room count is not a 20-room allotment.</p>
            {hotelConfirmationChecklist.filter(item=>!item.includes("Mass room")||stay.massRoom).map(item=><label key={item} className="flex items-start gap-2"><input type="checkbox" checked={Boolean(checkStatus[active]?.[item])} onChange={e=>setCheckStatus(prev=>({...prev,[active]:{...(prev[active]||{}),[item]:e.target.checked}}))}/>{item}</label>)}
          </div>
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <summary className="cursor-pointer text-xs font-semibold text-[#001F3F]">Register verified research lead in Supplier CRM</summary><div className="mt-3 space-y-2">
            <p className="text-xs text-slate-600">After your explicit approval, a published-contact hotel lead can be stored as an INACTIVE research candidate, with evidence and source date. This is not a booking or email approval. Existing matches are checked for duplicates.</p>
            {!chosen ? <div className="space-y-2 rounded border p-2 text-xs">
              <p>Enter independently checked information from the hotel's official website or other attributable public evidence. This form does not perform live research.</p>
              <label className="block">Country<input className="mt-1 w-full rounded border p-2" value={researchCountry[active] ?? countryForCity[stay.city] ?? ""} onChange={e=>setResearchCountry(p=>({...p,[active]:e.target.value}))}/></label>
              <label className="block">Published phone<input className="mt-1 w-full rounded border p-2" value={researchPhone[active] ?? publishedHotelVerification(selectedLeadName)?.phone ?? ""} onChange={e=>setResearchPhone(p=>({...p,[active]:e.target.value}))}/></label>
              <label className="block">Contact source HTTPS URL<input type="url" className="mt-1 w-full rounded border p-2" value={contactSource[active] ?? publishedHotelVerification(selectedLeadName)?.source ?? ""} onChange={e=>setContactSource(p=>({...p,[active]:e.target.value}))}/></label>
              <label className="block">Facilities source HTTPS URL<input type="url" className="mt-1 w-full rounded border p-2" value={facilitiesSource[active] ?? publishedHotelVerification(selectedLeadName)?.facilitiesSource ?? ""} onChange={e=>setFacilitiesSource(p=>({...p,[active]:e.target.value}))}/></label>
              <label className="flex gap-2"><input type="checkbox" checked={Boolean(contactChecked[active])} onChange={e=>setContactChecked(p=>({...p,[active]:e.target.checked}))}/>I independently checked the published contact and email</label>
              <label className="flex gap-2"><input type="checkbox" checked={Boolean(facilitiesChecked[active])} onChange={e=>setFacilitiesChecked(p=>({...p,[active]:e.target.checked}))}/>I reviewed the hotel/facilities evidence; unconfirmed group amenities remain open questions</label>
            </div> : null}
            {!chosen ? <button type="button" disabled={crmSaving || Boolean(savedSupplierByStay[active])} onClick={()=>void saveApprovedLead()} className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{crmSaving?"Registering...":savedSupplierByStay[active]?"Research lead registered":"Approve & register research lead in CRM"}</button>:null}
            {savedSupplierByStay[active]?<button type="button" className="block text-xs text-blue-700 underline" onClick={()=>window.location.reload()}>Refresh CRM hotel list to select the newly registered supplier</button>:null}
            {savedSupplierByStay[active]?<Link href={`/admin/suppliers/${savedSupplierByStay[active]}`} className="block text-xs text-blue-700 underline">Open registered CRM record</Link>:null}
            {crmSaveState?<p role="status" className="text-xs text-slate-700">{crmSaveState}</p>:null}
          </div></details>
          <p className="text-xs text-slate-600">Unapproved research selections and diligence checks stay in this browser session only. No message is sent. Supplier confirmations require actual offer evidence.</p>
        </div></details>:null}

    </div><div className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold text-[#001F3F]">Hotel Inquiry — preparation only</h2>
      <p className="text-sm text-slate-700">Hotel to approach: <strong>{selectedName || "Not selected"}</strong>. Contact email: <strong>{chosen?contactEmail(chosen)||"Not in CRM":leadEmail||"Not verified"}</strong>.</p>
      {!chosen?<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Inquiry not ready — select a Supplier CRM hotel. Research leads need separately approved CRM registration first. Verify a current reservations or sales address before any approval. No email is sent here.</p>:null}
      {chosen&&!contactEmail(chosen)?<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Recipient not verified — check the hotel's current official contact source before proceeding.</p>:null}
      {chosen?<details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold text-[#001F3F]">Show inquiry draft and history</summary><div className="mt-3 space-y-3">
      {draft?.errors.length?<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{draft.errors.join("; ")}</div>:null}
      <label className="block text-sm font-medium">Subject<input readOnly value={draft?.subject||""} className="mt-1 w-full rounded-lg border bg-slate-50 p-2"/></label>
      <label className="block text-sm font-medium">Email body<textarea readOnly rows={23} value={draft?.body||""} className="mt-1 w-full rounded-lg border bg-slate-50 p-3 font-mono text-xs leading-5"/></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(draft?.errors.length)||!selectedName} onClick={()=>void copy(`Selected hotel: ${selectedName}\nRecipient: ${chosen?contactEmail(chosen):leadEmail||"CONTACT NOT VERIFIED"}\n\n${draft?.subject}\n\n${draft?.body}`,"Inquiry")} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Copy inquiry</button>{(chosen?contactEmail(chosen):leadEmail)?<button type="button" onClick={()=>void copy(chosen?contactEmail(chosen):leadEmail,"Recipient email")} className="rounded-lg border px-4 py-2 text-sm">Copy recipient email</button>:null}</div>
      <p className="text-sm text-slate-600" role="status">{copyStatus||"Select a hotel or research lead before copying. No email is sent from this page."}</p>
      <HotelInquiryWorkspace key={`${active}:${chosen.id}:${stay.city}:${stay.checkIn}:${stay.checkOut}:${stay.rooms}:${stay.massRoom}`} tourId={tourId} hotel={chosen} stay={stay}/>
      </div></details>:null}
    </div></div>:<p className="text-sm text-slate-600">No hotel stays found. Add a stay to begin.</p>}
    <button type="button" onClick={()=>{setStays(v=>[...v,{city:"",checkIn:"",checkOut:"",rooms:20,massRoom:false}]);setActive(stays.length)}} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">+ Add hotel stay</button>
  </div>;
}
