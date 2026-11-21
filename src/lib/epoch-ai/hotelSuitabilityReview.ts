/** Non-authoritative screening: no public-site or booking claims are synthesized here. */
export type SuitabilityInput = {
  roomsRequested:number;
  massRoomRequired:boolean;
  totalRooms?:number|null;
  marked:Record<string,boolean>;
  hasPublicFacilitiesSource:boolean;
};
export type SuitabilityItem={id:string;label:string;marked:boolean;note?:string};
export function buildSuitabilityReview(input:SuitabilityInput){
  const items:SuitabilityItem[]=[];
  const add=(id:string,label:string,note?:string)=>items.push({id,label,marked:input.marked[id]===true,note});
  add("4-star standard verified","4-star classification","Confirm applicable official classification and source");
  add("Walk-in showers and lifts confirmed","Walk-in showers and lifts","Confirm sufficient suitable room types for seniors");
  add("Coach access and parking confirmed","Full-size coach access","Confirm safe drop-off and driver parking arrangements");
  add("Porterage confirmed","Porterage","Confirm availability and charge per bag");
  add("20 rooms / allotment confirmed",`${input.roomsRequested} rooms for the exact dates`,"Only written hotel allotment confirmation closes this question");
  add("Group dinners and beverages confirmed","Group dinner and beverage arrangements","Confirm menu, timing, inclusions and price");
  if(input.massRoomRequired)add("Private Mass room confirmed where required","Private Mass room","Confirm permission, space and available time");
  const questions:string[]=[];
  if(!input.marked["20 rooms / allotment confirmed"])questions.push(`Can the hotel hold ${input.roomsRequested} rooms for our exact stay dates, with double/twin and single-room availability?`);
  if(!input.marked["Walk-in showers and lifts confirmed"])questions.push("How many rooms have walk-in showers and step-free lift access? Are accessible rooms available?");
  if(!input.marked["Coach access and parking confirmed"])questions.push("Can a full-size coach reach the entrance for group loading, and where may it park?");
  if(!input.marked["Group dinners and beverages confirmed"])questions.push("Can the hotel serve a group dinner, and what beverage package, timing and price apply?");
  if(input.massRoomRequired&&!input.marked["Private Mass room confirmed where required"])questions.push("Could a quiet private space be provided for our priest to celebrate Mass?");
  if(!input.marked["Porterage confirmed"])questions.push("Is luggage porterage provided for the group, and at what cost?");
  if(!input.marked["4-star standard verified"])questions.push("What is the hotel's current official classification and supporting source?");
  if(typeof input.totalRooms==='number'&&input.totalRooms>0){
    questions.push(`The public room count is ${input.totalRooms}; please confirm whether ${input.roomsRequested} rooms can actually be allotted. A published total is not availability.`);
  } else questions.push("What is the property's current room inventory? This does not prove a group allotment.");
  if(!input.hasPublicFacilitiesSource)questions.push("Provide the current official facilities page to support public amenity claims.");
  return {items,questions,openCount:items.filter(i=>!i.marked).length,totalCount:items.length};
}
