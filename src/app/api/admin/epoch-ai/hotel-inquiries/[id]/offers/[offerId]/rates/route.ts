import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma, RoomType } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { canSaveHotelRoomRates, HOTEL_OFFER_RATE_DRAFT_EVENT, HOTEL_OFFER_RATE_IMPORT_EVENT, hotelOfferRateApproval, hotelOfferRateWarnings, hotelOfferPriceQualifier, OFFER_RATE_SOURCE, offerChargeFields } from "@/lib/epoch-ai/hotelOfferRateDraft";
import { currentHotelOfferBlock, hotelOfferSourceReference, hotelOfferStaySelect, loadHotelOfferWorkflow, recordedHotelOfferStay, verifiedHotelOfferTerms } from "@/lib/epoch-ai/hotelOfferWorkflow";
import { manualHotelOfferScope } from "@/lib/epoch-ai/receivedHotelOffer";
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
    return reply({error: "Check the supplied rate values and confirm that you reviewed the offer."}, 400);
  }
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
          sourceSubject: true, sourceDate: true, sourceDocument: {select: {originalFileName: true}},
          ...hotelOfferStaySelect,
        },
      });
      if (!offer) return reply({error: "Offer not found for this hotel stay."}, 404);
      const existing = await tx.supplierCommercialEvidenceEvent.findFirst({
        where: {evidenceId: offer.id, eventType: HOTEL_OFFER_RATE_IMPORT_EVENT}, select: {id: true},
      });
      if (existing) return reply({alreadySaved: true, supplierId: offer.supplierId});

      const rates = {...parsed.data, supplierConfirmation: parsed.data.supplierConfirmation || hotelOfferSourceReference(offer)};
      const terms = verifiedHotelOfferTerms(offer);
      if (!terms) {
        return reply({error: "Use a reviewed, current offer to approve rates."}, 409);
      }
      const stay = recordedHotelOfferStay(offer);
      if (!stay) return reply({error: "The offer is missing a valid hotel stay."}, 409);
      await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id" = ${offer.supplierId} FOR UPDATE`;
      const workflow = await loadHotelOfferWorkflow(tx, stay, offer.supplierId);
      const blocked = currentHotelOfferBlock(offer.id, workflow.currentBySupplier.get(offer.supplierId));
      if (blocked) return reply({error: blocked}, 409);
      const supplier = await tx.supplier.findUnique({
        where: {id: offer.supplierId}, select: {id: true, name: true, type: true, status: true, country: true},
      });
      if (!supplier || supplier.type !== "HOTEL") return reply({error: "Hotel supplier not found."}, 404);
      const activate = supplier.status === "INACTIVE" && rates.activateSupplier;
      if (supplier.status !== "ACTIVE" && supplier.status !== "INACTIVE") {
        return reply({error: "Rates cannot be imported for this supplier status."}, 409);
      }
      const warnings = hotelOfferRateWarnings(rates, terms);
      if (!canSaveHotelRoomRates(rates)) {
        await tx.supplierCommercialEvidenceEvent.create({data: {
          evidenceId: offer.id, actorId, eventType: HOTEL_OFFER_RATE_DRAFT_EVENT,
          detail: JSON.stringify({stay, rates, warnings}),
        }});
        return reply({savedDraft: true, supplierId: supplier.id, warnings}, 201);
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
      const approvedCharge = (key: keyof typeof offerChargeFields) => {
        const {amount, unit} = rates[key];
        return (amount && unit && (rates.confirmIndicativeCharges || !hotelOfferPriceQualifier(terms[key])))
          ? {amount, unit} : null;
      };
      const dinner = approvedCharge("halfBoard");
      const tax = approvedCharge("cityTax");
      const beverages = approvedCharge("beverages");
      const porterage = approvedCharge("porterage");
      const vatIncluded = rates.taxIncluded === true || rates.taxIncluded === "yes";
      const shared: Omit<Prisma.SupplierRateUncheckedCreateInput, "name" | "amount"> = {
        supplierId: supplier.id, serviceId: service.id, validFrom, validTo,
        currency: rates.currency, unit: rates.unit, mealBasis: rates.mealBasis || null, taxIncluded: vatIncluded,
        taxNotes: rates.taxIncluded === "" ? "VAT treatment unspecified in the offer." : null,
        breakfastIncluded: rates.mealBasis ? true : null, dinnerIncluded: rates.mealBasis ? rates.mealBasis === "HB" : null,
        dinnerAmount: dinner?.amount ?? null, dinnerUnit: dinner?.unit ?? null, dinnerNotes: terms.halfBoard || null,
        cityTaxIncluded: rates.cityTaxIncluded, cityTaxAmount: tax?.amount ?? null, cityTaxUnit: tax?.unit ?? null,
        cityTaxCurrency: tax ? rates.currency : null,
        beveragePackageAmount: beverages?.amount ?? null, beveragePackageUnit: beverages?.unit ?? null,
        beveragePackageDescription: terms.beverages || null, beverageNotes: terms.beverages || null,
        porterageAmount: porterage?.amount ?? null, porterageUnit: porterage?.unit ?? null,
        porterageAvailable: /\b(?:not available|not offered|no porterage)\b/i.test(terms.porterage) ? false : porterage ? true : null,
        extraBedRate: rates.extraBed || null,
        cancellationTerms: terms.cancellation || null,
        paymentTerms: terms.payment || null,
        rateRestrictions: terms.availability || null,
        rateSource: OFFER_RATE_SOURCE, supplierReference: offer.id, lastVerifiedAt: confirmedOn,
        notes: ["Rates apply to the approved stay only.", terms.validity ? `Offer validity: ${terms.validity}` : "",
          terms.other, terms.cityTax, terms.porterage, ...warnings,
          rates.extraBed ? `Extra-bed supplement: ${rates.currency} ${rates.extraBed} per night (separate from the Triple room rate).` : ""].filter(Boolean).join("\n"),
      };
      const rooms: [RoomType, string, string][] = [
        ["DOUBLE_TWIN", "Double/Twin", rates.doubleTwin], ["SINGLE", "Single", rates.single],
        ["TRIPLE", "Triple", rates.triple],
      ];
      const priorOfferIds = workflow.offers.filter(item => item.id !== offer.id).map(item => item.id);
      if (priorOfferIds.length) await tx.supplierRate.updateMany({
        where: {supplierId: supplier.id, rateSource: OFFER_RATE_SOURCE, supplierReference: {in: priorOfferIds}},
        data: {isActive: false},
      });
      await tx.supplierRate.createMany({data: rooms.filter(([, , amount]) => amount).map(([roomType, label, amount]) => ({
        ...shared, roomType, amount, name: `Offer ${offer.version} · ${stay.checkIn} · ${label}`,
      }))});
      if (activate) await tx.supplier.update({where: {id: supplier.id}, data: {status: "ACTIVE"}});
      await tx.supplierCommercialEvidenceEvent.create({data: {
        evidenceId: offer.id, actorId, eventType: HOTEL_OFFER_RATE_IMPORT_EVENT,
        detail: JSON.stringify({stay, serviceId: service.id, rates, warnings}),
      }});
      return reply({saved: true, supplierId: supplier.id, supplierActive: activate || supplier.status === "ACTIVE", warnings}, 201);
    });
  } catch (error) {
    console.error("HOTEL_OFFER_RATES_SAVE_FAILED", error instanceof Error ? error.name : "Unknown");
    return reply({error: "The rates could not be saved. Check the supplier record before retrying."}, 503);
  }
}
