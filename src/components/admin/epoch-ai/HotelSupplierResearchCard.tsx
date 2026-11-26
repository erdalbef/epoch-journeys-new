import type { HotelSupplierResearch } from "@/lib/epoch-ai/hotelSupplierResearch";

type Props = {
  research: HotelSupplierResearch;
  massRoom: boolean;
  onUseContact?: (contact: HotelSupplierResearch["contacts"][number]) => void;
  onUseFacilities?: (sourceUrl: string) => void;
};

const contactLabels = {
  groups: "Groups or events",
  sales: "Hotel sales",
  reservations: "Reservations",
  general: "General contact"
};

export default function HotelSupplierResearchCard({research, massRoom, onUseContact, onUseFacilities}: Props) {
  return <section className="rounded-lg border border-blue-200 bg-white p-3 space-y-3" aria-label="Hotel contact and facilities">
    <h4 className="font-semibold text-[#001F3F]">Published hotel contact and facilities</h4>
    <p className="text-slate-600">Review the property and source before using these search excerpts.</p>
    {research.contacts.length > 1 && research.contacts[0].corroboratingSourceUrl
      ? <p className="text-amber-900">Review the sources and choose which email to use in the draft.</p> : null}
    {research.contacts.length ? <ul className="space-y-2">
      {research.contacts.map(contact => <li key={contact.email} className="rounded border p-2">
        <p><strong className="break-all">{contact.email}</strong> · {contactLabels[contact.category]}</p>
        {contact.phone ? <p>{contact.phone.number}</p> : null}
        <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Contact source</a>
        {contact.corroboratingSourceUrl ? <p className="mt-1 text-amber-900">
          Public listings agree on this email. <a href={contact.corroboratingSourceUrl} target="_blank"
            rel="noopener noreferrer" className="text-blue-700 underline">Review second source</a>
        </p> : null}
        {onUseContact ? <button type="button" className="ml-2 rounded border px-2 py-1"
          onClick={() => onUseContact(contact)}>Use contact in draft</button> : null}
      </li>)}
    </ul> : <p>This search did not find a property email. Any contact already shown in the registration form is still available for review.</p>}
    {research.phone && !research.contacts.some(contact => contact.phone?.number === research.phone?.number) ? <p>
      <strong>Hotel telephone</strong> {research.phone.number} · <a href={research.phone.sourceUrl} target="_blank"
        rel="noopener noreferrer" className="text-blue-700 underline">Phone source</a>
    </p> : null}
    <ul className="divide-y">
      {research.facilities.filter(item => item.id !== "mass" || massRoom).map(({id,label,evidence}) => <li key={id} className="py-2">
        <p><strong>{label}</strong> · {evidence ? "Published mention" : "Ask the hotel"}</p>
        {evidence ? <>
          <p className="text-slate-600">{evidence.excerpt}</p>
          <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Facilities source</a>
          {onUseFacilities ? <button type="button" className="ml-2 rounded border px-2 py-1"
            onClick={() => onUseFacilities(evidence.sourceUrl)}>Use source for CRM review</button> : null}
        </> : null}
        {id === "mass" && evidence ? <p>Confirm the private room, timing and cost for Mass with the hotel.</p> : null}
      </li>)}
    </ul>
  </section>;
}
