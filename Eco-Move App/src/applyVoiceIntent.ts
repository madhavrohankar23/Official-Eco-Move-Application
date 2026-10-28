import type {Panel,Point,Preference,Rpc,Tab} from './types';
import type {VoiceIntent} from './voiceTypes';
import {normalizeSpokenPlace,selectVoicePlace} from './voiceInput';
type VoiceActions={rpc:Rpc;origin:Point|null;preference:Preference;departure:string;
  setOrigin:(p:Point)=>void;setDestination:(p:Point)=>void;setAnchor:(p:Point)=>void;setRadius:(n:number)=>void;
  setBusQuery:(s:string)=>void;setTimetableQuery:(q:{busNumber?:string|null;fromStop?:string|null})=>void;
  setNotice:(s:string)=>void;navigate:(tab:Tab)=>void;open:(panel:Panel)=>void;
  plan:(o:Point,d:Point,p:Preference,t:string)=>Promise<void>};
/** Route voice commands through the existing screen handlers and routing engine. */
export async function applyVoiceIntent(intent:VoiceIntent,app:VoiceActions,isCurrent=()=>true){
  const resolve=async(name?:string|null)=>{
    if(!name?.trim())return null;
    const query=normalizeSpokenPlace(name);
    const local=await app.rpc<Point[]>('voicePlaces',{query});
    if(!isCurrent())return null;
    if(local.length)return selectVoicePlace(query,local);
    // Existing online service handles names outside the curated local aliases.
    const online=await app.rpc<Point[]>('searchOnline',{query});
    // Do not silently pick an ambiguous online address.
    return online.length===1?online[0]:null;
  };
  if(!isCurrent())return;
  if(intent.intent==='PLAN_ROUTE'){
    const from=!intent.origin||/^(your|my|current) location$/i.test(intent.origin)?app.origin:await resolve(intent.origin);
    const to=await resolve(intent.destination);
    if(!isCurrent())return;
    if(!to){
      app.setNotice(intent.destination ? `I could not identify destination “${intent.destination}” reliably. Please choose a destination in the route planner.` : 'Please choose a destination in the route planner.');
      app.navigate('plan');
      return;
    }
    if(!from&&intent.origin&&!/^(your|my|current) location$/i.test(intent.origin)){
      app.navigate('plan');app.setNotice(`I could not identify Source “${intent.origin}” reliably. Please select it in the route planner. Your previous trip was kept.`);return;
    }
    app.setDestination(to);if(from)app.setOrigin(from);
    app.navigate('plan');
    const isSpokenPair = Boolean(intent.origin && !/^(your|my|current) location$/i.test(intent.origin));
    if(isSpokenPair){
      app.setNotice(`Route set from ${from?.name || intent.origin} to ${to.name}. Review and confirm to find routes.`);
    }else if(from){
      await app.plan(from,to,intent.preference||app.preference,intent.departureTime||app.departure);
    }else{
      app.setNotice('Choose a Source or use current location to complete these directions.');
    }
  }else if(intent.intent==='FIND_NEARBY'){
    const place=await resolve(intent.nearbyLocation);if(!isCurrent())return;
    if(place||app.origin)app.setAnchor(place||app.origin!);
    if(intent.nearbyRadiusM)app.setRadius(intent.nearbyRadiusM);
    app.navigate('nearby');
  }else if(intent.intent==='TRACK_BUS'){
    app.setBusQuery(intent.busNumber||'');app.open('live');
  }else if(intent.intent==='VIEW_TIMETABLE'){
    app.setTimetableQuery({busNumber:intent.busNumber,fromStop:intent.stopName});app.open('timetable');
  }
}
