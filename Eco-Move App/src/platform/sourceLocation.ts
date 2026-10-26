import type {Point} from '../types';
export const SOURCE_SHORTCUT_URL='ecomove://location/source';
export function isSourceShortcut(url:string){try{const u=new URL(url);return u.protocol==='ecomove:'&&u.host==='location'&&!u.username&&!u.password&&u.pathname==='/source'&&!u.search&&!u.hash}catch{return false}}
type Address={name?:string|null;streetNumber?:string|null;street?:string|null;district?:string|null;city?:string|null;region?:string|null};
type SourceLocationAdapter={permission:()=>Promise<{granted?:boolean;status?:string}>;position:()=>Promise<{coords:{latitude:number;longitude:number}}>;reverse?:(lat:number,lon:number)=>Promise<Address[]>};
export function bounded<T>(task:Promise<T>,ms:number,message:string):Promise<T>{let timer:ReturnType<typeof setTimeout>;return Promise.race([task,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms)})]).finally(()=>clearTimeout(timer))}
export async function readCurrentSource(adapter:SourceLocationAdapter,isCurrent=()=>true):Promise<Point>{
  const permission=await adapter.permission();
  if(!isCurrent())throw Error('Location request cancelled.');
  if(!permission.granted&&permission.status!=='granted')throw Error('Location permission is off. Allow it in device settings, or choose Source on the map.');
  const position=await bounded(adapter.position(),20000,'GPS took too long. Move to an open area and retry, or choose Source on the map.');
  if(!isCurrent())throw Error('Location request cancelled.');
  const {latitude:lat,longitude:lon}=position.coords;
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('GPS returned an invalid location. Please retry.');
  let name=`Your location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  if(adapter.reverse){try{const [address]=await bounded(adapter.reverse(lat,lon),3500,'Address lookup timed out.');
    if(address){const street=[address.streetNumber,address.street].filter(Boolean).join(' ');const parts=[street||address.name,address.district,address.city||address.region].filter((v):v is string=>!!v);const readable=[...new Set(parts)].join(', ');if(readable)name=readable}
  }catch{/* GPS coordinates remain usable when address resolution fails. */}}
  if(!isCurrent())throw Error('Location request cancelled.');
  return {lat,lon,name};
}
