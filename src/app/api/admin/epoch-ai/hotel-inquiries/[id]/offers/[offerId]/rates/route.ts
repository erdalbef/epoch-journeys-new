import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma, RoomType } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { HOTEL_OFFER_RATE_IMPORT_EVENT, hotelOfferRateApproval, hotelOfferStay, OFFER_RATE_SOURCE } from "@/lib/epoch-ai/hotelOfferRateDraft";
import { hotelOfferTerms, manualHotelOfferScope, manualHotelOfferStay } from "@/lib/epoch-ai/receivedHotelOffer";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { isRequestWithinLimit } from "@/lib/security/requestBodyLimit";

const reply = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {"Cache-Control": "no-store"}});

export async function POST(request: Request, {params}: {params: Promise<{id: string; offerId: string}>}) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({error: "Same-origin request required."}, 403);
  const actorId = (await getServerSession(authOptions))?.user?.id;
  if (!actorId) return reply({error: "Admin identity required."}, 403);
  if (!(await isRequestWithinLimit(request, 8192))) return reply({error: "Rate approval is too large."}, 413);

  const parsed = hotelOfferRateApproval.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({error: "Confirm the supplier's terms and enter valid Single and Double/Twin prices, currency, meal basis, VAT and billing units."}, 400);
  }
  const rates = parsed.data;
  const {id, offerId} = await params;
  const scope = id === "manual" ? manualHotelOfferScope(request.url) : {hotelInquiryId: id};
  if (!scope) return reply({error: "Select the hotel and enter valid stay dates."}, 400);

  try {
    return await db.$transaction(async tx => {
      // Offer recording uses the same scope lock, so a new version cannot overtake approval.
      if ("manualHotelTourId" in scope) {
        await tx.$queryRaw`SELECT "id" FROM "Tour" WHERE "id" = ${scope.manualHotelTourId} FOR UPDATE`;
      } else {
        await tx.$queryRaw`SELECT "id" FROM "HotelInquiry" WHERE "id" = ${id} FOR UPDATE`;
      }
      const offer = await tx.supplierCommercialEvidence.findFirst({
        where: {id: offerId, ...scope},
        select: {
          id: true, supplierId: true, reviewedTerms: true, reviewStatus: true, version: true, acceptanceStatus: true,
          hotelInquiry: {select: {supplierId: true, destination: true, checkIn: true, checkOut: true}},
        },
      });
      if (!offer) return reply({error: "Offer not found for this hotel stay."}, 404);
      const existing = await tx.supplierCommercialEvidenceEvent.findFirst({
        where: {evidenceId: offer.id, eventType: HOTEL_OFFER_RATE_IMPORT_EVENT}, select: {id: true},
      });
      if (existing) return reply({alreadySaved: true});

      const terms = hotelOfferTerms.safeParse(offer.reviewedTerms);
      if (offer.reviewStatus !== "TERMS_VERIFIED" || !terms.success ||
          offer.acceptanceStatus === "REJECTED" || offer.acceptanceStatus === "SUPERSEDED") {
        return reply({error: "Use a reviewed, current offer to approve rates."}, 409);
      }
      if (terms.data.cityTax && !rates.cityTaxIncluded && !rates.cityTax.amount) {
        return reply({error: "Confirm the city tax amount and billing unit, or confirm it is included or there is no charge."}, 400);
      }
      const newer = await tx.supplierCommercialEvidence.findFirst({
        where: {...scope, version: {gt: offer.version}}, select: {id: true},
      });
      if (newer) return reply({error: "A newer offer is on file. Review that version before approving rates."}, 409);

      const manual = "manualHotelStayKey" in scope ? manualHotelOfferStay.parse(JSON.parse(scope.manualHotelStayKey!)) : null;
      const inquiry = offer.hotelInquiry;
      const stay = manual ? hotelOfferStay(...manual) : inquiry && inquiry.supplierId === offer.supplierId
        ? hotelOfferStay(inquiry.destination, inquiry.checkIn, inquiry.checkOut) : null;
      if (!stay) return reply({error: "The offer is missing a valid hotel stay."}, 409);

      await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id" = ${offer.supplierId} FOR UPDATE`;
      const supplier = await tx.supplier.findUnique({
        where: {id: offer.supplierId}, select: {id: true, name: true, type: true, status: true, country: true},
      });
      if (!supplier || supplier.type !== "HOTEL") return reply({error: "Hotel supplier not found."}, 404);
      const activate = supplier.status === "INACTIVE" && rates.activateSupplier;
      if (!activate && supplier.status !== "ACTIVE") {
        return reply({error: supplier.status === "INACTIVE"
          ? "This hotel is inactive. Select supplier activation to make the approved rates available in Quote Form."
          : "This supplier cannot be activated through an offer."}, 409);
      }

      const confirmedOn = new Date();
      const validFrom = new Date(stay.checkIn + "T00:00:00Z");
      const validTo = new Date(stay.checkOut + "T00:00:00Z");
      const services = await tx.supplierService.findMany({
        where: {supplierId: supplier.id, type: "ACCOMMODATION", isActive: true, city: {equals: stay.city, mode: "insensitive"},
          ...(supplier.country ? {country: {equals: supplier.country, mode: "insensitive"}} : {})},
        orderBy: {createdAt: "asc"}, take: 2, select: {id: true},
      });
      if (services.length > 1) return reply({error: "More than one active accommodation service matches this stay. Keep one matching service before importing."}, 409);
      const service = services[0] ?? await tx.supplierService.create({
        data: {supplierId: supplier.id, name: "Group accommodation", type: "ACCOMMODATION",
          city: stay.city, country: supplier.country},
        select: {id: true},
      });
      const shared: Omit<Prisma.SupplierRateUncheckedCreateInput, "name" | "amount"> = {
        supplierId: supplier.id, serviceId: service.id, validFrom, validTo,
        currency: rates.currency, unit: rates.unit, mealBasis: rates.mealBasis, taxIncluded: rates.taxIncluded,
        breakfastIncluded: true, dinnerIncluded: rates.mealBasis === "HB",
        dinnerAmount: rates.halfBoard.amount || null, dinnerUnit: rates.halfBoard.unit || null, dinnerNotes: terms.data.halfBoard || null,
        cityTaxIncluded: rates.cityTaxIncluded, cityTaxAmount: rates.cityTax.amount || null, cityTaxUnit: rates.cityTax.unit || null,
        cityTaxCurrency: rates.cityTax.amount ? rates.currency : null,
        beveragePackageAmount: rates.beverages.amount || null, beveragePackageUnit: rates.beverages.unit || null,
        beverageNotes: terms.data.beverages || null,
        porterageAmount: rates.porterage.amount || null, porterageUnit: rates.porterage.unit || null,
        porterageAvailable: rates.porterage.amount ? true : null,
        extraBedRate: rates.extraBed || null,
        rateSource: OFFER_RATE_SOURCE, supplierReference: offer.id, lastVerifiedAt: confirmedOn,
        notes: ["Rates apply to the approved stay only.", terms.data.other, terms.data.cityTax, terms.data.porterage,
          rates.extraBed ? `Extra-bed supplement: ${rates.currency} ${rates.extraBed} per night (separate from the Triple room rate).` : ""].filter(Boolean).join("\n"),
      };
      const rooms: [RoomType, string, string][] = [
        ["DOUBLE_TWIN", "Double/Twin", rates.doubleTwin], ["SINGLE", "Single", rates.single],
        ["TRIPLE", "Triple", rates.triple],
      ];
      const earlierOffers = await tx.supplierCommercialEvidence.findMany({
        where: {...scope, supplierId: supplier.id, version: {lt: offer.version}}, select: {id: true},
      });
      if (earlierOffers.length) await tx.supplierRate.updateMany({
        where: {supplierId: supplier.id, rateSource: OFFER_RATE_SOURCE, supplierReference: {in: earlierOffers.map(item => item.id)}},
        data: {isActive: false},
      });
      await tx.supplierRate.createMany({data: rooms.filter(([, , amount]) => amount).map(([roomType, label, amount]) => ({
        ...shared, roomType, amount, name: `Offer ${offer.version} · ${stay.checkIn} · ${label}`,
      }))});
      if (activate) await tx.supplier.update({where: {id: supplier.id}, data: {status: "ACTIVE"}});
      await tx.supplierCommercialEvidenceEvent.create({data: {
        evidenceId: offer.id, actorId, eventType: HOTEL_OFFER_RATE_IMPORT_EVENT,
        detail: JSON.stringify({stay, serviceId: service.id, ...rates}),
      }});
      return reply({saved: true, supplierId: supplier.id}, 201);
    });
  } catch (error) {
    console.error("HOTEL_OFFER_RATES_SAVE_FAILED", error instanceof Error ? error.name : "Unknown");
    return reply({error: "The rates could not be saved. Check the supplier record before retrying."}, 503);
  }
}
