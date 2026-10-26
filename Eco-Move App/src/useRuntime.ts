import {useCallback,useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import {hydrateStorage,persistStorage} from './platform/storage';
import {nativeHttp,abortHttp} from './platform/http';
import type {MapHandle} from './platform/RuntimeMap';
import type {Auth,Rpc,Bootstrap} from './types';
export function useRuntime(onMapEvent:(name:string,value:any)=>void){
  const mapRef=useRef<MapHandle>(null);const counter=useRef(0);const pending=useRef(new Map<string,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>());
  const [ready,setReady]=useState(false);const [auth,setAuth]=useState<Auth>({user:null,profile:null,loading:true,isDemoUser:false});const [data,setData]=useState<Bootstrap>();const [runtimeError,setRuntimeError]=useState('');
  const eventRef=useRef(onMapEvent);eventRef.current=onMapEvent;
  const available=useRef(false);const epoch=useRef(0);
  const rejectPending=useCallback((message:string)=>{for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error(message))}pending.current.clear()},[]);
  useEffect(()=>()=>{available.current=false;epoch.current++;rejectPending('The map session closed. Please reopen the app.')},[rejectPending]);
  const rpc:Rpc=useCallback((method,args={})=>new Promise((resolve,reject)=>{
    if(!available.current||!mapRef.current){reject(Error('The map is still starting. Please try again when it is ready.'));return;}
    const id=`rpc-${++counter.current}`;const timer=setTimeout(()=>{pending.current.delete(id);reject(new Error('This action took too long. Please try again.'))},45000);
    pending.current.set(id,{resolve,reject,timer});mapRef.current?.send({type:'rpc',id,method,args});
  }),[]);
  const onMessage=useCallback(async(m:any)=>{
    try {
    if(m.type==='boot'){const boot=++epoch.current;available.current=false;setReady(false);setRuntimeError('');rejectPending('The map restarted. Please repeat your last action.');const storage=Platform.OS==='web'?{}:await hydrateStorage();if(boot===epoch.current)mapRef.current?.send({type:'init',storage})}
    else if(m.type==='ready'){available.current=true;setReady(true);setRuntimeError('');rpc<Bootstrap>('bootstrap').then(setData).catch(e=>setRuntimeError(e.message))}
    else if(m.type==='auth')setAuth(m);
    else if(m.type==='storage')persistStorage(m.key,m.value).catch(e=>setRuntimeError('Session could not be saved. '+e.message));
    else if(m.type==='result'){const p=pending.current.get(m.id);if(!p)return;clearTimeout(p.timer);pending.current.delete(m.id);if(m.error)p.reject(Error(m.error));else p.resolve(m.value)}
    else if(m.type==='http'){const requestEpoch=epoch.current;const result=await nativeHttp(m);if(requestEpoch===epoch.current)mapRef.current?.send(result)}
    else if(m.type==='httpAbort')abortHttp(m.id);
    else if(m.type==='mapEvent')eventRef.current(m.name,m.value);
    else if(m.type==='runtimeError'){available.current=false;setReady(false);setRuntimeError(m.message);rejectPending(m.message)}
    }catch(e:any){available.current=false;setReady(false);setRuntimeError(e?.message||'The map could not initialize. Please retry.');rejectPending('The map could not initialize. Please retry.')}
  },[rpc,rejectPending]);
  const retryRuntime=useCallback(()=>{available.current=false;epoch.current++;setReady(false);setRuntimeError('');rejectPending('The map is restarting. Please repeat your last action.');mapRef.current?.reload()},[rejectPending]);
  return {mapRef,rpc,onMessage,ready,auth,data,runtimeError,retryRuntime};
}
