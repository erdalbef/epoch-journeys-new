import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierStatus, SupplierType } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { canonicalHotelName,parseResearchRegistration } from "@/lib/epoch-ai/hotelResearchRegistration";
import { publishedHotelVerification } from "@/lib/epoch-ai/hotelPublicVerification";

export async function POST(request:Request) {
  const session=await getServerSession(authOptions);
  if (!session?.user || session.user.role!==Role.ADMIN) return NextResponse.json({error:"Admin access required."},{status:401});
  try {
    const input=parseResearchRegistration(await request.json());
    // Only reviewed profiles can be registered by this pilot. Never trust user-supplied evidence as verification.
    const approved=publishedHotelVerification(input.name);
    if (!approved || input.email.toLowerCase()!==approved.email.toLowerCase() || input.source!==approved.source || input.phone!==approved.phone || input.facilitiesSource!==approved.facilitiesSource || input.city.toLowerCase()!=="sarajevo") {
      return NextResponse.json({error:"Research lead or source differs from reviewed evidence. Verify before CRM registration."},{status:400});
    }
    const candidates=await db.supplier.findMany({where:{type:SupplierType.HOTEL,city:{equals:input.city,mode:"insensitive"}},select:{id:true,name:true}});
    const existing=candidates.find(x=>canonicalHotelName(x.name)===canonicalHotelName(input.name));
    if (existing) return NextResponse.json({supplierId:existing.id,alreadyExists:true});
    // This pilot adds only a prospective research record, not an approved or contacted supplier.
    const when=new Date().toISOString();
    const researchNote=["EPOCH RESEARCH CANDIDATE — NOT CONTACTED / NOT CONTRACTED",`Source reviewed: ${when}`,
      `Public contact evidence: ${input.source}`,`Facilities evidence: ${input.facilitiesSource}`,
      `Tour inquiry reference: ${input.hotelStay.checkIn} to ${input.hotelStay.checkOut}; ${input.hotelStay.rooms} rooms requested (not confirmed)`,
      `Pending hotel verification: ${approved.openQuestions.join("; ")}`,
      `Added by authorized admin: ${session.user.email || "unknown"}`].join("\n");
    const supplier=await db.supplier.create({data:{name:input.name,type:SupplierType.HOTEL,status:SupplierStatus.INACTIVE,country:"Bosnia and Herzegovina",city:input.city,email:input.email,phone:input.phone,notes:researchNote,preferred:false}});
    return NextResponse.json({supplierId:supplier.id,alreadyExists:false},{status:201});
  } catch(err) {
    if (err instanceof Error && /Invalid|required|HTTPS/.test(err.message)) return NextResponse.json({error:err.message},{status:400});
    console.error("HOTEL_RESEARCH_REGISTER_FAILED",err);
    return NextResponse.json({error:"Could not register research lead. No inquiry was sent."},{status:500});
  }
}
