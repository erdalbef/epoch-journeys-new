"use client";

import { useState } from "react";
import { manualHotelOfferStay } from "@/lib/epoch-ai/receivedHotelOffer";
import { contactEmail, hotelInquirySubject, searchCrmHotels, type HotelContact, type Stay } from "@/lib/epoch-ai/hotelProcurement";
import HotelReceivedOffers from "./HotelReceivedOffers";

export default function RecordManualHotelOffer({ tourId, stay, hotels }: {
  tourId: string;
  stay: Stay;
  hotels: HotelContact[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const local = searchCrmHotels(hotels, stay.city, "");
  const localIds = new Set(local.map(hotel => hotel.id));
  const other = hotels.filter(hotel => !localIds.has(hotel.id));
  const dates = manualHotelOfferStay.safeParse([stay.city, stay.checkIn, stay.checkOut]);
  const stayKey = dates.success ? JSON.stringify(dates.data) : "";
  const selectedHotel = hotels.find(hotel => hotel.id === supplierId);

  return <section className="space-y-3 rounded-xl border border-blue-300 bg-white p-5">
    <h2 className="text-lg font-bold text-[#001F3F]">Record hotel offer</h2>
    <p className="text-sm text-slate-700">For requests sent outside Epoch Journeys. Select the hotel and paste the reply or upload its attachment.</p>
    {dates.success ? <>
      <p className="text-sm font-medium">{stay.city} · {stay.checkIn} to {stay.checkOut}</p>
      <label className="block text-sm font-medium">
        Hotel in Supplier CRM
        <select className="mt-1 block w-full max-w-md rounded border bg-white p-2"
          value={supplierId} onChange={event => setSupplierId(event.target.value)}>
          <option value="">Select the hotel that replied</option>
          {local.length > 0 && <optgroup label={stay.city}>
            {local.map(hotel => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
          </optgroup>}
          {other.length > 0 && <optgroup label="Other CRM hotels">
            {other.map(hotel => <option key={hotel.id} value={hotel.id}>{hotel.name}{hotel.city ? ` · ${hotel.city}` : ""}</option>)}
          </optgroup>}
        </select>
      </label>
      {selectedHotel ? <HotelReceivedOffers key={`${supplierId}:${stayKey}`} manual={{ tourId, supplierId, stayKey }} expanded
        suggestedSender={contactEmail(selectedHotel)} suggestedSubject={hotelInquirySubject(stay)} />
        : <p className="text-sm text-slate-600">If the hotel is missing, register it under Discover additional hotels below.</p>}
    </> : <p className="text-sm text-slate-700">Enter the hotel city and check-in and check-out dates in Stay details below.</p>}
  </section>;
}
