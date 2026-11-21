/** Public-source discovery is advisory only, not evidence of confirmed hotel terms. */
export type WebHotelResult = { title:string; url:string; description:string };
export type SearchLink = {label:string;url:string};
const clean = (value:unknown,max=250):string => typeof value==="string"?value.replace(/[\r\n\t]+/g," ").trim().slice(0,max):"";
export function validHotelResearchLocation(city:unknown,country:unknown):boolean {
  return typeof city==="string" && typeof country==="string" &&
    city.trim().length>=2 && city.trim().length<=90 && country.trim().length>=2 && country.trim().length<=90 &&
    !/[<>\r\n]/.test(city+country);
}
export function safePublicUrl(value:unknown):string {
  try { const url=new URL(String(value));
    if(url.protocol!=="https:" || url.username || url.password || url.port ||
      /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(url.hostname) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || !url.hostname.includes("."))return "";
    return url.href;
  } catch{return "";}
}
export function webHotelSearchLinks(city:string,country:string):SearchLink[] {
  const location=`${city}, ${country}`;
  const queries=[
    {label:"Find 4-star group hotels",query:`4 star hotels ${location} group accommodation`},
    {label:"Find official hotel websites and contacts",query:`hotels ${location} official website reservations contact`},
    {label:"Check accessibility and coach parking",query:`hotels ${location} wheelchair accessible coach parking`}
  ];
  return queries.map(({label,query})=>({label,url:`https://www.google.com/search?q=${encodeURIComponent(query)}`}));
}
export function mapBraveHotelResults(payload:unknown):WebHotelResult[] {
  if(!payload || typeof payload!=="object")return [];
  const web=(payload as {web?:{results?:unknown}}).web;
  if(!Array.isArray(web?.results))return [];
  const output:WebHotelResult[]=[];const seen=new Set<string>();
  for(const item of web.results.slice(0,12)){
    if(!item || typeof item!=="object")continue;
    const result=item as Record<string,unknown>;
    const url=safePublicUrl(result.url),title=clean(result.title,180);
    if(!url || !title || seen.has(url))continue;
    seen.add(url);output.push({title,url,description:clean(result.description,500)});
  }
  return output;
}
