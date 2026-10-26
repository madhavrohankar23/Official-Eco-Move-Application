import AsyncStorage from '@react-native-async-storage/async-storage';
import {N8N_CONFIG} from '../generated/serviceConfig';
const controllers=new Map<string,AbortController>();
export const DEFAULT_BACKEND='http://10.0.2.2:8099';
export const getBackend=async()=>await AsyncStorage.getItem('eco.backend')||DEFAULT_BACKEND;
export const setBackend=(value:string)=>AsyncStorage.setItem('eco.backend',value.replace(/\/$/,''));
export function abortHttp(id:string){controllers.get(id)?.abort();controllers.delete(id);}
export async function nativeHttp(message:any){
  const {id,options}=message;const relative=message.url.startsWith('/api/');
  try{
  const url=relative?(await getBackend())+message.url:message.url;
  const parsed=new URL(url);
  const allowed=['chalo.com','m.uber.com','api.openrouteservice.org','routing.openstreetmap.de','router.project-osrm.org','nominatim.openstreetmap.org','photon.komoot.io','places.googleapis.com','maps.googleapis.com','tile.googleapis.com','rohit134.app.n8n.cloud'];
  const n8n=Object.values(N8N_CONFIG).some(endpoint=>endpoint===url);
  if(!relative&&!n8n&&!allowed.includes(parsed.hostname)&&!parsed.hostname.endsWith('.supabase.co'))throw Error('Unsupported service address');
  const controller=new AbortController();controllers.set(id,controller);
  const isWalkService=parsed.hostname.includes('openrouteservice')||parsed.hostname.includes('openstreetmap');
  const timer=setTimeout(()=>controller.abort(),n8n?30000:isWalkService?5000:20000);
  try{const response=await fetch(url,{...options,signal:controller.signal});return {type:'httpResult',id,status:response.status,headers:Object.fromEntries(response.headers.entries()),body:await response.text()};}
  catch(e:any){return {type:'httpResult',id,error:e?.message||'Network unavailable'};}
  finally{clearTimeout(timer);controllers.delete(id)}
  }catch(e:any){return {type:'httpResult',id,error:e?.message||'Invalid service address'};}
}
