import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma, Role, SupplierType } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hotelCrmContactName, hotelCrmNotes, parseHotelCrmEntries, type HotelCrmEntry } from "@/lib/epoch-ai/hotelCrmProfile";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({error: "Same-origin request required."}, {status: 403});
  }
  const {user} = (await getServerSession(authOptions)) ?? {};
  if (user?.role !== Role.ADMIN) return NextResponse.json({error: "Admin access required."}, {status: 403});

  let entries: HotelCrmEntry[];
  try {
    const body = await request.json();
    if (body?.approved !== true) throw new Error("Review and approve the selected CRM details.");
    entries = parseHotelCrmEntries(body.entries);
    if (!entries.length) throw new Error("Select at least one CRM detail.");
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : "Invalid CRM details."}, {status: 400});
  }

  const {id} = await params;
  try {
    const saved = await db.$transaction(async tx => {
      const supplier = await tx.supplier.findFirst({
        where: {id, type: SupplierType.HOTEL},
        select: {
          email: true, phone: true, website: true, address: true, postalCode: true,
          notes: true, contacts: {select: {email: true}},
        },
      });
      if (!supplier) return null;

      const fields: {email?: string; phone?: string; website?: string; address?: string; postalCode?: string} = {};
      const existingEmails = new Set(supplier.contacts.map(contact => contact.email?.trim().toLowerCase()));
      const contacts = [];
      const applied: HotelCrmEntry[] = [];
      for (const entry of entries) {
        const {kind, value, sourceUrl} = entry;
        if (kind === "contact") {
          const email = value.toLowerCase();
          if (existingEmails.has(email)) continue;
          existingEmails.add(email);
          contacts.push({supplierId: id, firstName: hotelCrmContactName(email), email, notes: `Public source: ${sourceUrl}`});
        } else if (kind === "fact") {
          if (supplier.notes?.split("\n").includes(`Public research note: ${value} | Public source: ${sourceUrl}`)) continue;
        } else {
          if (supplier[kind]?.trim()) continue;
          fields[kind] = value;
        }
        applied.push(entry);
      }

      if (applied.length) {
        await tx.supplier.update({
          where: {id},
          data: {...fields, notes: [supplier.notes, hotelCrmNotes(applied, user.email || user.id || "Admin")].filter(Boolean).join("\n\n")},
        });
        if (contacts.length) await tx.supplierContact.createMany({data: contacts});
      }
      return applied.length;
    }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
    if (saved === null) return NextResponse.json({error: "Hotel supplier not found."}, {status: 404});
    return NextResponse.json({saved});
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({error: "The supplier changed during review. Refresh and review the draft again."}, {status: 409});
    }
    console.error("HOTEL_CRM_ENRICHMENT_FAILED", error);
    return NextResponse.json({error: "Could not save the hotel CRM details."}, {status: 500});
  }
}
