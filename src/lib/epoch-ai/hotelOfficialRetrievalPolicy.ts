/**
 * Fixed, property-specific public research URL policy.
 *
 * This policy authorizes only a limited read-only research request.
 * It does NOT verify a supplier, approve a contact, register a hotel,
 * authorize an email, or grant permission to fetch arbitrary URLs.
 *
 * New properties require a separately reviewed policy change.
 */

export type AuthorizedHotelResearchPage = {
  hotelName: string;
  purpose: "contact" | "facilities";
  url: string;
  status: "research-retrieval-only";
};

const approvedPages: readonly AuthorizedHotelResearchPage[] = [
  {
    hotelName: "HUMA Kotor Bay Hotel and Villas",
    purpose: "contact",
    url: "https://www.humahotel.me/reservation-policy/",
    status: "research-retrieval-only"
  },
  {
    hotelName: "HUMA Kotor Bay Hotel and Villas",
    purpose: "facilities",
    url: "https://www.humahotel.me/accomodation/",
    status: "research-retrieval-only"
  }
];

function hotelKey(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !url.hostname ||
      url.hostname.endsWith(".")
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

/**
 * Return only explicitly listed public research pages.
 * Results remain unverified as supplier evidence.
 */
export function authorizedHotelResearchPages(
  hotelName: string
): AuthorizedHotelResearchPage[] {
  const key = hotelKey(hotelName);

  return approvedPages
    .filter(page => hotelKey(page.hotelName) === key)
    .map(page => ({ ...page }));
}

/**
 * Exact property + exact URL authorization.
 * Domain-name resemblance or search ranking never grants permission.
 */
export function authorizeHotelResearchUrl(
  hotelName: string,
  sourceUrl: string
): AuthorizedHotelResearchPage | null {
  const candidate = canonicalUrl(sourceUrl);
  if (!candidate) return null;

  const match = authorizedHotelResearchPages(hotelName).find(page =>
    canonicalUrl(page.url) === candidate
  );

  return match ? { ...match } : null;
}