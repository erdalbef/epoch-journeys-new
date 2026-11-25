"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HotelInquiryWorkspace from "./HotelInquiryWorkspace";
import RecordManualHotelOffer from "./RecordManualHotelOffer";
import ResearchHotelManualInquiry from "./ResearchHotelManualInquiry";
import OfficialHotelPageResearch from "./OfficialHotelPageResearch";
import HotelSupplierResearchCard from "./HotelSupplierResearchCard";
import { hotelResearchSearchUrl, compareLeadToCrm } from "@/lib/epoch-ai/hotelDiscoveryLeads";
import type { HotelEvidenceReport } from "@/lib/epoch-ai/hotelEvidenceResearch";
import { hotelEvidenceSummary, rankHotelResearchCandidates } from "@/lib/epoch-ai/hotelProcurementRecommendations";
import { meetsHotelGuestRatingMinimum, summarizeHotelEvidence, stableHotelIdentity, type HotelBrief } from "@/lib/epoch-ai/hotelExecutiveBrief";
import { buildSuitabilityReview } from "@/lib/epoch-ai/hotelSuitabilityReview";
import { leadEvidence, screenGroupCapacity } from "@/lib/epoch-ai/hotelLeadScreening";
import { assessHotelCoverage, matchHotelCrmRecords, reviewHotelCandidates } from "@/lib/epoch-ai/hotelDiscoveryReview";
import { validHotelResearchLocation, type WebHotelResult, type DiscoveredHotelLead } from "@/lib/epoch-ai/hotelWebResearch";
import { publishedHotelVerification } from "@/lib/epoch-ai/hotelPublicVerification";
import { hotelResearchForm, type HotelResearchContactFields } from "@/lib/epoch-ai/hotelResearchForm";
import { capacityBand, type HotelCapacityCandidate, type StructuredHotelResearch } from "@/lib/epoch-ai/hotelStructuredResearch";
import type { HotelSupplierResearch } from "@/lib/epoch-ai/hotelSupplierResearch";
import type { HotelOfficialSiteCandidate } from "@/lib/epoch-ai/hotelOfficialSiteSelection";
import type { OfficialPageExtraction } from "@/lib/epoch-ai/hotelOfficialPageExtraction";
import { contactEmail, createProcurementStay, initialProcurementStays, inquiry, searchCrmHotels, nights, type HotelContact, type Stay } from "@/lib/epoch-ai/hotelProcurement";
import { hotelStayCountry } from "@/lib/epoch-ai/hotelStayCities";

