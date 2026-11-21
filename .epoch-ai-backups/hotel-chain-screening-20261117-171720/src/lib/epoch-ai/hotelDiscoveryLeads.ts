/** Research leads for the May 2027 Balkans hotel procurement pilot.
 * Names are starting points for independent verification, NOT approved suppliers.
 * This data contains no fabricated ratings, prices, email addresses, availability or facilities.
 * Later destination discovery should be supplied by a live, sourced research service.
 */
export type HotelLead = { name: string; city: string; sourceStatus: "research-lead" };
export const HOTEL_RESEARCH_LEADS: Record<string, HotelLead[]> = {
  "Sarajevo": [
    {
      "name": "Hotel Colors Inn",
      "city": "Sarajevo",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hotel Central Sarajevo",
      "city": "Sarajevo",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hotel Festival",
      "city": "Sarajevo",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Movenpick Hotel Sarajevo",
      "city": "Sarajevo",
      "sourceStatus": "research-lead"
    }
  ],
  "Kotor Bay": [
    {
      "name": "Hotel Vardar",
      "city": "Kotor Bay",
      "sourceStatus": "research-lead"
    },
    {
      "name": "HUMA Kotor Bay Hotel and Villas",
      "city": "Kotor Bay",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hyatt Regency Kotor Bay Resort",
      "city": "Kotor Bay",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hotel Forza Mare",
      "city": "Kotor Bay",
      "sourceStatus": "research-lead"
    }
  ],
  "Tirana": [
    {
      "name": "Hotel Colosseo Tirana",
      "city": "Tirana",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Rogner Hotel Tirana",
      "city": "Tirana",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Sky Hotel Tirana",
      "city": "Tirana",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Metro Hotel Tirana",
      "city": "Tirana",
      "sourceStatus": "research-lead"
    }
  ],
  "Ohrid": [
    {
      "name": "Hotel Belvedere Ohrid",
      "city": "Ohrid",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Unique Resort & Spa",
      "city": "Ohrid",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hotel Tino Sveti Stefan",
      "city": "Ohrid",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hotel Granit Ohrid",
      "city": "Ohrid",
      "sourceStatus": "research-lead"
    }
  ],
  "Pristina": [
    {
      "name": "Hotel Sirius",
      "city": "Pristina",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Mercure Prishtina City",
      "city": "Pristina",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Courtyard by Marriott Prishtina",
      "city": "Pristina",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Swiss Diamond Hotel Prishtina",
      "city": "Pristina",
      "sourceStatus": "research-lead"
    }
  ],
  "Skopje": [
    {
      "name": "Hotel City Park",
      "city": "Skopje",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hotel Panoramika Design & Spa",
      "city": "Skopje",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Skopje Marriott Hotel",
      "city": "Skopje",
      "sourceStatus": "research-lead"
    },
    {
      "name": "DoubleTree by Hilton Skopje",
      "city": "Skopje",
      "sourceStatus": "research-lead"
    }
  ],
  "Belgrade": [
    {
      "name": "Crystal Hotel Belgrade",
      "city": "Belgrade",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Hotel Moskva",
      "city": "Belgrade",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Mama Shelter Belgrade",
      "city": "Belgrade",
      "sourceStatus": "research-lead"
    },
    {
      "name": "Falkensteiner Hotel Belgrade",
      "city": "Belgrade",
      "sourceStatus": "research-lead"
    }
  ]
};
export function leadsForCity(city: string): HotelLead[] {
  const k = city.trim().toLowerCase();
  if (k.includes("kotor") || k.includes("dobrota") || k.includes("perast")) return HOTEL_RESEARCH_LEADS["Kotor Bay"];
  const key = Object.keys(HOTEL_RESEARCH_LEADS).find(x => x.toLowerCase() === k);
  return key ? HOTEL_RESEARCH_LEADS[key] : [];
}
export function hotelResearchSearchUrl(city: string, name: string) {
  return "https://www.google.com/search?q="+encodeURIComponent(`${name} ${city} hotel official website reservations contact`);
}
export function compareLeadToCrm(name: string, supplierNames: string[]) {
  const normalize = (x: string) => x.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  return supplierNames.some(x => normalize(x) === normalize(name));
}
