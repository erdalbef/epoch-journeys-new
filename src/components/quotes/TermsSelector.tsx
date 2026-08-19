"use client";

type TermsPreset = {
  id: string;
  label: string;
  description: string;
  terms: string;
};

const TERMS_PRESETS: TermsPreset[] = [
  {
    id: "epoch-standard",
    label: "Epoch Standard Terms",
    description:
      "Recommended standard wording for pilgrimage group quotations.",
    terms: `IMPORTANT CONDITIONS & NOTES

This quotation is confidential and is intended solely for the travel agency, group organizer, parish, or other recipient named in the proposal.

All rates are based on the number of paying pilgrims, complimentary travelers, rooming arrangements, travel dates, and services stated in this quotation. Any material change in group size, rooming configuration, travel dates, itinerary, or requested services may require the rates to be recalculated.

All hotels, transportation, guides, restaurants, visits, Mass arrangements, and other services are subject to availability at the time of confirmation. No service is considered reserved until confirmed by Epoch Journeys and any required deposit or payment has been received.

Hotels named in the proposal are subject to final confirmation. Where necessary, Epoch Journeys may substitute a hotel with another property of similar category and standard in the same or a reasonably comparable location.

Standard hotel rooms are quoted unless another room category is specifically stated. Special requests, including connecting rooms, adjoining rooms, accessibility requirements, walk-in showers, early check-in, and late check-out, are subject to availability and may involve additional charges.

The order of sightseeing, visits, excursions, Masses, meals, transportation, or other services may be adjusted where required for operational reasons, local conditions, opening hours, religious services, traffic, weather, supplier requirements, or other circumstances, without materially reducing the overall content or quality of the program.

Daily Mass arrangements and church visits are subject to confirmation by the relevant church, shrine, diocese, religious community, or local authority. Mass times and locations may therefore be changed when necessary.

Rates include only the services expressly listed under "Rates Include". Any service not specifically listed as included should be considered excluded unless otherwise confirmed in writing.

Supplier payment and cancellation conditions may vary between hotels, transportation providers, cruise companies, airlines, ferries, restaurants, guides, venues, and other service providers. The applicable tour-specific payment and cancellation conditions will be based on the suppliers confirmed for the program and will be communicated in the Tour Proposal / Confirmation and related correspondence.

Certain supplier deposits, tickets, cabins, rooms, transportation services, or other arrangements may become non-refundable immediately upon confirmation, ticketing, allocation, or another supplier-defined milestone.

Passenger names, passport information, rooming lists, dietary information, accessibility requirements, and other operational details must be supplied by the deadlines communicated by Epoch Journeys. Late or incomplete information may result in additional costs, loss of reservations, or changes to confirmed services.

Prices are based on taxes, VAT, accommodation taxes, climate taxes, entrance fees, fuel costs, transportation charges, exchange rates, government levies, and supplier rates known at the time the quotation is issued. New or increased taxes, government fees, environmental charges, fuel surcharges, or mandatory supplier charges introduced after quotation may be added where applicable.

Airline, ferry, rail, cruise, and other transportation schedules are subject to change by the operating carrier. Epoch Journeys will make reasonable efforts to adjust the program where such changes occur.

The client and travelers are responsible for ensuring that passports, visas, entry requirements, health documents, and other travel documentation are valid and comply with the requirements of each destination.

Comprehensive travel insurance, including medical, trip cancellation, interruption, delay, and baggage coverage, is strongly recommended for all travelers.

Epoch Journeys shall not be responsible for delays, cancellations, additional expenses, missed services, or itinerary changes caused by circumstances outside its reasonable control, including but not limited to weather, strikes, transportation disruption, natural events, governmental action, border restrictions, civil disturbance, or other force majeure events.

Any expenses arising from circumstances beyond the control of Epoch Journeys that are not included in the confirmed program will be the responsibility of the traveler, group, or contracting client.

This quotation, its pricing, supplier information, and commercial terms are confidential and may not be reproduced, distributed, or disclosed to third parties without prior written consent from Epoch Journeys.`,
  },

  {
    id: "short",
    label: "Short Terms",
    description:
      "Condensed wording for straightforward quotations.",
    terms: `IMPORTANT CONDITIONS & NOTES

Rates are based on the group size, travel dates, rooming arrangements, and services stated in this quotation. Changes to these details may result in a price adjustment.

All services are subject to availability and are not considered confirmed until accepted in writing and any required deposit has been received.

Hotels may be replaced with properties of similar category where necessary.

The order of the itinerary, sightseeing, Masses, transportation, meals, or other services may be adjusted for operational reasons while maintaining the overall content of the program.

Mass arrangements and church visits are subject to confirmation by the relevant religious authorities.

Supplier payment and cancellation policies vary. Tour-specific conditions will be based on the suppliers confirmed for the program.

Passenger names, passport details, rooming lists, and other operational information must be provided by the deadlines communicated by Epoch Journeys.

New or increased government taxes, mandatory local fees, fuel surcharges, or supplier charges introduced after quotation may be added where applicable.

Travel documents and comprehensive travel insurance are the responsibility of the traveler.

This quotation is confidential and intended only for the named recipient.`,
  },

  {
    id: "extended",
    label: "Extended Terms",
    description:
      "More detailed wording for complex tours, cruises, or supplier-sensitive programs.",
    terms: `IMPORTANT CONDITIONS & NOTES

This quotation is confidential and intended solely for the travel agency, parish, organization, group leader, or contracting party named in the proposal.

All rates are calculated according to the stated number of paying pilgrims and complimentary travelers, travel dates, itinerary, rooming configuration, transportation requirements, and supplier rates available when the quotation is prepared.

Any reduction or increase in the number of paying participants, change in complimentary places, room occupancy, itinerary, travel dates, transportation requirements, or included services may require a complete recalculation of the quotation.

No hotel room, vehicle, guide, restaurant, cruise cabin, airline seat, ferry reservation, church service, Mass, venue, or other travel service is considered confirmed until accepted by the relevant supplier and any required deposit or guarantee has been received.

Hotels and other suppliers listed in the proposal are based on current availability and may be substituted where necessary with alternatives of similar category and standard.

Special room requests and accessibility requirements are always subject to supplier confirmation and cannot be guaranteed unless specifically confirmed in writing.

The sequence of the itinerary may be modified in response to opening hours, religious celebrations, liturgical schedules, transportation changes, traffic, weather, local events, security considerations, or supplier requirements.

Masses, church visits, shrine visits, and meetings with religious communities are subject to approval and scheduling by the relevant church, shrine, diocese, clergy, religious community, or local authority.

Supplier policies are not uniform. Hotels, cruise lines, airlines, transportation companies, ferries, restaurants, guides, and other suppliers may each have different deposit, release, reduction, cancellation, name-change, ticketing, and final-payment conditions.

Accordingly, the earliest applicable supplier deadline or restriction may determine when part of the tour becomes non-refundable. Tour-specific payment and cancellation conditions will be communicated in the Tour Proposal / Confirmation and may be updated when additional services are confirmed.

Certain services may become non-refundable immediately upon confirmation, ticketing, cabin allocation, room commitment, passenger-name submission, rooming-list submission, or another supplier-defined event.

The contracting client is responsible for providing passenger names, passport details, rooming lists, dietary requirements, accessibility information, flight details, and other operational information accurately and by the deadlines communicated by Epoch Journeys.

Failure to meet operational deadlines may result in loss of space, supplier penalties, additional charges, inability to provide requested services, or cancellation of affected arrangements.

Rates are based on currently applicable supplier tariffs, foreign exchange rates, transportation costs, entrance fees, VAT, accommodation taxes, climate taxes, local government charges, and other mandatory fees.

Any new or increased tax, environmental charge, visitor fee, fuel surcharge, government levy, or mandatory supplier charge introduced after the quotation date may be added to the final tour cost.

Airline, cruise, ferry, rail, and other transport schedules and conditions are controlled by the relevant operator and may change without notice. Epoch Journeys will make reasonable efforts to reorganize affected arrangements where necessary.

Travelers are responsible for valid passports, visas, entry permits, vaccinations or health documentation where required, and compliance with all immigration and destination regulations.

Comprehensive travel insurance is strongly recommended, including trip cancellation, interruption, medical treatment, emergency assistance, travel delay, baggage, and supplier-default coverage where available.

Epoch Journeys shall not be liable for delays, cancellations, losses, additional expenses, missed services, or itinerary modifications resulting from events outside its reasonable control, including but not limited to strikes, adverse weather, natural disasters, transportation disruption, governmental action, border restrictions, political events, public-health measures, or other force majeure circumstances.

Unused or voluntarily declined services are non-refundable unless otherwise expressly agreed in writing.

This quotation and all related pricing, commercial terms, supplier information, and operational arrangements are proprietary and confidential and may not be reproduced, disclosed, or distributed without the prior written consent of Epoch Journeys.`,
  },
];

export default function TermsSelector({
  onSelect,
}: {
  onSelect: (terms: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-[#001F3F]">
          Important Conditions & Terms
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Select a standard terms package, then edit the
          generated wording below if this particular group
          requires additional or tour-specific conditions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {TERMS_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.terms)}
            className="rounded-lg border bg-white p-4 text-left transition hover:border-[#8B0000] hover:shadow-sm"
          >
            <div className="font-semibold text-[#001F3F]">
              {preset.label}
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-500">
              {preset.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}