import { describe, expect, it, vi } from "vitest";

const memory=vi.hoisted(()=>({pending:new Set<string>(), recorded:new Set<string>()}));
vi.mock("@/lib/db",()=>({db:{$transaction:async (fn:(tx:any)=>Promise<any>)=>fn({
  epochEmailOutbox:{findFirst:async()=>null},
  epochSupplierWebhookInbox:{createMany:async({data}:any)=>{
    const id=data[0].id;
    if(memory.pending.has(id))return {count:0};
    memory.pending.add(id);return {count:1};
  }},
  epochSupplierDeliveryEvent:{createMany:async()=>{throw Error("Unexpected matched write");}}
})}}));
vi.mock("@/lib/epoch-ai/resendSupplierWebhook",()=>({
  verifyResendSupplierSignature:()=>true,
  parseResendSupplierEvent:(_raw:string,id:string)=>({
    eventId:id,providerMessageId:"msg_early_test",type:"email.delivered",occurredAt:new Date("2026-11-21T12:00:00Z")
  })
}));
import { POST } from "./route";
describe("Signed supplier webhook early-delivery persistence",()=>{
  it("stores an unmatched event once for later correlation",async()=>{
    vi.stubEnv("RESEND_WEBHOOK_SECRET","whsec_testing_only");
    try {
      for(let i=0;i<2;i++){
        const response=await POST(new Request("http://localhost/api/webhooks/resend/hotel-supplier",{
          method:"POST",headers:{"svix-id":"evt_pending_001"},body:"{}"
        }));
        expect(response.status).toBe(200);
        expect((await response.json()).result).toBe("pending");
      }
      expect(memory.pending.size).toBe(1);
    }finally{vi.unstubAllEnvs();memory.pending.clear();}
  });
});
