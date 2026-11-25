import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierStatus, SupplierType } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { canonicalHotelName,parseResearchRegistration } from "@/lib/epoch-ai/hotelResearchRegistration";
import { publishedHotelVerification } from "@/lib/epoch-ai/hotelPublicVerification";

export async function POST(request:Request) {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin || requestOrigin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  }

  const denied=await requireAdminApiAccess();if(denied)return denied;
  const session=await getServerSession(authOptions);
  if (!session?.user || session.user.role!==Role.ADMIN) return NextResponse.json({error:"Admin access required."},{status:401});
  try {
    const input=parseResearchRegistration(await request.json());
    // A static Sarajevo research profile or a documented, explicitly verified Admin entry.
    // User-provided links are provenance, NOT evidence that we independently checked the website.
    const approved=publishedHotelVerification(input.name);
    const sarajevoVerified=Boolean(approved && input.city.toLowerCase()==="sarajevo" &&
      input.country.toLowerCase()==="bosnia and herzegovina" &&
      input.email.toLowerCase()===approved.email.toLowerCase() &&
      input.source===approved.source && input.facilitiesSource===approved.facilitiesSource && input.phone===approved.phone);
    const manualVerified=input.adminVerification?.confirmation==="REGISTER VERIFIED RESEARCH LEAD" &&
      input.adminVerification.contactChecked===true &&
      (!input.facilitiesSource || input.adminVerification.facilitiesChecked===true);
    if (!sarajevoVerified && !manualVerified) {
      return NextResponse.json({error:"Confirm the contact source and review any facilities source provided before CRM registration."},{status:400});
    }
    const matchKey=`hotel-research:${canonicalHotelName(input.country)}:${canonicalHotelName(input.city)}:${canonicalHotelName(input.name)}`;
    const result=await db.$transaction(async tx=>{
      // Serializes concurrent registration of the same city/property without changing the schema.
      const locks=await tx.$queryRaw<{locked:boolean}[]>`SELECT pg_try_advisory_xact_lock(hashtext(${matchKey})) AS locked`;
      if (!locks[0]?.locked) throw new Error("Hotel registration already in progress; retry after reviewing CRM.");
      const candidates=await tx.supplier.findMany({where:{type:SupplierType.HOTEL,city:{equals:input.city,mode:"insensitive"}},select:{id:true,name:true,country:true}});
      const existing=candidates.find(x=>canonicalHotelName(x.name)===canonicalHotelName(input.name) &&
        canonicalHotelName(x.country||"")===canonicalHotelName(input.country));
      if (existing) return {supplierId:existing.id,alreadyExists:true};
      const when=new Date().toISOString();
      const researchNote=["EPOCH RESEARCH CANDIDATE - NOT CONTACTED / NOT CONTRACTED",
        `Recorded at: ${when}`,`Evidence method: ${sarajevoVerified?"Reviewed Sarajevo static profile":"Admin-attested website review (not independently verified by Epoch AI)"}`,
        `Public contact evidence: ${input.source}`,
        input.facilitiesSource ? `Facilities evidence: ${input.facilitiesSource}` : "Facilities evidence: pending hotel follow-up",
        `Hotel stay context: ${input.hotelStay.checkIn} to ${input.hotelStay.checkOut}; ${input.hotelStay.rooms} rooms REQUESTED, NOT CONFIRMED`,
        "Still to confirm directly: group room availability and rates, shower access, lifts, coach access, porterage, dinner, cancellation and payment terms",
        `Registered by Admin: ${session.user.email || session.user.id || "unknown"}`].join("\n");
      const supplier=await tx.supplier.create({data:{name:input.name,type:SupplierType.HOTEL,status:SupplierStatus.INACTIVE,
        country:input.country,city:input.city,email:input.email,phone:input.phone,notes:researchNote,preferred:false}});
      return {supplierId:supplier.id,alreadyExists:false};
    });
    return NextResponse.json(result,{status:result.alreadyExists?200:201});
  } catch(err) {
    if (err instanceof Error && /Invalid|required|HTTPS/.test(err.message)) return NextResponse.json({error:err.message},{status:400});
    console.error("HOTEL_RESEARCH_REGISTER_FAILED",err);
    return NextResponse.json({error:"Could not register research lead. No inquiry was sent."},{status:500});
  }
}
