import type { Bootstrap, Point } from './types';
import { extractSpokenRoute, voiceStationKey, STATION_SPEECH_SPELLINGS, type VoiceLanguage } from './voiceInput';

const key = voiceStationKey;
export type SpeechContext = { hints: {name:string}[]; known: Set<string> };

/** Recognition vocabulary, derived exclusively from the existing transport data. */
export function buildSpeechContext(data:Bootstrap|null|undefined, current:readonly (Point|null)[]=[],language:VoiceLanguage='en-IN'):SpeechContext {
  const frequent=new Map<string,number>();
  for(const route of data?.busRoutes||[]){for(const stop of new Set([route.from,route.to,...route.stops])){
    if(stop)frequent.set(stop,(frequent.get(stop)||0)+1);
  }}
  const metro=(data?.metroLines||[]).flatMap(line=>line.stations);
  const popular=(data?.places||[]).map(place=>place.name);
  const buses=[...frequent].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name])=>name);
  const scripts=language==='en-IN'?[]:STATION_SPEECH_SPELLINGS.filter(([name])=>metro.some(station=>key(station)===key(name))).map(([,spelling])=>spelling);
  const names=[...current.filter((point):point is Point=>!!point).map(point=>point.name),...popular,...metro,...scripts,...buses];
  const known=new Set(names.map(key).filter(Boolean));
  // The OS recommends a compact bias list. Include both the spoken base name and
  // its full label, with selected endpoints first and all metro stations next.
  const hints=new Map<string,string>();
  for(const name of names){for(const candidate of [name,name.replace(/\s*\([^)]*\)|\s+(?:metro station|bus stop|bus terminal|interchange)$/gi,'').trim()]){
    if(candidate&&hints.size<100&&!hints.has(candidate.toLowerCase()))hints.set(candidate.toLowerCase(),candidate);
  }}
  return {hints:[...hints.values()].map(name=>({name})),known};
}

type Alternative={transcript:string;confidence?:number};
export function chooseSpeechTranscript(alternatives:readonly Alternative[],context:SpeechContext):{text:string;review:boolean} {
  const choices=alternatives.filter(item=>typeof item.transcript==='string'&&item.transcript.trim()).slice(0,3);
  if(!choices.length)return {text:'',review:false};
  const top=choices[0],route=extractSpokenRoute(top.transcript);
  const low=(confidence?:number)=>typeof confidence==='number'&&confidence>0&&confidence<.45;
  if(!route)return {text:top.transcript,review:low(top.confidence)};
  const origin=key(route.origin),destination=key(route.destination);
  if(context.known.has(origin)&&context.known.has(destination))return {text:top.transcript,review:low(top.confidence)};
  const candidates=choices.slice(1).filter(alternative=>{
    const other=extractSpokenRoute(alternative.transcript);
    if(!other||!context.known.has(key(other.origin))||!context.known.has(key(other.destination)))return false;
    const confidence=alternative.confidence;
    if(typeof confidence!=='number'||confidence<.65||confidence<(top.confidence||0)-.12)return false;
    // An unchanged, known endpoint anchors the correction. Never guess an
    // entirely different trip just because it happens to contain known stations.
    return context.known.has(origin)&&key(other.origin)===origin||context.known.has(destination)&&key(other.destination)===destination;
  });
  const unique=new Map(candidates.map(item=>{const pair=extractSpokenRoute(item.transcript)!;return [key(pair.origin)+'→'+key(pair.destination),item]}));
  if(unique.size===1)return {text:[...unique.values()][0].transcript,review:false};
  return {text:top.transcript,review:unique.size>1||low(top.confidence)};
}
