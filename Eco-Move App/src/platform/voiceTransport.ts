import type {VoiceIntent} from '../voiceTypes';
import {extractSpokenRoute,normalizeSpokenPlace} from '../voiceInput';
export function createVoiceService({endpoint,extractDatasetInfoForQuery,extractCleanAiText,parseLocalHeuristicQuery}:{endpoint:string;extractDatasetInfoForQuery:(query:string)=>unknown;extractCleanAiText:(data:unknown)=>string;parseLocalHeuristicQuery:(query:string,location:string)=>VoiceIntent}){
const pending=new Map<string,AbortController>();
function cancelVoice(id:string){pending.get(id)?.abort();pending.delete(id);return true}
async function voiceCommand(args:{id:string;query:string;location?:string}):Promise<VoiceIntent>{
  if(typeof args.id!=='string'||!/^[-\w]{1,128}$/.test(args.id))throw Error('Invalid voice request. Please retry.');
  const query=typeof args.query==='string'?args.query.trim():'';if(!query||query.length>2000)throw Error('Please ask a transit question under 2,000 characters.');
  if(!endpoint)throw Error('The voice service is not configured.');
  cancelVoice(args.id);const controller=new AbortController();pending.set(args.id,controller);
  const local=parseLocalHeuristicQuery(query,args.location||'Your location');
  const spokenRoute=extractSpokenRoute(query);
  const verified=extractDatasetInfoForQuery(query);
  const payload={action:'PARSE_NATURAL_LANGUAGE_COMMAND',query,userLocation:args.location||'Your location',fallbackIntent:local.intent,...(verified?{verifiedDatasetInfo:verified}:{})};
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},25000);
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    if(!response.ok)throw Error(`Voice service is unavailable (HTTP ${response.status}). Please retry.`);
    const data:unknown=await response.json();if(controller.signal.aborted)throw Error('Voice request cancelled.');const value=Array.isArray(data)?data[0]:data;
    if(!value||typeof value!=='object')throw Error('The voice service returned an unreadable response.');
    const obj=value as Record<string,unknown>;
    if(obj.status==='error')throw Error('The voice workflow could not complete this request. Please retry.');
    const intents=['PLAN_ROUTE','FIND_NEARBY','TRACK_BUS','VIEW_TIMETABLE','GENERAL_ANSWER'];
    if(typeof obj.intent!=='string'||!intents.includes(obj.intent))throw Error('The voice service returned an unsupported action.');
    const message=extractCleanAiText(value);if(!message||message.length>12000||message.startsWith('{'))throw Error('The voice service returned no readable answer.');
    const result:VoiceIntent={intent:obj.intent as VoiceIntent['intent'],message};
    for(const key of ['origin','destination','nearbyLocation','busNumber','stopName'] as const){const v=obj[key]??local[key];if(typeof v==='string')result[key]=v.slice(0,200)}
    // The workflow may return its current-location default even when a source
    // was spoken. Explicit endpoints always win over that default.
    if(spokenRoute){result.intent='PLAN_ROUTE';Object.assign(result,spokenRoute)}
    for(const key of ['origin','destination','nearbyLocation','stopName'] as const){if(result[key])result[key]=normalizeSpokenPlace(result[key]!)}
    const prefs=['balanced','fastest','cheapest','least_walk','fewest_transfers','low_co2'];
    if(typeof obj.preference==='string'&&prefs.includes(obj.preference))result.preference=obj.preference as VoiceIntent['preference'];
    if(typeof obj.departureTime==='string'&&/^(now|([01]?\d|2[0-3]):[0-5]\d)$/.test(obj.departureTime))result.departureTime=obj.departureTime;
    if(typeof obj.nearbyRadiusM==='number'&&Number.isFinite(obj.nearbyRadiusM))result.nearbyRadiusM=Math.min(10000,Math.max(250,obj.nearbyRadiusM));
    return result;
  }catch(error){if(controller.signal.aborted)throw Error(timedOut?'Voice service took too long. Please retry.':'Voice request cancelled.');if(error instanceof SyntaxError)throw Error('The voice service returned invalid JSON. Please retry.');throw error}
  finally{clearTimeout(timer);if(pending.get(args.id)===controller)pending.delete(args.id)}
}

return {voiceCommand,cancelVoice};
}

