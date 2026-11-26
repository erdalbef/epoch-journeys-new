import type { PublicHotelVerification } from "./hotelPublicVerification";
import type { HotelSupplierResearch } from "./hotelSupplierResearch";
import type { OfficialPageExtraction } from "./hotelOfficialPageExtraction";
import { safePublicUrl } from "./hotelWebResearch";

export type HotelResearchContactFields = { email: string; source: string; phone: string };

export function hotelResearchForm(
  research: HotelSupplierResearch | undefined,
  profile: PublicHotelVerification | undefined,
  contactEdits: Partial<HotelResearchContactFields> | undefined,
  facilitiesEdit: string | undefined,
  retrievedContact?: OfficialPageExtraction
) {
  const officialContact = retrievedContact?.contacts.find(contact =>
    contact.sourceUrl === retrievedContact.sourceUrl &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && safePublicUrl(contact.sourceUrl)
  );
  const searchContacts = research?.contacts.filter(contact =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && safePublicUrl(contact.sourceUrl)
  ) ?? [];
  const [firstContact] = searchContacts;
  const searchContact = searchContacts.length > 1 && firstContact.corroboratingSourceUrl ? undefined : firstContact;
  const suggestedContact = officialContact ?? searchContact;
  const preferProfile = (!officialContact && Boolean(searchContact?.corroboratingSourceUrl) && Boolean(profile)) ||
    (profile?.contactType === "groups" && suggestedContact?.category !== "groups");
  const email = contactEdits?.email ?? (preferProfile ? profile?.email : suggestedContact?.email) ?? profile?.email ?? "";
  const source = contactEdits?.source ?? (preferProfile ? profile?.source : suggestedContact?.sourceUrl) ?? profile?.source ?? "";
  const phone = contactEdits?.phone ?? (preferProfile ? profile?.phone : undefined) ??
    retrievedContact?.phones[0] ?? searchContact?.phone?.number ??
    research?.phone?.number ?? profile?.phone ?? "";
  const facilities = facilitiesEdit ?? (safePublicUrl(research?.suggestedFacilitiesSource) || profile?.facilitiesSource || "");
  const contactLink = safePublicUrl(source.trim());
  const facilitiesLink = safePublicUrl(facilities.trim());
  const contactReviewKey = contactLink && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? JSON.stringify([email.trim(), contactLink])
    : "";

  return {email, source, phone, facilities, contactLink, facilitiesLink, contactReviewKey};
}
