import Link from "next/link";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const str = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";
const opt = (v: FormDataEntryValue | null) => str(v) || null;
const lines = (v: FormDataEntryValue | null) => str(v).split("\n").map(x => x.trim()).filter(Boolean);
const join = (v: string[] | null | undefined) => (v || []).join("\n");

export default async function PackagePage({ params, searchParams }: { params: Promise<{id:string}>, searchParams: Promise<{notice?:string}> }) {
 const {id} = await params; const {notice} = await searchParams;
 const tour = await db.tour.findUnique({where:{id}}); if(!tour) notFound();
 const ready = [
  ["Tour title", Boolean(tour.title.trim())], ["Duration", tour.duration > 0],
  ["Day-by-day itinerary", Boolean(tour.itinerary?.trim())],
  ["Agent introduction", Boolean(tour.shortDescription?.trim())],
  ["Highlights", tour.highlights.length > 0],
  ["Inclusions", tour.inclusions.length > 0], ["Exclusions", tour.exclusions.length > 0],
  ["Main image", Boolean(tour.mainImageUrl)],
 ] as const;
 const missing = ready.filter(([,ok]) => !ok).map(([name]) => name);
 async function save(formData: FormData) {
  "use server";
  await db.tour.update({where:{id}, data:{
   subtitle: opt(formData.get("subtitle")), shortDescription: opt(formData.get("shortDescription")),
   tourIntroduction: opt(formData.get("tourIntroduction")), tourSignificance: opt(formData.get("tourSignificance")),
   whyWeOfferThisTour: opt(formData.get("whyWeOfferThisTour")),
   highlights: lines(formData.get("highlights")), idealFor: lines(formData.get("idealFor")),
   agentSellingPoints: lines(formData.get("agentSellingPoints")),
   inclusions: lines(formData.get("inclusions")), exclusions: lines(formData.get("exclusions")),
   mainImageUrl: opt(formData.get("mainImageUrl")), imageUrl2: opt(formData.get("imageUrl2")),
   imageUrl3: opt(formData.get("imageUrl3")), imageUrl4: opt(formData.get("imageUrl4")),
   mapImageUrl: opt(formData.get("mapImageUrl")), brochureUrl: opt(formData.get("brochureUrl")),
   featured: formData.get("featured") === "on",
  }});
  revalidatePath(`/admin/tour-packages/${id}`); revalidatePath('/admin/tour-packages');
  redirect(`/admin/tour-packages/${id}?notice=saved`);
 }
 async function publish(formData: FormData) {
  "use server";
  const desired = formData.get("publish") === "yes";
  const latest = await db.tour.findUnique({where:{id}}); if(!latest) notFound();
  if(desired && (!latest.title.trim() || latest.duration <= 0 || !latest.itinerary?.trim() || !latest.shortDescription?.trim() || latest.highlights.length === 0 || latest.inclusions.length === 0 || latest.exclusions.length === 0 || !latest.mainImageUrl)) {
   redirect(`/admin/tour-packages/${id}?notice=incomplete`);
  }
  await db.tour.update({where:{id},data:{isPublished:desired,requiresQuote:true,pricingType:"GROUP_BASED"}});
  revalidatePath(`/admin/tour-packages/${id}`); revalidatePath('/admin/tour-packages'); revalidatePath('/b2b/tours');
  redirect(`/admin/tour-packages/${id}?notice=${desired?'published':'unpublished'}`);
 }
 const field = (name:string,label:string,value:string|null|undefined,rows=3) => <label className="block text-sm font-semibold text-slate-700">{label}<textarea name={name} defaultValue={value || ''} rows={rows} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-normal text-slate-900" /></label>;
 const urlField = (name:string,label:string,value:string|null|undefined) => <label className="block text-sm font-semibold text-slate-700">{label}<input name={name} defaultValue={value || ''} placeholder="/uploads/... or https://..." className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>;
 return <main className="mx-auto max-w-5xl space-y-6 p-6">
  <div><Link href="/admin/tour-packages" className="text-sm text-[#8B0000]">← Tour Packages</Link><h1 className="mt-2 text-3xl font-bold text-[#001F3F]">{tour.title}</h1><p className="mt-1 text-sm text-slate-500">{tour.category} · {tour.duration} days · {tour.isPublished?'Published':'Draft'}</p><Link className="mt-2 inline-block text-sm underline" href={`/admin/tours/${id}/edit`}>Edit operational tour / AI itinerary</Link></div>
  {notice && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">{notice === 'saved'?'Package content saved.':notice === 'published'?'Package published to agents.':notice === 'unpublished'?'Package returned to draft.':'Publication blocked: complete the missing items below.'}</p>}
  {tour.isPublished && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">This package is live. Saving content here updates the agent-facing package immediately. Unpublish first if you want to prepare revisions privately.</p>}
  <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Publication checklist</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{ready.map(([label,ok])=><p key={label} className="text-sm">{ok?'✓':'○'} {label}</p>)}</div>{missing.length > 0 && <p className="mt-3 text-sm text-amber-700">Complete {missing.join(', ')} before publishing.</p>}</section>
  <form action={save} className="space-y-6 rounded-2xl border bg-white p-6">
   <h2 className="text-xl font-semibold">Agent presentation</h2>
   {field('subtitle','Subtitle',tour.subtitle,2)}{field('shortDescription','Short agent introduction',tour.shortDescription,3)}{field('tourIntroduction','Journey introduction',tour.tourIntroduction,5)}{field('tourSignificance','Spiritual significance',tour.tourSignificance,4)}{field('whyWeOfferThisTour','Why Epoch offers this tour',tour.whyWeOfferThisTour,4)}
   <p className="text-xs text-slate-500">For the following lists, enter one item per line.</p>
   {field('highlights','Highlights',join(tour.highlights),5)}{field('idealFor','Ideal for',join(tour.idealFor),3)}{field('agentSellingPoints','Agent selling points',join(tour.agentSellingPoints),5)}
   <h2 className="text-xl font-semibold">Package inclusions</h2>{field('inclusions','Inclusions',join(tour.inclusions),6)}{field('exclusions','Exclusions',join(tour.exclusions),5)}
   <h2 className="text-xl font-semibold">Images & brochure</h2><p className="text-sm text-slate-500">Use an existing uploaded media path or hosted URL. Leave a field empty to remove that reference. The Tour Edit screen retains the existing file-upload controls.</p>
   {urlField('mainImageUrl','Main image',tour.mainImageUrl)}{urlField('imageUrl2','Image 2',tour.imageUrl2)}{urlField('imageUrl3','Image 3',tour.imageUrl3)}{urlField('imageUrl4','Image 4',tour.imageUrl4)}{urlField('mapImageUrl','Map image',tour.mapImageUrl)}{urlField('brochureUrl','Brochure PDF',tour.brochureUrl)}
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={tour.featured}/> Featured journey</label>
   <button className="rounded-xl bg-[#001F3F] px-5 py-3 font-semibold text-white">Save Package Content</button>
  </form>
  <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">Review & publication</h2><p className="my-3 text-sm text-slate-600">Agents request official group quotations. This screen does not create or alter seasonal rates, confirmed bookings, or existing quotations.</p>
   <div className="flex flex-wrap gap-3"><form action={publish}><input type="hidden" name="publish" value="yes"/><button disabled={missing.length>0 || tour.isPublished} className="rounded-xl bg-[#8B0000] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Publish to Agent Dashboard</button></form><form action={publish}><input type="hidden" name="publish" value="no"/><button disabled={!tour.isPublished} className="rounded-xl border px-5 py-3 font-semibold disabled:opacity-40">Unpublish / Return to Draft</button></form></div>
  </section>
 </main>;
}