export default function HotelProcurementPilot({tourId,destinations,itinerary,hotels}:{tourId:string;destinations:string[];itinerary:string|null;hotels:HotelContact[]}) {
  const [stays,setStays]=useState(()=>initialProcurementStays(tourId,destinations,itinerary));
  const [active,setActive]=useState(stays[0]?.id ?? -1);
  const nextStayId = useRef(stays.length);
  const activeStay = stays.find(item => item.id === active);
  const ferry = activeStay?.ferry;
  const stay = ferry ? undefined : activeStay;
  const [crmSearch,setCrmSearch]=useState<Record<number,string>>({});
  const [supplierId,setSupplierId]=useState<Record<number,string>>({});
  const [leadByStay,setLeadByStay]=useState<Record<number,string>>({});
  const [manualLead,setManualLead]=useState<Record<number,string>>({});
  const [addedHotels,setAddedHotels]=useState<Record<string,string[]>>({});
  const [researchCountry,setResearchCountry]=useState<Record<number,string>>({});
  const [contactEdits,setContactEdits]=useState<Record<string,Partial<HotelResearchContactFields>>>({});
  const [facilitiesSource,setFacilitiesSource]=useState<Record<string,string>>({});
  const [reviewedContact,setReviewedContact]=useState<Record<string,string>>({});
  const [reviewedFacilitiesSource,setReviewedFacilitiesSource]=useState<Record<string,string>>({});
  const [checkStatus,setCheckStatus]=useState<Record<string,Record<string,boolean>>>({});
  const countryForCity:Record<string,string>={"Sarajevo":"Bosnia and Herzegovina","Kotor Bay":"Montenegro","Tirana":"Albania","Ohrid":"North Macedonia","Pristina":"Kosovo","Skopje":"North Macedonia","Belgrade":"Serbia"};
  const publicEvidenceChecklist = ["4-star standard verified", "Walk-in showers and lifts confirmed", "Coach access and parking confirmed", "Porterage confirmed"];
  const hotelConfirmationChecklist = ["20 rooms / allotment confirmed", "Group dinners and beverages confirmed", "Private Mass room confirmed where required"];

  const [,setCopyStatus]=useState("");
  const [crmSaveStatusByHotel,setCrmSaveStatusByHotel]=useState<Record<string,string>>({});
  const [crmSaving,setCrmSaving]=useState(false);
  const [savedSupplierByHotel,setSavedSupplierByHotel]=useState<Record<string,string>>({});
  const [liveByStay,setLiveByStay]=useState<Record<number,WebHotelResult[]>>({});
  const [capacityByStay,setCapacityByStay]=useState<Record<number,Record<string,HotelCapacityCandidate>>>({});
  const [foundByStay,setFoundByStay]=useState<Record<number,DiscoveredHotelLead[]>>({});
  const [linksByStay,setLinksByStay]=useState<Record<number,{label:string;url:string}[]>>({});
  const [researchMode,setResearchMode]=useState<Record<number,string>>({});
  const [liveError,setLiveError]=useState<Record<number,string>>({});
  const [liveLoading,setLiveLoading]=useState(false);
  const [destinationResearchByStay,setDestinationResearchByStay]=useState<Record<number,boolean>>({});
  const destinationResearchLoading = Boolean(destinationResearchByStay[active]);
  const destinationRequests = useRef(new Map<number, AbortController>());
  const [destinationResearchError,setDestinationResearchError]=useState<Record<number,string>>({});
  const [destinationResearchAt,setDestinationResearchAt]=useState<Record<number,string>>({});
  const [selectedForQuotes,setSelectedForQuotes]=useState<Record<number,string[]>>({});
  const [showQuoteDrafts,setShowQuoteDrafts]=useState(false);
  const researchDetailsRef=useRef<HTMLDetailsElement|null>(null);
  const [briefsByStay,setBriefsByStay]=useState<Record<number,Record<string,HotelBrief>>>({});
  const [evidenceReports,setEvidenceReports]=useState<Record<string,HotelEvidenceReport>>({});
  const [structuredResearchByKey,setStructuredResearchByKey]=useState<Record<string,StructuredHotelResearch>>({});
  const [officialSitesByKey,setOfficialSitesByKey]=useState<Record<string,HotelOfficialSiteCandidate[]>>({});
  const [evidenceErrors,setEvidenceErrors]=useState<Record<string,string>>({});
  const [supplierResearchByKey,setSupplierResearchByKey]=useState<Record<string,HotelSupplierResearch>>({});
  const [officialContacts,setOfficialContacts]=useState<Record<string,OfficialPageExtraction>>({});
  const [partialResearchByKey,setPartialResearchByKey]=useState<Record<string,boolean>>({});
  const [evidenceLoading,setEvidenceLoading]=useState<Record<string,boolean>>({});
  const requestsForHotelEvidence = useRef(new Set<string>());
  const country = (researchCountry[active] ?? stay?.country ?? countryForCity[stay?.city ?? ""] ?? "").trim();
  const locationReady = validHotelResearchLocation(stay?.city, country);
  const locationKey = (name: string) =>
    JSON.stringify([active, stay?.city, country, name.trim().toLocaleLowerCase()]);

  async function readResearchJson<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error(
        `Hotel research server returned HTTP ${response.status} instead of JSON. Check server logs.`
      );
    }

    try {
      return await response.json() as T;
    } catch {
      throw new Error(
        `Hotel research returned an invalid JSON response (HTTP ${response.status}).`
      );
    }
  }
  async function searchLiveHotels(){
    const index=active;const current=stay;
    if(!current?.city.trim()){setLiveError(p=>({...p,[index]:"Enter destination first."}));return;}
    setLiveLoading(true);setLiveError(p=>({...p,[index]:""}));
    try {
      const response=await fetch("/api/admin/epoch-ai/hotel-research/live",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({city:current.city,country,
          knownNames:[...new Set([...hotels.map(h=>h.name),...reviewHotelCandidates(current,hotels).map(c=>c.name)])]})
      });
      const result=await readResearchJson<{error?:string;leads?:WebHotelResult[];searchLinks?:{label:string;url:string}[];mode?:string;candidates?:DiscoveredHotelLead[]}>(response);
      if(!response.ok)throw Error(result.error||"Live hotel search unavailable");
      setLiveByStay(p=>({...p,[index]:result.leads||[]}));
      setFoundByStay(p=>({...p,[index]:result.candidates||[]}));
      setLinksByStay(p=>({...p,[index]:result.searchLinks||[]}));
      setResearchMode(p=>({...p,[index]:result.mode||"manual"}));
    }catch(err){setLiveError(p=>({...p,[index]:err instanceof Error?err.message:"Hotel research unavailable"}));}
    finally{setLiveLoading(false);}
  }

  async function researchDestinationHotels(){
    if (!stay || !locationReady || destinationRequests.current.has(active)) return;

    const request = new AbortController();
    destinationRequests.current.set(active, request);
    setDestinationResearchByStay(previous => ({...previous, [active]: true}));
    setDestinationResearchError(previous => ({...previous, [active]: ""}));
    try {
      const knownNames = [...new Set(reviewHotelCandidates(stay, hotels).map(hotel => hotel.name))].slice(0, 12);
      const res = await fetch("/api/admin/epoch-ai/hotel-research/shortlist", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({city: stay.city.trim(), country, knownNames}),
        signal: request.signal
      });
      const body = await readResearchJson<{error?:string;discovered?:DiscoveredHotelLead[];reports?:Record<string,HotelEvidenceReport>;briefs?:Record<string,HotelBrief>;capacities?:Record<string,HotelCapacityCandidate>;errors?:string[]}>(res);
      if (request.signal.aborted) return;
      if (!res.ok) throw Error(body.error || "Research unavailable");

      setFoundByStay(previous => ({...previous, [active]: body.discovered || []}));
      setBriefsByStay(previous => ({...previous, [active]: body.briefs || {}}));
      setCapacityByStay(previous => ({...previous, [active]: body.capacities || {}}));
      setEvidenceReports(previous => {
        const next = {...previous};
        for (const [name, report] of Object.entries(body.reports || {})) {
          next[locationKey(name)] = report;
        }
        return next;
      });
      setDestinationResearchAt(previous => ({...previous, [active]: new Date().toLocaleString()}));
      const errors = body.errors;
      if (errors?.length) {
        setDestinationResearchError(previous => ({
          ...previous,
          [active]: `${errors.length} research step(s) incomplete. ${errors[0]}`
        }));
      }
    } catch (error) {
      if (!request.signal.aborted) {
        setDestinationResearchError(previous => ({
          ...previous, [active]: error instanceof Error ? error.message : "Research unavailable"
        }));
      }
    } finally {
      if (destinationRequests.current.get(active) === request) {
        destinationRequests.current.delete(active);
        setDestinationResearchByStay(previous => ({...previous, [active]: false}));
      }
    }
  }
  async function researchSelectedHotel(name:string,city:string,country:string,requestKey:string){
    if (!name || !validHotelResearchLocation(city, country) || requestsForHotelEvidence.current.has(requestKey)) return;
    requestsForHotelEvidence.current.add(requestKey);
    setEvidenceLoading(p=>({...p,[requestKey]:true}));
    setEvidenceErrors(p=>({...p,[requestKey]:""}));
    try{
      const res=await fetch("/api/admin/epoch-ai/hotel-research/evidence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hotelName:name,city,country})});
      const body=await readResearchJson<{report?:HotelEvidenceReport;structuredResearch?:StructuredHotelResearch;officialSiteCandidates?:HotelOfficialSiteCandidate[];supplierResearch?:HotelSupplierResearch;partial?:boolean;error?:string}>(res);
      if(!res.ok||!body.report)throw Error(body.error||"Research unavailable");
      setEvidenceReports(p=>({...p,[requestKey]:body.report!}));
      const supplierResearch = body.supplierResearch;
      if (supplierResearch) setSupplierResearchByKey(p=>({...p,[requestKey]:supplierResearch}));
      setPartialResearchByKey(p=>({...p,[requestKey]:Boolean(body.partial)}));
      setOfficialSitesByKey(p=>({
        ...p,
        [requestKey]:body.officialSiteCandidates||[]
      }));
      setStructuredResearchByKey(p=>({
        ...p,
        [requestKey]:body.structuredResearch||{
          contacts:[],
          capacities:[],
          capacityStatus:"unverified"
        }
      }));
    }catch(error){setEvidenceErrors(p=>({...p,[requestKey]:error instanceof Error?error.message:"Research unavailable"}));}
    finally {
      requestsForHotelEvidence.current.delete(requestKey);
      setEvidenceLoading(p=>({...p,[requestKey]:false}));
    }
  }
  async function saveApprovedLead() {
    const selected = selectedLeadName;
    const saveKey = locationKey(selected);
    const setStatus = (message: string) => setCrmSaveStatusByHotel(previous => ({...previous, [saveKey]: message}));
    const recipient = leadEmail;
    const phone = researchForm.phone.trim();
    const source = contactLink;
    const facilities = facilitiesChecked ? facilitiesLink : undefined;
    if (!stay || !selected || !country) {
      setStatus("Enter the hotel city and country in Stay details.");
      return;
    }
    if (!contactChecked || !source) {
      setStatus("Review the published email and its source, then tick the contact review checkbox.");
      return;
    }
    if (!phone) {
      setStatus("Enter the hotel's published phone number.");
      return;
    }
    const confirmation = `Register ${selected} in ${stay.city}, ${country} as an INACTIVE research candidate?\n\nContact: ${recipient}, ${phone}\nContact evidence: ${source}\nFacilities evidence: ${facilities || "Pending hotel follow-up"}\n\nThis creates a CRM candidate only. No email will be sent.`;
    if (!window.confirm(confirmation)) return;
    setCrmSaving(true); setStatus("");
    try {
      const response = await fetch("/api/admin/epoch-ai/hotel-research/register", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({name:selected,city:stay.city,country,email:recipient,phone,source,facilitiesSource:facilities || undefined,adminVerification:{confirmation:"REGISTER VERIFIED RESEARCH LEAD",contactChecked:true,facilitiesChecked},hotelStay:{checkIn:stay.checkIn,checkOut:stay.checkOut,rooms:stay.rooms}}),
      });
      const result = await response.json() as {error?:string;supplierId?:string;alreadyExists?:boolean};
      if (!response.ok || !result.supplierId) throw new Error(result.error || "CRM registration did not complete.");
      const registeredSupplierId = result.supplierId;
      setSavedSupplierByHotel(previous => ({...previous, [saveKey]: registeredSupplierId}));
      setStatus(result.alreadyExists ? "Hotel already exists in CRM; no duplicate created." : "Approved research candidate added to Supplier CRM (INACTIVE). No inquiry sent.");
    } catch(err) {setStatus(err instanceof Error ? err.message : "Could not register supplier.");}
    finally {setCrmSaving(false);}
  }
  const referenceStay = stay?.reference;
  const referenceMismatch=Boolean(referenceStay&&stay&&(stay.city!==referenceStay.city||stay.checkIn!==referenceStay.checkIn||stay.checkOut!==referenceStay.checkOut||stay.rooms!==referenceStay.rooms));
  const hotelBriefs = new Map(
    Object.entries(briefsByStay[active] || {}).map(([name, brief]) => [stableHotelIdentity(name), brief])
  );
  const hotelBrief = (name: string) => hotelBriefs.get(stableHotelIdentity(name));
  const eligibleByGuestRating = (name: string) => meetsHotelGuestRatingMinimum(hotelBrief(name));
  const matches=useMemo(()=>stay?searchCrmHotels(hotels,stay.city,crmSearch[active]||""):[],[stay,hotels,crmSearch,active])
    .filter(hotel => eligibleByGuestRating(hotel.name));
  const chosen=hotels.find(h=>h.id===supplierId[active]);
  const selectedLeadName=leadByStay[active] || "";
  const selectedName=chosen?.name||selectedLeadName;

  useEffect(()=>{
    if(selectedLeadName&&!chosen){
      researchDetailsRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
    }
  },[selectedLeadName,chosen,active]);
  const evidenceKey = locationKey(selectedName);
  const registeredSupplierId = savedSupplierByHotel[evidenceKey];
  const crmSaveState = crmSaveStatusByHotel[evidenceKey];
  const reviewKey = JSON.stringify([evidenceKey, stay?.checkIn, stay?.checkOut, stay?.rooms]);
  const evidenceReport=evidenceReports[evidenceKey];
  const supplierResearch = supplierResearchByKey[evidenceKey];
  const crmMatchesForSelected = stay && selectedName ? matchHotelCrmRecords(selectedName, stay.city, hotels) : [];
  const structuredResearch=structuredResearchByKey[evidenceKey];
  const officialSiteCandidates=officialSitesByKey[evidenceKey]||[];
  const publishedProfile = publishedHotelVerification(selectedName, stay?.city, country);
  const researchForm = hotelResearchForm(supplierResearch, publishedProfile, contactEdits[evidenceKey], facilitiesSource[evidenceKey], officialContacts[evidenceKey]);
  const {contactLink, contactReviewKey, facilitiesLink} = researchForm;
  const contactChecked = Boolean(contactReviewKey && reviewedContact[evidenceKey] === contactReviewKey);
  const facilitiesChecked = Boolean(facilitiesLink && reviewedFacilitiesSource[evidenceKey] === facilitiesLink);
  const suitability=selectedName?buildSuitabilityReview({roomsRequested:stay?.rooms||0,massRoomRequired:Boolean(stay?.massRoom),totalRooms:leadEvidence(selectedName)?.totalRooms,marked:checkStatus[reviewKey]||{},hasPublicFacilitiesSource:Boolean(facilitiesLink)}):null;
  const leadEmail = researchForm.email.trim();
  const coverage=stay?assessHotelCoverage(stay,hotels):null;
  const candidateReviews=stay?reviewHotelCandidates(stay,hotels).filter(item => eligibleByGuestRating(item.name)):[];
  const addedHotelKey = locationKey("");
  const manualHotels = addedHotels[addedHotelKey] ?? [];
  const recommendationOptions=[
    ...manualHotels.map(name => ({name, inCrm:matchHotelCrmRecords(name,stay?.city||"",hotels).length>0, discovery:false, manual:true})),
    ...candidateReviews.map(item=>({name:item.name,inCrm:item.inCrm,discovery:false,manual:false})),
    ...(foundByStay[active]||[]).filter(item=>eligibleByGuestRating(item.name)&&item.identityStatus!=="identity-review"&&!candidateReviews.some(c=>compareLeadToCrm(item.name,[c.name]))&&!matchHotelCrmRecords(item.name,stay?.city||"",hotels).length).map(item=>({name:item.name,inCrm:false,discovery:true,manual:false}))];
  const researchShortlist=rankHotelResearchCandidates(recommendationOptions.map(item=>({
    ...item,report:evidenceReports[locationKey(item.name)],
    reviewedContact: item.name===selectedName&&contactChecked,
    reviewedFacilities: item.name===selectedName&&facilitiesChecked
  })),5);
  const newWebResults=(liveByStay[active]||[]);
  const discovered=(foundByStay[active]||[]).filter((item,index,all)=>
    eligibleByGuestRating(item.name) &&
    !candidateReviews.some(candidate=>compareLeadToCrm(item.name,[candidate.name])) &&
    !matchHotelCrmRecords(item.name,stay?.city||"",hotels).length &&
    all.findIndex(other=>stableHotelIdentity(other.name)===stableHotelIdentity(item.name))===index);
  function useResearchLead(name:string){
    setLeadByStay(p=>({...p,[active]:name}));
    setManualLead(p=>({...p,[active]:""}));
    setSupplierId(p=>({...p,[active]:""}));
    setCopyStatus("");
  }
  function updateContact(edits: Partial<HotelResearchContactFields>) {
    const changesAddress = edits.email !== undefined || edits.source !== undefined;
    const pair = changesAddress ? {email: researchForm.email, source: researchForm.source} : {};
    setContactEdits(previous => ({
      ...previous, [evidenceKey]: {...previous[evidenceKey], ...pair, ...edits}
    }));
    if (changesAddress) setReviewedContact(previous => ({...previous, [evidenceKey]: ""}));
  }
  function updateFacilitiesSource(value: string) {
    setFacilitiesSource(previous => ({...previous, [evidenceKey]: value}));
    setReviewedFacilitiesSource(previous => ({...previous, [evidenceKey]: ""}));
  }
  function researchSelectedContact(name: string) {
    const key = locationKey(name);
    if (stay && locationReady && !supplierResearchByKey[key]) {
      void researchSelectedHotel(name, stay.city.trim(), country, key);
    }
  }

  function reviewHotelLead(name: string) {
    if (selectedLeadName !== name || chosen) useResearchLead(name);
    else if (researchDetailsRef.current) {
      researchDetailsRef.current.open = true;
      researchDetailsRef.current.scrollIntoView({behavior:"smooth",block:"start"});
    }
    researchSelectedContact(name);
  }

  function addHotelToList() {
    const entered = (manualLead[active] ?? "").trim();
    if (!stay || !stableHotelIdentity(entered)) return;
    const [property, suffix] = entered.split(",").map(part => part.trim());
    const name = suffix && stableHotelIdentity(suffix) === stableHotelIdentity(stay.city)
      ? property : entered;
    if (!stableHotelIdentity(name)) return;

    const identity = stableHotelIdentity(name);
    const existing = matchHotelCrmRecords(name,stay.city,hotels)[0];
    const alreadyListed = recommendationOptions.find(option => stableHotelIdentity(option.name) === identity);
    const displayName = existing?.name ?? alreadyListed?.name ?? name;
    setAddedHotels(previous => {
      const names = previous[addedHotelKey] ?? [];
      return names.some(item => stableHotelIdentity(item) === identity)
        ? previous : {...previous, [addedHotelKey]: [...names, displayName]};
    });
    setManualLead(previous => ({...previous, [active]: ""}));
    if (existing) selectCrmHotel(existing);
    else reviewHotelLead(displayName);
  }

  function selectCrmHotel(hotel: HotelContact) {
    setSupplierId(p=>({...p,[active]:hotel.id}));
    setLeadByStay(p=>({...p,[active]:""}));
    setManualLead(p=>({...p,[active]:""}));
    researchSelectedContact(hotel.name);
    setCopyStatus("");
    document.getElementById("epoch-hotel-inquiry")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function clearLocationResearch() {
    destinationRequests.current.get(active)?.abort();
    destinationRequests.current.delete(active);
    setDestinationResearchByStay(previous => ({...previous, [active]: false}));
    setDestinationResearchAt(previous => ({...previous, [active]: ""}));
    setDestinationResearchError(previous => ({...previous, [active]: ""}));
    setBriefsByStay(previous => ({...previous, [active]: {}}));
    setCapacityByStay(previous => ({...previous, [active]: {}}));
    setFoundByStay(previous => ({...previous, [active]: []}));
    setLiveByStay(previous => ({...previous, [active]: []}));
    setLinksByStay(previous => ({...previous, [active]: []}));
    setLiveError(previous => ({...previous, [active]: ""}));
    setResearchMode(previous => ({...previous, [active]: ""}));
    setSelectedForQuotes(previous => ({...previous, [active]: []}));
    useResearchLead("");
  }

  function update<K extends keyof Stay>(field: K, value: Stay[K]) {
    if (field === "city") {
      setResearchCountry(previous => ({...previous, [active]: countryForCity[String(value)] || hotelStayCountry(String(value)) || ""}));
      clearLocationResearch();
    }
    setStays(current => current.map(item => item.id === active ? {...item, [field]: value} : item));
    setCopyStatus("");
  }

  function addStay() {
    const item = createProcurementStay(nextStayId.current++);
    setStays(current => [...current, item]);
    setActive(item.id);
    setCopyStatus("");
  }

  function removeStay() {
    const position = stays.findIndex(item => item.id === active);
    const remaining = stays.filter(item => item.id !== active);
    clearLocationResearch();
    setStays(remaining);
    setActive(remaining[Math.min(position, remaining.length - 1)]?.id ?? -1);
  }
  return <div className="space-y-5">
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Preparation only.</strong> This page does not send email, book hotels or change supplier rates. Saving a draft records it in Hotel Inquiry History only. {stays.some(item=>item.reference)?"Balkan reference dates are editable. Verify hotel stays before preparing inquiries.":"Review which destinations need hotel stays and verify their dates before preparing inquiries."} Include the official Epoch Journeys signature in any approved message.</div>
    <div className="flex flex-wrap gap-2">
      {stays.map((item, position) => {
        const city = item.city.trim();
        const repeatedCity = city && stays.some(other =>
          other.id !== item.id && other.city.trim().toLowerCase() === city.toLowerCase()
        );
        const label = item.ferry?.label ?? (city ? (repeatedCity ? `${city} (stay ${position + 1})` : city) : `Stay ${position + 1}`);
        return <button key={item.id} type="button" aria-pressed={item.id === active}
          onClick={() => { setActive(item.id); setCopyStatus(""); }}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${item.id === active ? "bg-[#001F3F] text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
          {label}
        </button>;
      })}
    </div>
    {stay && <RecordManualHotelOffer key={active} tourId={tourId} stay={stay} hotels={hotels} />}
    {ferry && activeStay ? <section className="space-y-2 rounded-xl border bg-white p-4" aria-label="Overnight ferry">
      <h2 className="text-lg font-bold text-[#001F3F]">{ferry.label}</h2>
      <p className="text-sm text-slate-600">Day {ferry.day} · Overnight cabins</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="font-medium">Sailing date</dt><dd>{activeStay.checkIn || "Review itinerary dates"}</dd></div>
        <div><dt className="font-medium">Arrival date</dt><dd>{activeStay.checkOut || "Review itinerary dates"}</dd></div>
      </dl>
    </section> : null}
    {stay?<section className="rounded-xl border bg-white p-4 space-y-3" aria-label="Hotel stay details">
      <h2 className="text-lg font-bold text-[#001F3F]">Stay details — review before use</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Hotel city<input className="mt-1 w-full rounded-lg border p-2" value={stay.city} onChange={e=>update("city",e.target.value)}/></label>
        <label className="block text-sm font-medium">Country<input className="mt-1 w-full rounded-lg border p-2" value={researchCountry[active] ?? country} onChange={e=>{
          const value = e.target.value;
          setResearchCountry(previous=>({...previous,[active]:value}));
          clearLocationResearch();
        }}/></label>
      </div>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Check-in<input className="mt-1 w-full rounded-lg border p-2" type="date" value={stay.checkIn} onChange={e=>update("checkIn",e.target.value)}/></label><label className="text-sm font-medium">Check-out<input className="mt-1 w-full rounded-lg border p-2" type="date" value={stay.checkOut} onChange={e=>update("checkOut",e.target.value)}/></label></div>
      {referenceStay?<section className={`rounded-lg border p-3 text-xs ${referenceMismatch?"border-amber-400 bg-amber-50 text-amber-950":"border-sky-200 bg-sky-50 text-sky-950"}`}>
        <strong>2027 Balkan reference schedule (not a confirmed hotel booking):</strong> {referenceStay.city} · check-in {referenceStay.checkIn} · check-out {referenceStay.checkOut} · {referenceStay.rooms} rooms.
        {referenceMismatch?<><p className="mt-1 font-semibold">The editable stay fields differ from the 2027 reference. Verify the intended tour schedule before saving any inquiry.</p><button type="button" className="mt-2 rounded border border-amber-600 bg-white px-2 py-1 font-semibold" onClick={()=>{clearLocationResearch();setResearchCountry(previous=>({...previous,[active]:countryForCity[referenceStay.city]||""}));setStays(current=>current.map(item=>item.id===active?{...item,...referenceStay}:item))}}>Restore 2027 reference stay (no database write)</button></>:<p className="mt-1">Current editable stay fields match the reference. Check the year and dates before approving.</p>}
      </section>:null}
      <p className="text-sm text-slate-600">Calculated nights: {nights(stay)||"Review dates"}</p>
      <label className="block text-sm font-medium">Number of rooms<input type="number" min={1} max={250} className="mt-1 w-full rounded-lg border p-2" value={stay.rooms} onChange={e=>update("rooms",Number(e.target.value))}/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={stay.massRoom} onChange={e=>update("massRoom",e.target.checked)}/> Ask about private Mass meeting room (only where needed)</label>
      <button type="button" onClick={removeStay} className="rounded border px-2 py-1 text-sm">Remove stay</button>
    </section>:null}
    {stay?<section className="rounded-xl border border-blue-200 bg-white p-4 space-y-3" aria-label="Quick hotel quotation preparation">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-bold text-[#001F3F]">1. Recommended hotels from Supplier CRM</h2><p className="text-sm text-slate-600">{stay.city} · {stay.checkIn||"Check-in needed"} to {stay.checkOut||"Check-out needed"} · {stay.rooms} rooms</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">Drafts only — no emails sent</span></div>
      <p className="text-sm text-slate-700">Start with your existing CRM hotels. Choose a hotel to open its editable request immediately. The hotel's availability, rates, room facilities and coach access are questions for the hotel, not prerequisites for drafting.</p>
      <label className="block text-sm font-medium">Find a hotel already in Supplier CRM
        <input type="search" placeholder="Search hotel name or city" className="mt-1 w-full rounded border bg-white p-2" value={crmSearch[active]||""} onChange={e=>setCrmSearch(p=>({...p,[active]:e.target.value}))}/>
      </label>
      <div className="space-y-2">{matches.slice(0,12).map(hotel=>{
        const selected=(selectedForQuotes[active]||[]).some(name=>stableHotelIdentity(name)===stableHotelIdentity(hotel.name));
        const recipient=contactEmail(hotel);
        return <div key={hotel.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
          <div className="min-w-0"><p className="font-semibold text-sm">{hotel.name}</p><p className="text-xs text-slate-600">{hotel.city||stay.city} · {recipient||"Email missing in CRM — verification required"}</p></div>
          <div className="flex items-center gap-3"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={selected} onChange={e=>setSelectedForQuotes(previous=>{const names=previous[active]||[];return {...previous,[active]:e.target.checked?[...names.filter(n=>stableHotelIdentity(n)!==stableHotelIdentity(hotel.name)),hotel.name]:names.filter(n=>stableHotelIdentity(n)!==stableHotelIdentity(hotel.name))}})}/> Compare drafts</label>
            <button type="button" onClick={()=>selectCrmHotel(hotel)} className="rounded bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white">{chosen?.id===hotel.id?"Selected — edit below":"Prepare inquiry"}</button></div>
        </div>;
      })}</div>
      {!matches.length?<p className="text-sm text-amber-900">No matching CRM hotel. Open the optional research section below to investigate a new candidate.</p>:null}
      {matches.length>12?<p className="text-xs text-slate-600">Showing first 12 matches. Search to narrow the list.</p>:null}
      <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={!(selectedForQuotes[active]||[]).length} onClick={()=>setShowQuoteDrafts(value=>!value)} className="rounded border border-[#001F3F] px-3 py-2 text-sm font-semibold text-[#001F3F] disabled:opacity-40">{showQuoteDrafts?"Hide":"Preview"} selected drafts ({(selectedForQuotes[active]||[]).length})</button><p className="text-xs text-slate-600">Preview only. Save and approve each inquiry separately after checking its recipient.</p></div>
      {showQuoteDrafts&&(selectedForQuotes[active]||[]).length?<div className="space-y-2">{(selectedForQuotes[active]||[]).map(name=>{const candidate=hotels.find(h=>stableHotelIdentity(h.name)===stableHotelIdentity(name));const example=inquiry(stay,name);return <details key={name} className="rounded border p-3"><summary className="cursor-pointer text-sm font-semibold">{name} — {candidate?contactEmail(candidate)||"Email missing":"Research lead: CRM registration needed"}</summary><p className="mt-2 text-xs text-amber-900">Unsaved preview, not approved and not sent. Confirm the supplier identity and recipient before saving.</p><p className="mt-2 text-sm font-medium">{example.subject}</p><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{example.body}</pre></details>})}</div>:null}
      <p className="text-xs text-slate-600">If dates or room requirements change, update Stay details above before saving any draft. The live supplier-sending lock remains unchanged.</p>
    </section>:null}
    {stay?<div className="grid gap-5"><div className="space-y-4 rounded-xl border bg-white p-5">
      <h2 id="epoch-hotel-inquiry" className="text-lg font-bold text-[#001F3F]">2. Review &amp; save quotation request</h2>
      <p className="text-sm text-slate-700">Hotel to approach: <strong>{selectedName || "Not selected"}</strong>. Contact email: <strong>{chosen?contactEmail(chosen)||"Not in CRM":leadEmail||"Not found"}</strong>{!chosen && leadEmail && !contactChecked ? " (review required)" : ""}.</p>
      {!chosen && selectedLeadName ? <ResearchHotelManualInquiry key={JSON.stringify([evidenceKey,stay.checkIn,stay.checkOut,stay.rooms,stay.massRoom])} hotelName={selectedLeadName} stay={stay} recipient={leadEmail} contactVerified={contactChecked} /> : null}
      {!chosen && !selectedLeadName ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Select a CRM hotel or a researched hotel to prepare an inquiry. No email is sent here.</p> : null}
      {chosen&&!contactEmail(chosen)?<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Recipient not verified — check the hotel's current official contact source before proceeding.</p>:null}
      {chosen?<HotelInquiryWorkspace key={`${active}:${chosen.id}:${stay.city}:${stay.checkIn}:${stay.checkOut}:${stay.rooms}:${stay.massRoom}`} tourId={tourId} hotel={chosen} stay={stay}/>:null}
    </div><div className="space-y-4 rounded-xl border bg-white p-5" aria-label="Optional hotel research">
      {coverage?<details className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"><summary className="cursor-pointer font-semibold text-[#001F3F]">3. Discover additional hotels (optional)</summary><section className="mt-3 space-y-4 text-sm" aria-label="Hotel research and supplier selection">
        <button type="button" disabled={destinationResearchLoading||!locationReady} onClick={()=>void researchDestinationHotels()} className="rounded border border-[#001F3F] px-3 py-2 text-xs font-semibold disabled:opacity-40">{destinationResearchLoading?"Researching...":"Find more hotel options"}</button>
        {!locationReady?<p className="text-xs text-slate-600">Enter a destination and country to search for hotels.</p>:null}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#001F3F]">Hotel Research &amp; Supplier Selection</h3>
          <p className="text-xs text-slate-600">{stay.city} · {stay.checkIn||"Check-in not set"} to {stay.checkOut||"Check-out not set"} · {stay.rooms} rooms requested</p>
        </div>
        <details className="text-xs text-slate-600"><summary className="cursor-pointer">Supplier research coverage</summary><p className="mt-2">CRM: {coverage.crmCount} · Known leads: {candidateReviews.filter(item=>!item.inCrm).length} · Published contact profiles: {candidateReviews.filter(item=>item.contactEvidence).length}</p></details>
        <section className="rounded-lg border border-slate-200 bg-white p-3 space-y-3" aria-label="Epoch AI hotel recommendations">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h4 className="font-semibold text-[#001F3F]">Epoch AI — Hotel Recommendations</h4>
              <p className="text-xs text-slate-600">Browse available hotel options. Open website, rates and reviews to verify details yourself before choosing.</p></div>
            {destinationResearchLoading?<span className="text-xs text-slate-500" role="status">Researching hotels...</span>:null}
          </div>
          <form className="flex flex-wrap items-end gap-2" onSubmit={event=>{event.preventDefault();addHotelToList();}}>
            <label className="min-w-48 flex-1 text-xs font-medium">Hotel name
              <input
                value={manualLead[active] ?? ""}
                maxLength={180}
                onChange={event=>{
                  const value = event.target.value;
                  setManualLead(previous=>({...previous,[active]:value}));
                }}
                placeholder="Enter a hotel you know"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <button type="submit" disabled={!manualLead[active]?.trim()} className="rounded border border-[#001F3F] px-3 py-2 text-xs font-semibold disabled:opacity-40">
              Add hotel to list
            </button>
          </form>
          {(() => {
            const grouped=new Map<string,typeof recommendationOptions[number]>();
            // A brand variant must never occupy two recommendation positions.
            for(const option of recommendationOptions){const key=stableHotelIdentity(option.name);const prior=grouped.get(key);if(!prior||(!prior.manual&&((option.name.length>prior.name.length&&option.discovery===prior.discovery)||(!prior.discovery&&option.discovery&&!prior.inCrm))))grouped.set(key,option);}
            const choices=[...grouped.values()].map(option=>{
              const brief = hotelBrief(option.name);
              const report=evidenceReports[locationKey(option.name)];
              const officialDomains=["marriott.com","hilton.com","all.accor.com","accor.com","ihg.com","hyatt.com","radissonhotels.com","scandichotels.com","hotel-sirius.com","swissdiamondhotel.com"];
              const sources=[...(brief?.sourceUrls||[]),...(foundByStay[active]||[]).filter(result=>stableHotelIdentity(result.name)===stableHotelIdentity(option.name)).map(result=>result.sourceUrl)];
              const officialUrl=publishedHotelVerification(option.name,stay.city,country)?.source ??
                sources.find(url=>{try{const host=new URL(url).hostname.toLowerCase();return officialDomains.some(domain=>host===domain||host.endsWith("."+domain));}catch{return false;}});
              const hotelQuery=`${option.name} ${stay.city} ${country}`;
              const websiteSearch=`https://www.google.com/search?q=${encodeURIComponent(hotelQuery+" official hotel website")}`;
              const reviewSearch=`https://www.google.com/search?q=${encodeURIComponent(hotelQuery+" hotel guest reviews ratings")}`;
              const rateSearch=`https://www.google.com/travel/hotels?q=${encodeURIComponent(hotelQuery+" "+stay.checkIn+" "+stay.checkOut)}`;
              const published = Object.entries(capacityByStay[active] || {}).find(([name])=>stableHotelIdentity(name)===stableHotelIdentity(option.name))?.[1];
              const curated = leadEvidence(option.name);
              const capacity = published || (curated && {totalRooms:curated.totalRooms,sourceUrl:curated.source});
              return {...option,capacity,brief,officialUrl,websiteSearch,reviewSearch,rateSearch,bullets:brief?.reasons?.length?brief.reasons:summarizeHotelEvidence(option.name,report)};
            });
            const roomSizePriority = (rooms?: number) => {
              if (!rooms) return 1;
              const band = capacityBand(rooms);
              return band === "preferred" ? 3 : band === "possible" ? 2 : 0;
            };
            choices.sort((a,b)=>Number(b.manual)-Number(a.manual)||roomSizePriority(b.capacity?.totalRooms)-roomSizePriority(a.capacity?.totalRooms)||
              (b.capacity?.totalRooms||0)-(a.capacity?.totalRooms||0)||Number((b.bullets?.length||0)>0)-Number((a.bullets?.length||0)>0)||a.name.localeCompare(b.name));
            const selected=selectedForQuotes[active]||[];
            return <div className="space-y-3">
              <p className="text-xs text-slate-600">{choices.length} distinct hotels listed. Manually added hotels appear first. Automatic recommendations apply the published guest rating and room capacity filters.</p>
              {choices.slice(0,Math.max(20,manualHotels.length)).map((option,index)=><div key={stableHotelIdentity(option.name)} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><p className="font-semibold text-[#001F3F]">{index+1}. {option.name} <span className="ml-1 text-[10px] font-medium text-slate-500">{option.inCrm?"In CRM":option.manual?"Manually added":option.discovery?"New discovery":"Known lead"}</span></p>
                    <p className="mt-1 text-xs text-slate-700">{option.capacity ? <><strong>{option.capacity.totalRooms} published guest rooms and suites</strong> · <a href={option.capacity.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Capacity source</a></> : "Published room count unavailable"}</p>
                    {option.brief?.rating?<p className="text-xs text-slate-700">Guest rating: {option.brief.rating} {option.brief.ratingSourceUrl?<a href={option.brief.ratingSourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Source</a>:null}</p>:null}
                    {option.brief?.bbRate?<p className="text-xs text-slate-700">Indicative BB rate: {option.brief.bbRate}</p>:null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <a href={option.officialUrl||option.websiteSearch} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">{option.officialUrl?"Hotel website":"Find official website"}</a>
                      <a href={option.rateSearch} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">Check rates</a>
                      <a href={option.reviewSearch} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">Read reviews</a>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">{option.bullets.slice(0,5).map((reason,i)=><li key={`${i}:${reason}`}>{reason}</li>)}</ul>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!option.inCrm?<button type="button" onClick={()=>reviewHotelLead(option.name)} className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white">Verify contact &amp; register</button>:<button type="button" onClick={()=>{const hotel=matchHotelCrmRecords(option.name,stay.city,hotels)[0];if(hotel)selectCrmHotel(hotel);}} className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white">Prepare inquiry</button>}
                    <label className="flex items-center gap-1 text-xs font-semibold"><input type="checkbox" checked={selected.some(n=>stableHotelIdentity(n)===stableHotelIdentity(option.name))} onChange={e=>setSelectedForQuotes(p=>({...p,[active]:e.target.checked?[...selected.filter(n=>stableHotelIdentity(n)!==stableHotelIdentity(option.name)),option.name]:selected.filter(n=>stableHotelIdentity(n)!==stableHotelIdentity(option.name))}))}/> Compare drafts</label>
                  </div>
                </div>
              </div>)}
              {!choices.length&&!destinationResearchLoading?<p className="text-xs text-slate-700">No hotels identified from available sources.</p>:null}
              <p className="text-xs text-slate-600">Select hotels here to include them in the quick preview above. Inquiries remain separate for approval and audit.</p>
            </div>;
          })()}
          {destinationResearchAt[active]?<p className="text-xs text-slate-500">Last destination research: {destinationResearchAt[active]} (this browser session)</p>:null}
          {destinationResearchError[active]?<p role="alert" className="text-xs text-amber-900">{destinationResearchError[active]}</p>:null}
          <p className="text-xs text-slate-600">Choose hotels to request quotations. Drafts only — no emails are sent.</p>
        </section>
        <details className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold text-[#001F3F]">View discovery source pages and raw research leads</summary>
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#001F3F]">Discover additional hotels</p><span className="text-xs text-slate-500">No Google Cloud needed</span></div>
          <p className="text-xs text-slate-600">Searches public websites for additional hotel names. Existing CRM hotels and known leads are excluded from suggested names. No Google Cloud account required. Automatic results need a server-side Brave Search API key; otherwise use manual links.</p>

          {liveError[active]?<p role="alert" className="text-xs text-amber-900">{liveError[active]}</p>:null}
          {researchMode[active]?<p role="status" className="text-xs text-slate-600">{researchMode[active]==="brave"?`${discovered.length} possible new hotel names found; all require independent identity and suitability checks.`:"No search provider configured; use the public research links below."}</p>:null}
          {(linksByStay[active]||[]).length?<details className="text-xs"><summary className="cursor-pointer font-medium text-blue-800">Manual web-search links ({(linksByStay[active]||[]).length})</summary><div className="mt-2 space-y-1">{(linksByStay[active]||[]).map(link=><p key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{link.label}</a></p>)}</div></details>:null}
          {discovered.length?<div className="space-y-2"><p className="text-xs font-semibold text-[#001F3F]">Possible new hotels — not yet verified ({discovered.length})</p>
            {discovered.map(result=><div key={`${result.name}:${result.sourceUrl}`} className="rounded border p-2 text-xs"><p className="font-semibold">{result.name}</p>
              <p className="text-slate-500">{result.sourceType==="possible-official-site"?"Possible hotel website":"Third-party mention"} · {result.sourceHost}</p>
              <p className={result.identityStatus==="identity-review"?"text-amber-900 font-semibold":"text-slate-600"}>{result.identityStatus==="identity-review"?"Identity mismatch — do not register from this result":"Source/name consistency screen only — not verified"}</p>
              <p className="text-slate-600">{result.identityNote}</p>
              <p className="text-slate-600">{result.snippet||"No source excerpt"}</p>
              <div className="mt-1 flex flex-wrap gap-2"><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Inspect source</a>
                <button type="button" disabled={result.identityStatus==="identity-review"} onClick={()=>reviewHotelLead(result.name)} className="rounded border px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-50">{result.identityStatus==="identity-review"?"Identity review required":"Review candidate"}</button></div>
              <p className="mt-1 text-amber-800">Verify hotel identity, address and official website before using this name; group capacity and contact remain unknown.</p></div>)}</div>:null}
          {newWebResults.length?<details className="text-xs"><summary className="cursor-pointer font-medium text-blue-800">All search pages ({newWebResults.length}) — including non-hotel pages</summary><div className="mt-2 space-y-2">{newWebResults.map(result=><div key={result.url} className="border-t pt-2"><p className="font-semibold">{result.title}</p><p className="text-slate-600">{result.description||"Unverified search result"}</p><a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Inspect source</a></div>)}</div></details>:null}
          {researchMode[active]==="brave"&&!discovered.length?<p className="text-xs text-slate-500">No distinct hotel names could be identified from this search. Review the source pages or use manual search.</p>:null}
        </div>
        </details>
        <details className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold text-[#001F3F]">View complete hotel candidate directory ({candidateReviews.length} known)</summary>
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-[#001F3F]">Hotel candidates</h4><span className="text-xs text-slate-600">{candidateReviews.length} known candidates · {discovered.length} possible new names</span></div>
          <p className="text-xs text-slate-600">Research candidates are not approved suppliers. Confirm room availability and group terms with each hotel.</p>
          <div className="space-y-2">{candidateReviews.map(item=>{
            const crmHotel=hotels.find(h=>item.crmIds.includes(h.id));
            const activeItem=selectedName.toLocaleLowerCase()===item.name.toLocaleLowerCase();
            return <div key={item.name} className={`rounded-lg border p-3 ${activeItem?"border-blue-400 bg-blue-50":"border-slate-200 bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="font-semibold text-[#001F3F]">{item.name}</p><p className="mt-1 text-xs text-slate-600">{item.inCrm?"Supplier CRM":"Research lead"} · {item.contactEvidence?"Contact source on file":"Contact needs verification"} · {item.capacityStatus==="unknown"?"Capacity unknown":item.capacityStatus==="capacity-caution"?"Capacity caution":"Size screen only"}</p>{activeItem?<p className="mt-1 text-xs text-blue-800">Next: {item.questions[0]}</p>:null}</div>
                <div className="flex flex-wrap gap-2"><a href={hotelResearchSearchUrl(stay.city,item.name)} target="_blank" rel="noopener noreferrer" className="rounded border px-2 py-1 text-xs text-blue-700">Research</a><button type="button" onClick={()=>{if(crmHotel)selectCrmHotel(crmHotel);else reviewHotelLead(item.name);}} className="rounded bg-[#001F3F] px-2 py-1 text-xs font-semibold text-white">{activeItem?"Selected":item.inCrm?"Select CRM":"Review lead"}</button></div>
              </div>
            </div>;
          })}</div>
          {!candidateReviews.length?<p className="rounded-lg border bg-white p-3 text-xs">No known hotel candidates for this destination. Research hotels and enter independently verified details below.</p>:null}
        </div>
        </details>
        <details className="rounded-lg border bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold text-[#001F3F]">Find another hotel in Supplier CRM</summary>
          <div className="mt-3 space-y-2"><label className="block font-medium">Search by hotel name, city or country<input type="search" className="mt-1 w-full rounded border p-2" value={crmSearch[active]||""} onChange={e=>setCrmSearch(p=>({...p,[active]:e.target.value}))}/></label>
          <select className="w-full rounded border p-2" value={supplierId[active]||""} onChange={e=>{const hotel=hotels.find(item=>item.id===e.target.value);if(hotel)selectCrmHotel(hotel);else setSupplierId(p=>({...p,[active]:""}));}}><option value="">Choose a CRM hotel (optional)</option>{chosen&&!matches.some(h=>h.id===chosen.id)?<option value={chosen.id}>{chosen.name} (selected)</option>:null}{matches.map(h=><option key={h.id} value={h.id}>{h.name} — {h.city||"City not recorded"}</option>)}</select>
          <Link href="/admin/suppliers?type=HOTEL" className="inline-block text-blue-700 underline">Open all hotel suppliers in CRM</Link></div>
        </details>
        <p className="text-xs text-slate-600">Review → verify evidence → explicitly approve CRM registration → prepare inquiry draft. Nothing on this screen approves a booking, price or supplier email.</p>
      </section></details>:null}
        {selectedName ? <details ref={researchDetailsRef} key={`${active}:${selectedName}`} open className="scroll-mt-8 space-y-2 rounded-lg border border-blue-300 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-[#001F3F]">{chosen?"View research details":"Verify contact & register"} — {selectedName} {chosen?"(CRM)":"(research lead)"}</summary><div className="mt-3 space-y-3">
          {chosen ? <p className="text-xs"><strong>Existing CRM record.</strong> Review the saved supplier and its current contact. <Link href={`/admin/suppliers/${chosen.id}`} className="text-blue-700 underline">Open supplier</Link></p> :
            crmMatchesForSelected.length ? <div className="rounded border p-2 text-xs space-y-1">
              <p className="font-semibold">Existing CRM records for this property</p>
              {crmMatchesForSelected.map(hotel => <button key={hotel.id} type="button"
                className="block rounded border px-2 py-1" onClick={()=>selectCrmHotel(hotel)}>
                Use CRM record — {hotel.name}{contactEmail(hotel) ? ` · ${contactEmail(hotel)}` : ""}
              </button>)}
            </div> : <p className="text-xs">No matching local CRM record found.</p>}
          {!chosen && !crmMatchesForSelected.length ? <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm" aria-label="Hotel contact and CRM registration">
            <h3 className="font-semibold text-[#001F3F]">Hotel contact and CRM registration</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block font-medium">Hotel recipient email
                <input type="email" value={researchForm.email} onChange={e=>updateContact({email:e.target.value})} className="mt-1 w-full rounded border bg-white p-2"/>
              </label>
              <label className="block font-medium">Published phone
                <input type="tel" value={researchForm.phone} onChange={e=>updateContact({phone:e.target.value})} className="mt-1 w-full rounded border bg-white p-2"/>
              </label>
            </div>
            <label className="block font-medium">Contact source HTTPS URL
              <input type="url" value={researchForm.source} onChange={e=>updateContact({source:e.target.value})} className="mt-1 w-full rounded border bg-white p-2"/>
            </label>
            {contactLink ? <a href={contactLink} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-700 underline">Open contact source for review</a> : null}
            <label className="flex items-start gap-2">
              <input className="mt-1" type="checkbox" checked={contactChecked} disabled={!contactReviewKey}
                onChange={e=>{
                  if (e.target.checked) {
                    setContactEdits(previous => ({...previous, [evidenceKey]: {
                      ...previous[evidenceKey], email: researchForm.email, source: researchForm.source,
                    }}));
                  }
                  setReviewedContact(previous => ({...previous, [evidenceKey]: e.target.checked ? contactReviewKey : ""}));
                }}/>
              I checked that this published source lists the hotel's recipient email.
            </label>
            <details className="space-y-2 rounded border bg-white p-2">
              <summary className="cursor-pointer font-medium">Facilities evidence (optional)</summary>
              <label className="block">Facilities source HTTPS URL
                <input type="url" className="mt-1 w-full rounded border p-2" value={researchForm.facilities} onChange={e=>updateFacilitiesSource(e.target.value)}/>
              </label>
              {facilitiesLink ? <>
                <a href={facilitiesLink} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-700 underline">Open facilities source for review</a>
                <label className="flex items-start gap-2">
                  <input className="mt-1" type="checkbox" checked={facilitiesChecked}
                    onChange={e=>setReviewedFacilitiesSource(previous => ({...previous, [evidenceKey]: e.target.checked ? facilitiesLink : ""}))}/>
                  I reviewed this facilities source and want to include it.
                </label>
              </> : null}
              <p className="text-xs text-slate-600">You can register the contact and leave facilities for hotel follow-up.</p>
            </details>
            <div className="flex flex-wrap items-center gap-3">
              {!registeredSupplierId ? <button type="button" disabled={crmSaving} onClick={()=>void saveApprovedLead()}
                className="rounded-lg bg-[#001F3F] px-3 py-2 font-semibold text-white disabled:opacity-50">
                {crmSaving ? "Registering..." : "Approve & register in Supplier CRM"}
              </button> : <>
                <button type="button" className="text-blue-700 underline" onClick={()=>window.location.reload()}>Refresh CRM hotel list</button>
                <Link href={`/admin/suppliers/${registeredSupplierId}`} className="text-blue-700 underline">Open registered hotel</Link>
              </>}
              <a href="#epoch-hotel-inquiry" className="text-blue-700 underline">Review inquiry draft</a>
            </div>
            {crmSaveState ? <p role="status">{crmSaveState}</p> : null}
            <p className="text-xs text-slate-600">Approval creates an inactive research candidate. No email is sent.</p>
          </section> : null}
          <OfficialHotelPageResearch key={evidenceKey} hotelName={selectedName}
            onContactRetrieved={!chosen ? extraction => setOfficialContacts(previous => ({...previous, [evidenceKey]: extraction})) : undefined} />
          {(() => { const profile=publishedProfile; return profile ? <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-slate-800 space-y-2">
            <p className="font-bold text-[#001F3F]">Published hotel information ({profile.reviewedOn ?? "18 Nov 2026"})</p>
            <p><strong>Published contact:</strong> {profile.email} ({profile.contactType})</p>
            <p><strong>Phone:</strong> {profile.phone}</p>
            <p><strong>Publicly advertised:</strong> {profile.publishedFacts.join("; ")}</p>
            <p className="text-amber-900"><strong>Confirm with hotel:</strong> {profile.openQuestions.join("; ")}</p>
            <div className="flex flex-wrap items-center gap-2"><a href={profile.source} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Contact evidence</a><a href={profile.facilitiesSource} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Facilities evidence</a>
              {!chosen ? <button type="button" onClick={()=>updateContact({email:profile.email,source:profile.source,phone:profile.phone})} className="rounded border border-blue-300 bg-white px-2 py-1 font-semibold">Use published contact in draft</button> : null}</div>
            <p className="text-slate-600">This research snapshot is not live monitoring, and the published address may be a general inbox. Check recipient and terms before approval. No message is sent or CRM record created.</p>
          </div>:<p className="text-xs text-amber-800">No reviewed public contact profile yet for this hotel. Research its official site before entering a contact.</p>; })()}
          <section className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs space-y-2" aria-label="Automated hotel evidence research">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#001F3F]">Automated public research</p>
              <button type="button" disabled={Boolean(evidenceLoading[evidenceKey])||!locationReady} onClick={()=>void researchSelectedHotel(selectedName,stay.city.trim(),country,evidenceKey)} className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{evidenceLoading[evidenceKey]?"Researching...":"Research hotel contact and facilities"}</button></div>
            <p className="text-slate-600">Searches public pages and groups source-linked indications. This does not automatically verify claims, update CRM, or confirm supplier terms.</p>
            {evidenceErrors[evidenceKey]?<p role="alert" className="text-amber-900">{evidenceErrors[evidenceKey]}</p>:null}
            {partialResearchByKey[evidenceKey] ? <p role="status">Some research sources were unavailable. You can retry the search.</p> : null}
            {supplierResearch ? <HotelSupplierResearchCard
              research={supplierResearch}
              massRoom={stay.massRoom}
              onUseContact={!chosen ? contact => updateContact({
                email:contact.email, source:contact.sourceUrl,
                ...(contact.phone ? {phone:contact.phone.number} : {})
              }) : undefined}
              onUseFacilities={!chosen ? updateFacilitiesSource : undefined}
            /> : null}
            {evidenceReport?<details className="space-y-2 rounded border p-2">
              <summary className="cursor-pointer font-semibold">Additional research sources</summary>
              <section className="rounded-lg border border-sky-200 bg-white p-3 space-y-2"
                aria-label="Possible official hotel websites">
                <p className="font-semibold text-[#001F3F]">
                  Possible official hotel websites
                </p>
                <p className="text-slate-600">
                  These websites are research candidates only.
                  Their identity and ownership have not been verified.
                  No webpage has been retrieved automatically.
                </p>
                {officialSiteCandidates.length ? (
                  <div className="space-y-2">
                    {officialSiteCandidates.map(item=>(
                      <div key={item.sourceUrl}
                        className="rounded border border-slate-200 p-2">
                        <p className="font-medium break-all">
                          {item.hostname}
                        </p>
                        <p className="text-slate-600">{item.reason}</p>
                        <a href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline break-all">
                          Review possible official website
                        </a>
                        <p className="text-amber-800">
                          Identity review required. Retrieval not authorized.
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-800">
                    No matching official-site candidate identified.
                    Continue manual verification.
                  </p>
                )}
              </section>

              <div className="rounded-lg border border-blue-200 bg-white p-3 space-y-3">
                <p className="font-semibold text-[#001F3F]">
                  Research findings — contact and room capacity
                </p>
                <p className="text-slate-600">
                  These are search-result indications, not verified hotel
                  contacts or confirmed room inventory. Inspect the original
                  source before using any information.
                </p>
                <div className="space-y-2">
                  <p className="font-semibold">Possible contact emails</p>
                  {structuredResearch?.contacts.length ? (
                    structuredResearch.contacts.map((item,index)=>(
                      <div key={`${item.email}:${item.sourceUrl}:${index}`}
                        className="rounded border p-2 space-y-1">
                        <p className="break-all font-medium">{item.email}</p>
                        <a href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline">
                          Inspect published source
                        </a>
                        <div>
                          <button type="button"
                            className="rounded border border-blue-300 px-2 py-1 font-semibold"
                            onClick={()=>updateContact({email:item.email,source:item.sourceUrl})}>
                            Use candidate in manual draft
                          </button>
                        </div>
                        <p className="text-amber-900">
                          Admin verification required before copying.
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-amber-800">
                      No contact email extracted. Check the official
                      hotel contact page manually.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Published room-count indications</p>
                  {structuredResearch?.capacities.length ? (
                    structuredResearch.capacities.map((item,index)=>(
                      <div key={`${item.totalRooms}:${item.sourceUrl}:${index}`}
                        className="rounded border p-2">
                        <p>
                          <strong>{item.totalRooms} rooms</strong>
                          {" — "}
                          {item.suitability==="preferred"
                            ? "Preferred size indication (120+)"
                            : item.suitability==="possible"
                            ? "Possible size indication (80-119)"
                            : item.suitability==="caution"
                            ? "Capacity caution (50-79)"
                            : "Below preferred minimum (under 50)"}
                        </p>
                        <a href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline">
                          Inspect room-count source
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-amber-800">
                      No room count extracted. Hotel capacity remains unknown.
                    </p>
                  )}
                  <p className="text-slate-600">
                    Room counts are unverified. A published hotel inventory
                    does not establish availability of {stay.rooms} rooms for our dates.
                  </p>
                </div>
              </div>
              <p className="font-semibold text-[#001F3F]">Concise public research · {new Date(evidenceReport.searchedAt).toLocaleString()}</p>
              <p className="text-slate-700">Recommendation: <strong>{researchShortlist.find(item=>item.name===selectedName)?.status==="recommend-inactive-crm"?"Consider INACTIVE CRM registration with Admin approval":chosen?"Already in CRM — review existing supplier":"Investigate further before CRM registration"}</strong>. Search excerpts are indications, not independently verified facts.</p>
              {evidenceReport.findings.length?<details className="rounded border bg-white p-2"><summary className="cursor-pointer font-semibold">View original research sources ({evidenceReport.findings.length} indications)</summary><div className="mt-2 space-y-2">{hotelEvidenceSummary(evidenceReport).map(group=><div key={group.topic} className="rounded border bg-white p-2"><p className="font-semibold capitalize">{group.topic} — {group.findings.length} cited source(s)</p>{group.findings.map((finding,i)=><div key={`${finding.sourceUrl}:${i}`} className="mt-1 text-xs"><p>{finding.excerpt?`Published excerpt (unverified): ${finding.excerpt}`:finding.statement}</p><a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Inspect: {finding.sourceTitle}</a></div>)}</div>)}</div></details>:<p className="text-amber-900">No property-matched evidence found. Do not infer suitability.</p>}
              <p className="text-xs text-slate-600">Outstanding supplier confirmations are listed in Group suitability below. They are not established by public search results.</p>
              <p className="text-amber-900">{evidenceReport.note}</p>
            </details>:null}
          </section>
          {suitability?<section className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-2" aria-label="Hotel suitability assessment">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#001F3F]">Group suitability — evidence gaps</p><span className="font-medium text-amber-900">{suitability.openCount} of {suitability.totalCount} checks still open</span></div>
            <p className="text-slate-600">This is a follow-up checklist, not a hotel score, ranking, approval or verified capacity estimate. Marked checklist items remain self-reported until their supporting sources are reviewed.</p>
            <div className="space-y-1">{suitability.items.map(item=><p key={item.id} className="flex gap-2"><span className={item.marked?"text-sky-700 font-medium":"text-amber-800 font-medium"}>{item.marked?"Marked":"Open"}</span><span>{item.label}{item.note?` — ${item.note}`:""}</span></p>)}</div>
            <p className="font-semibold text-[#001F3F]">Priority follow-up questions</p>
            <ol className="list-decimal pl-5 space-y-1">{suitability.questions.map(q=><li key={q}>{q}</li>)}</ol>
            <p className="text-amber-900">No allotment, rates, accessible-room inventory or private Mass space is confirmed by an online listing alone.</p>
          </section>:null}
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><strong>Preliminary capacity screen:</strong> {screenGroupCapacity(stay.rooms,leadEvidence(selectedName)?.totalRooms).message} {leadEvidence(selectedName)?.totalRooms ? `(${stay.rooms} rooms requested / ${leadEvidence(selectedName)?.totalRooms} published rooms)` : ""} <span className="block mt-1">Confirm the {stay.rooms}-room allotment with the hotel.</span></div>
          <div className="rounded-lg border p-3 text-xs space-y-2">
            <p className="font-semibold text-[#001F3F]">Public evidence review</p>
            <p className="text-slate-600">Only check items supported by a reviewed public source. These checks do not establish hotel availability.</p>
            {publicEvidenceChecklist.map(item=><label key={item} className="flex items-start gap-2"><input type="checkbox" checked={Boolean(checkStatus[reviewKey]?.[item])} onChange={e=>setCheckStatus(prev=>({...prev,[reviewKey]:{...(prev[reviewKey]||{}),[item]:e.target.checked}}))}/>{item}</label>)}
          </div>
          <div className="rounded-lg border p-3 text-xs space-y-2">
            <p className="font-semibold text-[#001F3F]">Requires direct hotel confirmation</p>
            <p className="text-slate-600">Mark confirmed only after receiving attributable hotel evidence. Ask the hotel to confirm the requested {stay.rooms} rooms for these dates.</p>
            {hotelConfirmationChecklist.filter(item=>!item.includes("Mass room")||stay.massRoom).map(item=><label key={item} className="flex items-start gap-2"><input type="checkbox" checked={Boolean(checkStatus[reviewKey]?.[item])} onChange={e=>setCheckStatus(prev=>({...prev,[reviewKey]:{...(prev[reviewKey]||{}),[item]:e.target.checked}}))}/>{item}</label>)}
          </div>
          <p className="text-xs text-slate-600">Unapproved research selections and diligence checks stay in this browser session only. No message is sent. Supplier confirmations require actual offer evidence.</p>
        </div></details>:null}

    </div></div>:!ferry ? <p className="text-sm text-slate-600">No hotel stays found. Add a stay to begin.</p> : null}
    <button type="button" onClick={addStay} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">+ Add hotel stay</button>
  </div>;
}
